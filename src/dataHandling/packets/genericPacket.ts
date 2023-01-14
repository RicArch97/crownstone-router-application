/**
 * Generic packet definition in the Crownstone router protocol
 */

import { Buffer } from "buffer";
import { PROTOCOL_VERSION } from "../../declarations/const";

export class GenericPacket {
  protocolVersion!: number;
  payloadType!: number;
  payloadLength!: number;
  payload!: Buffer;

  valid: boolean = false;

  constructor(payload: Buffer) {
    this.load(payload);
  }

  load(data: Buffer) {
    this.valid = true;

    this.protocolVersion = data.readUInt8(0);
    this.payloadType = data.readUint8(1);
    let byteOffset = 2;
    // bytes should be provided as little endian
    this.payloadLength = data.readUInt16LE(byteOffset);
    byteOffset += 2;

    if (data.length < byteOffset + this.payloadLength) {
      this.valid = false;
    }

    // get payload according to the provided message length
    this.payload = data.subarray(byteOffset, byteOffset + this.payloadLength);
  }
}

export class GenericPacketWrapper {
  static wrap(payloadType: number, payload: Buffer): Buffer {
    const data = Buffer.alloc(4 + payload.byteLength);

    data.writeUInt8(PROTOCOL_VERSION, 0);
    data.writeUint8(payloadType, 1);
    let byteOffset = 2;
    // write little endian, firmware also expects this
    data.writeUInt16LE(payload.byteLength, byteOffset);
    byteOffset += 2;

    // copy all bytes from payload into data, starting at byteOffset
    payload.copy(data, byteOffset);

    return data;
  }
}
