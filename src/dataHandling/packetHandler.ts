/**
 * Handles Crownstone router protocol packets
 */

import { GenericPacket } from "./packets/genericPacket";
import { DataPacket } from "./packets/dataPacket";
import { topics } from "../declarations/topics";
import { GenericPacketType } from "../declarations/enums";
import { Logger } from "../logger";
import { PROTOCOL_VERSION, UINT16_SIZE } from "../declarations/const";

import { EventBusClass } from "crownstone-core";

const LOG = Logger("PacketParser");

export class PacketParser {
  static parse(packet: GenericPacket, eventBus: EventBusClass) {
    if (packet.protocolVersion !== PROTOCOL_VERSION) {
      LOG.warn("Unsupported protocol version");
    }
    // happens if the packet size is smaller than the given size
    if (packet.valid === false) {
      LOG.warn("Invalid general packet size");
    }

    eventBus.emit(topics.GeneralPacket, packet);

    if (packet.payloadType < UINT16_SIZE) {
      LOG.verbose("Handling packet:", packet.payloadType);
    }
    // handle packets based on the type
    if (packet.payloadType === GenericPacketType.PACKET_TYPE_DATA) {
      let dataPacket = new DataPacket(packet.payload);
      if (dataPacket.valid) {
        eventBus.emit(topics.DataPacket, dataPacket);
      } else {
        LOG.warn("Invalid data packet size");
      }
    }
  }
}
