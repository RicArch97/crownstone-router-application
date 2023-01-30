/**
 * Handles Crownstone router protocol packets
 */

import { GenericPacket } from "./packets/router/genericPacket";
import { DataPacket } from "./packets/router/dataPacket";
import { topics } from "../declarations/topics";
import { GenericPacketType } from "../declarations/enums";
import { Logger } from "../logger";
import { PROTOCOL_VERSION, UINT16_SIZE } from "../declarations/const";

import { EventBusClass } from "crownstone-core";
import { ResultPacket } from "./packets/router/resultPacket";

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
      const dataPacket = new DataPacket(packet.payload);
      if (dataPacket.valid) {
        eventBus.emit(topics.DataPacket, dataPacket);
      } else {
        LOG.warn("Invalid data packet size");
      }
    } else if (packet.payloadType === GenericPacketType.PACKET_TYPE_RESULT) {
      const resultPacket = new ResultPacket(packet.payload);
      if (resultPacket.valid) {
        eventBus.emit(topics.ResultPacket, resultPacket);
      } else {
        LOG.warn("Invalid result packet size");
      }
    }
  }
}
