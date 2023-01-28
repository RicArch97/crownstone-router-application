/**
 * Result packet definition in the Crownstone router protocol
 */

import { Buffer } from "buffer";

export class ResultPacket {
  commandType!: number;
  resultCode!: number;
  resultId!: number;
  payloadLength!: number;
  payload!: Buffer;

  valid: boolean = false;

  constructor(payload: Buffer) {
    this.load(payload);
  }

  load(data: Buffer) {
    this.valid = true;

    this.commandType = data.readUint8(0);
    this.resultCode = data.readUint8(1);
    let byteOffset = 2;
    // bytes should be provided as little endian
    this.resultId = data.readUInt16LE(byteOffset);
    byteOffset += 2;
    this.payloadLength = data.readUInt16LE(byteOffset);
    byteOffset += 2;

    console.log("Result length: %d, calculated: %d", data.byteLength, byteOffset + this.payloadLength);

    if (data.byteLength < byteOffset + this.payloadLength) {
      this.valid = false;
    }

    // get payload according to the provided message length
    this.payload = data.subarray(byteOffset, byteOffset + this.payloadLength);
  }
}
