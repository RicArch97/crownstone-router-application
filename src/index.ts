import { WebSocketServer } from "./websocket";
import { topics } from "./declarations/topics";
import { DataPacket } from "./dataHandling/packets/dataPacket";
import {
  ControlPacketWrapper,
  SwitchCommandWrapper,
} from "./dataHandling/packets/controlPacket";
import {
  CommandPacketType,
  InstanceIdUart,
  GenericPacketType,
} from "./declarations/enums";
import { Logger } from "./logger";
import { GenericPacketWrapper } from "./dataHandling/packets/genericPacket";

const LOG = Logger("index");

const PORT = 14500;
const LDR_LIMIT = 200;
const LED_ON = 100;
const LED_OFF = 0;

const wsServer = new WebSocketServer(PORT);

let ledStatus = LED_OFF;

wsServer.addConnectionListener(() => {
  LOG.info(`WebSocket server listening on port ${PORT}`);
});

/**
 * Listen for data packets.
 *
 * In this example application, an LDR sends values between 0 and 1024.
 * The LDR values are compared to a limit, and when falling below and switch
 * command is returned to the router firmware, which routes the command back to the device
 * the LDR values came from.
 */
wsServer.addEventListener(topics.DataPacket, (data: DataPacket) => {
  const ldrValue = parseInt(data.payload.toString("utf8"), 10);

  let change = false;

  // assume the LED is off by default
  if (ldrValue < LDR_LIMIT && ledStatus == LED_OFF) {
    change = true;
    ledStatus = LED_ON;
  }
  if (ldrValue > LDR_LIMIT && ledStatus == LED_ON) {
    change = true;
    ledStatus = LED_OFF;
  }

  // only send a command when status needs to be changed
  if (change) {
    // create a buffer for a switch command, wrapped in a control packet,
    // wrapped into a generic packet
    const genericPacketBuffer = GenericPacketWrapper.wrap(
      GenericPacketType.PACKET_TYPE_CONTROL,
      ControlPacketWrapper.wrap(
        CommandPacketType.COMMAND_TYPE_SWITCH,
        InstanceIdUart.INSTANCE_ID_UART_RS485,
        SwitchCommandWrapper.wrap(ledStatus)
      )
    );

    wsServer.fireEvent(topics.WriteData, genericPacketBuffer);
  }
});
