/**
 * Websocket for 2 way internet communication
 */

import { topics } from "./declarations/topics";
import { GenericPacket } from "./dataHandling/packets/router/genericPacket";
import { PacketParser } from "./dataHandling/packetHandler";
import { UPGRADE_REQUIRED, UINT16_SIZE } from "./declarations/const";

import { EventBusClass } from "crownstone-core";

import * as http from "http";
import * as crypto from "crypto";
import { EventEmitter } from "events";
import { Buffer } from "buffer";
import { Socket } from "net";
import { Logger } from "./logger";

const LOG = Logger("websocket");

interface WebSocketOpcodes {
  text: number;
  close: number;
}

export class WebSocketServer extends EventEmitter {
  clients: Set<Socket> = new Set();
  eventBus: EventBusClass = new EventBusClass();
  port: number;
  guid: string = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  opCodes: WebSocketOpcodes = { text: 0x01, close: 0x08 };

  _server?: http.Server;

  constructor(port: number) {
    super();
    this.port = port || 8080;
    this._init();
  }

  parseFrame(buffer: Buffer): Buffer | undefined {
    const firstByte = buffer.readUInt8(0);
    // get opcode from frame (last 4 bits, according to RFC spec)
    const opCode = firstByte & 0xf;

    if (opCode === this.opCodes.close) {
      this.emit(topics.Close);
      return;
    } else if (opCode !== this.opCodes.text) {
      return;
    }

    const secondByte = buffer.readUInt8(1);
    let bufferByteOffset = 2;
    // parse payload length, last 7 bits of byte 2
    let payloadLength = secondByte & 0x7f;

    // if length 126, use 2 bytes length, 8 bytes if 127 (according to RFC spec)
    if (payloadLength === 126) {
      bufferByteOffset += 2;
    } else if (payloadLength === 127) {
      bufferByteOffset += 8;
    }

    // read the mask bit (bit 9)
    const isMasked = Boolean((secondByte >>> 7) & 0x1);

    if (isMasked) {
      const maskingKey = buffer.readUInt32BE(bufferByteOffset);
      bufferByteOffset += 4;
      // parse the payload data
      const payload = buffer.subarray(bufferByteOffset);
      // unmask data if masking key is provided
      const result = this._unmask(payload, maskingKey);

      return result;
    }

    return buffer.subarray(bufferByteOffset);
  }

  createFrame(payload: Buffer): Buffer {
    const payloadByteLength = Buffer.byteLength(payload);
    let payloadBytesOffset = 2;
    let payloadLength = payloadByteLength;

    // if payloadlength cannot fit into 2 bytes, use extended payload length (8 bits)
    if (payloadByteLength > UINT16_SIZE) {
      payloadBytesOffset += 8;
      payloadLength = 127;
    } else if (payloadByteLength > 125) {
      payloadBytesOffset += 2;
      payloadLength = 126;
    }

    const buffer = Buffer.alloc(payloadBytesOffset + payloadByteLength);

    // first byte
    // [FIN (1), RSV1 (0), RSV2 (0), RSV3 (0), Opode (0x01 - text frame)]
    buffer.writeUInt8(0x81, 0);
    // when smaller than 125, write actual size
    buffer[1] = payloadLength;

    // write 16 bit or 64 bit value as little endian to match with router firmware
    if (payloadLength === 126) {
      buffer.writeUInt16BE(payloadByteLength, 2);
    } else if (payloadByteLength === 127) {
      buffer.writeBigInt64BE(BigInt(payloadByteLength), 2);
    }

    // copy the entire payload into buffer, starting at payloadBytesOffset
    payload.copy(buffer, payloadBytesOffset);

    return buffer;
  }

  addConnectionListener(callback: () => void) {
    if (this._server) {
      this._server.listen(this.port, callback);
    }
  }

  addEventListener(topic: string, callback: (data: any) => void): () => void {
    return this.eventBus.on(topic, callback);
  }

  fireEvent(topic: string, data?: Buffer) {
    this.eventBus.emit(topic, data);
  }

  _init() {
    if (this._server) throw new Error("Server already initialized");

    this._server = http.createServer((_, response) => {
      const body = http.STATUS_CODES[UPGRADE_REQUIRED];
      response.writeHead(UPGRADE_REQUIRED, {
        "Content-Type": "text/plain",
        Upgrade: "WebSocket",
      });
      response.end(body);
    });

    this._server.on(
      topics.Upgrade,
      (response: http.IncomingMessage, socket: Socket) => {
        this.emit(topics.Headers, response);

        for (let client of this.clients.values()) {
          if (client.remoteAddress === socket.remoteAddress) {
            LOG.warn(
              "Refusing connection to client on address %d, already connected",
              socket.remoteAddress
            );
            return;
          }
        }

        if (response.headers.upgrade !== "websocket") {
          socket.end("HTTP/1.1 400 Bad Request");
          return;
        }

        const acceptKey = response.headers["sec-websocket-key"];
        if (!acceptKey) {
          socket.end("HTTP/1.1 400 Bad Request");
          return;
        }
        const acceptValue = this._generateAcceptValue(acceptKey);

        const responseHeaders = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${acceptValue}`,
        ];

        this.clients.add(socket);
        socket.write(responseHeaders.concat("\r\n").join("\r\n"));

        socket.on(topics.RawData, (buffer: Buffer) => {
          // parse websocket frame
          const payload = this.parseFrame(buffer);
          if (payload) {
            const generalPacket = new GenericPacket(payload);
            // parse the packet, emit events on the event bus
            PacketParser.parse(generalPacket, this.eventBus);
          }
        });

        this.eventBus.on(topics.WriteData, (data: Buffer) =>
          socket.write(this.createFrame(data))
        );

        this.on(topics.Close, () => {
          this.clients.delete(socket);
          socket.destroy();
        });
      }
    );
  }

  _generateAcceptValue(acceptKey: string): string {
    return crypto
      .createHash("sha1")
      .update(acceptKey + this.guid, "binary")
      .digest("base64");
  }

  _unmask(payload: Buffer, maskingKey: number): Buffer {
    const result = Buffer.alloc(payload.byteLength);

    for (let i = 0; i < payload.byteLength; ++i) {
      const j = i % 4;
      const maskingKeyByteShift = j === 3 ? 0 : (3 - j) << 3;
      const maskingKeyByte =
        (maskingKeyByteShift === 0
          ? maskingKey
          : maskingKey >>> maskingKeyByteShift) & 0xff;
      const transformedByte = maskingKeyByte ^ payload.readUInt8(i);
      result.writeUInt8(transformedByte, i);
    }

    return result;
  }
}
