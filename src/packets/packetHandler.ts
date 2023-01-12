/**
 * Handles Crownstone router protocol packets
 */
import { GeneralPacket } from "./generalPacket";
import { topics } from "../declarations/topics";
import { Logger } from "../logger";

import { EventBusClass } from "crownstone-core";

const LOG = Logger("PacketParser", true);

const protocolVersion = 1;

export class PacketParser {

  static parse(packet: GeneralPacket, eventBus: EventBusClass) {
    if (packet.protocolVersion !== protocolVersion) {
      LOG.warn("Unsupported protocol version");
    }
    // happens if the packet size is smaller than the given size
    if (packet.valid === false) {
      LOG.warn("Invalid packet size");
    }

    eventBus.emit(topics.GeneralPacket, packet);

    // TODO: parse data packet & emit event
  }
}