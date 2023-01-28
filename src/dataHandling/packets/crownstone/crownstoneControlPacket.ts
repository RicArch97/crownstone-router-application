/**
 * Definition for a Crownstone peripheral control packet
 */

import { Buffer } from "buffer";

export class CrownstoneControlPacketWrapper {
  static wrap(protocol: number, commandType: number, payload: Buffer): Buffer {
    const data = Buffer.alloc(5 + payload.byteLength);

    data.writeUint8(protocol, 0);
    let byteOffset = 1;
    // write little endian, Crownstone also expects this
    data.writeUInt16LE(commandType, byteOffset);
    byteOffset += 2;
    data.writeUInt16LE(payload.byteLength, byteOffset);
    byteOffset += 2;

    // copy all bytes from payload into data, starting at byteOffset
    payload.copy(data, byteOffset);

    return data;
  }
}

export class CrownstoneSwitchCommandValueWrapper {
  static wrap(commandValue: number): Buffer {
    const data = Buffer.alloc(1);

    data.writeUint8(commandValue);

    return data;
  }
}
