/**
 * Data packet definition in the Crownstone router protocol
 */

import { Buffer } from "buffer";

export class DataPacket {
  sourceId!: number;
  payloadLength!: number;
  payload!: Buffer;

  valid: boolean = false;

  constructor(payload: Buffer) {
    this.load(payload);
  }

  load(data: Buffer) {
    this.valid = true;

    this.sourceId = data.readUint8(0);
    let byteOffset = 1;
    // bytes should be provided as little endian
    this.payloadLength = data.readUInt16LE(byteOffset);
    byteOffset += 2;

    if (data.byteLength < byteOffset + this.payloadLength) {
      this.valid = false;
    }

    // get payload according to the provided message length
    this.payload = data.subarray(byteOffset, byteOffset + this.payloadLength);
  }
}
