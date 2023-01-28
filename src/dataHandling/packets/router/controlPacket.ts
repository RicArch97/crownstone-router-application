/**
 * Control packet definition in the Crownstone router protocol
 */

import { Buffer } from "buffer";

export class ControlPacketWrapper {
  static wrap(
    commandType: number,
    sourceId: number,
    destId: number,
    requestId: number,
    payload: Buffer
  ): Buffer {
    const data = Buffer.alloc(7 + payload.byteLength);

    data.writeUInt8(commandType, 0);
    data.writeUInt8(sourceId, 1);
    data.writeUint8(destId, 2);
    let byteOffset = 3;
    // write little endian, firmware also expects this
    data.writeUInt16LE(requestId, byteOffset);
    byteOffset += 2;
    data.writeUInt16LE(payload.byteLength, byteOffset);
    byteOffset += 2;

    // copy all bytes from payload into data, starting at byteOffset
    payload.copy(data, byteOffset);

    return data;
  }
}
