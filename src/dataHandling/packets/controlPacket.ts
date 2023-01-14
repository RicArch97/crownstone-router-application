/**
 * Control packet definition in the Crownstone router protocol
 */

import { Buffer } from "buffer";

export class ControlPacketWrapper {
  static wrap(
    commandType: number,
    destId: number,
    payload: Buffer
  ) {
    const data = Buffer.alloc(4 + payload.byteLength);

    data.writeUInt8(commandType, 0);
    data.writeUint8(destId, 1);
    let byteOffset = 2;
    // write little endian, firmware also expects this
    data.writeUInt16LE(payload.byteLength, byteOffset);
    byteOffset += 2;

    // copy all bytes from payload into data, starting at byteOffset
    payload.copy(data, byteOffset);

    return data;
  }
}

export class SwitchCommandWrapper {
  static wrap(commandValue: number): Buffer {
    const data = Buffer.alloc(1);

    data.writeUint8(commandValue);

    return data;
  }
}
