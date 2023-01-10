const http = require('node:http');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');

class WebSocketServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.clients = new Set();
    this.port = options.port || 4000;
    this.GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    this.OPCODES = { text: 0x01, close: 0x08 };
    this._init();
  }

  parseFrame(buffer) {
    const firstByte = buffer.readUInt8(0);
    // get opcode from frame (last 4 bits, according to RFC spec)
    const opCode = firstByte & 0b00001111;

    if (opCode === this.OPCODES.close) {
      this.emit('close');
      return null;
    } else if (opCode !== this.OPCODES.text) {
      return;
    }

    const secondByte = buffer.readUInt8(1);
    let bufferByteOffset = 2;
     // parse payload length, last 7 bits of byte 2
    let payloadLength = secondByte & 0b01111111;

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

      return result.toString('utf-8');
    }

    return buffer.subarray(bufferByteOffset).toString('utf-8');
  }

  createFrame(payload) {
    const uint16Size = 65535;

    const payloadByteLength = Buffer.byteLength(payload);
    let payloadBytesOffset = 2;
    let payloadLength = payloadByteLength;

    // if payloadlength cannot fit into 2 bytes, use extended payload length (8 bits)
    if (payloadByteLength > uint16Size) {
      payloadBytesOffset += 8;
      payloadLength = 127;
    } else if (payloadByteLength > 125) {
      payloadBytesOffset += 2;
      payloadLength = 126;
    }

    const buffer = Buffer.alloc(payloadBytesOffset + payloadByteLength);

    // first byte
    // [FIN (1), RSV1 (0), RSV2 (0), RSV3 (0), Opode (0x01 - text frame)]
    buffer.writeUInt8(0b10000001, 0);
    // when smaller than 125, write actual size
    buffer[1] = payloadLength;

    // write 16 bit or 64 bit value as little endian to match with router firmware
    if (payloadLength === 126) {
      buffer.writeUInt16BE(payloadByteLength, 2);
    } else if (payloadByteLength === 127) {
      buffer.writeBigInt64BE(BigInt(payloadByteLength), 2);
    }

    buffer.write(payload, payloadBytesOffset);
    return buffer;
  }

  addEventListener(callback) {
    this._server.listen(this.port, callback);
  }

  _init() {
    if (this._server) throw new Error('Server already initialized');

    this._server = http.createServer((request, response) => {
      const UPGRADE_REQUIRED = 426;
      const body = http.STATUS_CODES[UPGRADE_REQUIRED];
      response.writeHead(UPGRADE_REQUIRED, {
        'Content-Type': 'text/plain',
        'Upgrade': 'WebSocket',
      });
      response.end(body);
    });

    this._server.on('upgrade', (request, socket) => {
      this.emit('headers', request);

      if (request.headers.upgrade !== 'websocket') {
        socket.end('HTTP/1.1 400 Bad Request');
        return;
      }

      const acceptKey = request.headers['sec-websocket-key'];
      const acceptValue = this._generateAcceptValue(acceptKey);

      const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptValue}`,
      ];

      this.clients.add(socket);
      socket.write(responseHeaders.concat('\r\n').join('\r\n'));

      socket.on('data', (buffer) =>
        console.log(`Received message: ${this.parseFrame(buffer)}`)
      );

      this.on('close', () => {
        this.clients.delete(socket);
        socket.destroy();
      });
    });
  }

  _generateAcceptValue(acceptKey) {
    return crypto
      .createHash('sha1')
      .update(acceptKey + this.GUID, 'binary')
      .digest('base64');
  }

  _unmask(payload, maskingKey) {
    const result = Buffer.alloc(payload.byteLength);

    for (let i = 0; i < payload.byteLength; ++i) {
      const j = i % 4;
      const maskingKeyByteShift = j === 3 ? 0 : (3 - j) << 3;
      const maskingKeyByte = (maskingKeyByteShift === 0 ? maskingKey : maskingKey >>> maskingKeyByteShift) & 0b11111111;
      const transformedByte = maskingKeyByte ^ payload.readUInt8(i);
      result.writeUInt8(transformedByte, i);
    }

    return result;
  }
}

module.exports = WebSocketServer;