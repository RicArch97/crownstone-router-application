/**
 * Data packet definition in the Crownstone router protocol
 */
import { Buffer } from "buffer";

export class DataPacket {
  sourceType!: number;
  sourceId!: number;
  payloadLength!: number;
  payload!: Buffer;

  valid: boolean = false;

  constructor(payload: Buffer) {
    this.load(payload);
  }

  load(data: Buffer) {
    this.valid = true;

    this.sourceType = data.readUint8(0);
    this.sourceId = data.readUint8(1);
    let byteOffset = 2;
    // bytes should be provided as big endian
    this.payloadLength = data.readUInt16BE(byteOffset);
    byteOffset += 2;

    if (data.byteLength < byteOffset + this.payloadLength) {
      this.valid = false;
    }

    // get payload according to the provided message length
    this.payload = data.subarray(byteOffset, byteOffset + this.payloadLength);
  }
}
