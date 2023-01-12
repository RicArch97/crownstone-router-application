/**
 * General packet definition in the Crownstone router protocol
 */
import { Buffer } from "buffer";

export class GeneralPacket {
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
    // bytes should be provided as big endian
    this.payloadLength = data.readUInt16BE(byteOffset);
    byteOffset += 2;

    if (data.length < (byteOffset + this.payloadLength)) {
      this.valid = false;
    }

    // get payload according to the provided message length
    this.payload = data.subarray(byteOffset, (byteOffset + this.payloadLength));
  }
}

export class GeneralWrapper {

  constructor(packet: GeneralPacket) {
    this.wrap(packet);
  }

  wrap(packet: GeneralPacket) : Buffer {
    const data = Buffer.alloc(3 + packet.payloadLength);

    data.writeUInt8(packet.protocolVersion, 0);
    data.writeUint8(packet.payloadType, 1);
    let byteOffset = 2;
    // write big endian, firmware also expects this
    data.writeUInt16BE(packet.payloadLength, byteOffset);
    byteOffset += 2;

    // copy all bytes from payload into data, starting at byteOffset
    packet.payload.copy(data, byteOffset);

    return data;
  }
}