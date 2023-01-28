/**
 * Definition for a Crownstone peripheral packet
 */

import { Buffer } from "buffer";
import * as aesjs from "aes-js";

export class CrownstonePacketWrapper {
  static wrap(
    encryptionKey: string,
    nonce: Buffer,
    userLevel: number,
    validationKey: Buffer,
    payload: Buffer
  ): Buffer {
    // create nonce from packet none + session nonce
    const iv = Buffer.alloc(16);
    // set session nonce
    nonce.copy(iv, 3);

    // convert basic key to hex
    const keyBytes = aesjs.utils.hex.toBytes(encryptionKey);
    // encryption: set mode of operation
    const aesCtr = new aesjs.ModeOfOperation.ctr(
      keyBytes,
      new aesjs.Counter(iv)
    );

    let n = 1;
    // encryped payload size is N*16
    while (payload.byteLength + 4 > n * 16) {
      n++;
    }

    // 4 byte header + N*16 encryped payload
    const fullPacket = Buffer.alloc(n * 16 + 4);
    // set nonce & userlevel
    iv.copy(fullPacket, 0, 0, 3);
    fullPacket.writeUint8(userLevel, 3);

    const encryptedPayload = Buffer.alloc(n * 16, 0);
    // set validation key
    validationKey.copy(encryptedPayload, 0, 0, 4);
    // set the payload
    payload.copy(encryptedPayload, 4);

    // encrypt the packet
    const encryptedBytes = Buffer.from(aesCtr.encrypt(encryptedPayload));
    // add to full packet
    encryptedBytes.copy(fullPacket, 4);

    return fullPacket;
  }
}
