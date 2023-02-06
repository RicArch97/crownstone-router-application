/**
 * Definition for a Crownstone result packet
 */

import { Buffer } from "buffer";

export class CrownstoneResultPacket {
  protocol!: number;
  commandType!: number;
  resultCode!: number;
  payloadLength!: number;
  payload!: Buffer;

  valid: boolean = false;

  constructor(payload: Buffer) {
    this.load(payload);
  }

  load(data: Buffer) {
    this.valid = true;

    this.protocol = data.readUInt8(0);
    let byteOffset = 1;
    // byte should be provided as little endian
    this.commandType = data.readUint16LE(byteOffset);
    byteOffset += 2;
    this.resultCode = data.readUint16LE(byteOffset);
    byteOffset += 2;
    this.payloadLength = data.readUint16LE(byteOffset);
    byteOffset += 2;

    if (data.byteLength < byteOffset + this.payloadLength) {
      this.valid = false;
    }

    // get payload according to the provided message length
    this.payload = data.subarray(byteOffset, byteOffset + this.payloadLength);
  }
}