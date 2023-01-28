/**
 * Definition for a Crownstone session data packet
 */

import { Buffer } from "buffer";
import * as aesjs from "aes-js";

export class CrownstoneSessionDataPacket {
  validation!: Buffer;
  protocol!: number;
  nonce!: Buffer;
  validationKey!: Buffer;

  valid: boolean = false;

  constructor(payload: Buffer, encryptionKey: string) {
    this.load(payload, encryptionKey);
  }

  load(data: Buffer, encryptionKey: string) {
    this.valid = true;

    // convert basic key to hex
    const keyBytes = aesjs.utils.hex.toBytes(encryptionKey);
    const aesEcb = new aesjs.ModeOfOperation.ecb(keyBytes);
    const decryptedBytes = Buffer.from(aesEcb.decrypt(data));

    // should be 16 bytes
    if (decryptedBytes.byteLength < 16) {
      this.valid = false;
    }

    this.validation = decryptedBytes.subarray(0, 4);
    let byteOffset = 4;
    this.protocol = decryptedBytes.readUInt8(byteOffset);
    byteOffset++;
    this.nonce = decryptedBytes.subarray(byteOffset, byteOffset + 5);
    byteOffset += 5;
    this.validationKey = decryptedBytes.subarray(byteOffset, byteOffset + 4);
  }
}
