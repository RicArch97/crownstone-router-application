/**
 * Main application code
 */

import { WebSocketServer } from "./websocket";
import { topics } from "./declarations/topics";
import { DataPacket } from "./dataHandling/packets/router/dataPacket";
import { ControlPacketWrapper } from "./dataHandling/packets/router/controlPacket";
import {
  CommandPacketType,
  InstanceId,
  GenericPacketType,
  CrownstoneCommandPacketType,
} from "./declarations/enums";
import { Logger } from "./logger";
import { GenericPacketWrapper } from "./dataHandling/packets/router/genericPacket";
import { randInt } from "./util";
import { UINT16_SIZE } from "./declarations/const";
import { ResultPacket } from "./dataHandling/packets/router/resultPacket";
import { CrownstoneSessionDataPacket } from "./dataHandling/packets/crownstone/crownstoneSessionData";
import { CrownstonePacketWrapper } from "./dataHandling/packets/crownstone/crownstonePacket";
import {
  CrownstoneControlPacketWrapper,
  CrownstoneSwitchCommandValueWrapper,
} from "./dataHandling/packets/crownstone/crownstoneControlPacket";

const LOG = Logger("index");

const PORT = 14500;
const LDR_LIMIT = 200;
const CRWN_ON = 100;
const CRWN_OFF = 0;

const CROWNSTONE_MAC = "mac";

const ENCRYPTION_KEY = "key";
const KEY_USER_LEVEL = 2; //basic key

const wsServer = new WebSocketServer(PORT);

let crwnState = CRWN_OFF;
let requestId = randInt(1, UINT16_SIZE);

wsServer.addConnectionListener(() => {
  LOG.info(`WebSocket server listening on port ${PORT}`);
});

/**
 * Listen for data packets.
 *
 * In this example application, an LDR sends values between 0 and 1024.
 * The LDR values are compared to a limit, and when falling below and switch
 * command is returned to the router firmware, which switches a Crownstone over BLE.
 */
wsServer.addEventListener(topics.DataPacket, (data: DataPacket) => {
  if (data.sourceId !== InstanceId.INSTANCE_ID_UART_RS485) {
    return;
  }
  const ldrValue = parseInt(data.payload.toString("utf8"), 10);

  let change = false;

  // assume the LED is off by default
  if (ldrValue < LDR_LIMIT && crwnState == CRWN_OFF) {
    change = true;
    crwnState = CRWN_ON;
  }
  if (ldrValue > LDR_LIMIT && crwnState == CRWN_ON) {
    change = true;
    crwnState = CRWN_OFF;
  }

  // only send a command when status needs to be changed
  if (change) {
    // request, payload is empty
    const requestPayload = Buffer.from(CROWNSTONE_MAC);
    // create a control packet wrapped into a generic packet
    const genericPacketBuffer = GenericPacketWrapper.wrap(
      GenericPacketType.PACKET_TYPE_CONTROL,
      ControlPacketWrapper.wrap(
        CommandPacketType.COMMAND_TYPE_REQUEST,
        InstanceId.INSTANCE_ID_CLOUD,
        InstanceId.INSTANCE_ID_BLE_CROWNSTONE_PERIPHERAL,
        requestId,
        requestPayload
      )
    );

    wsServer.fireEvent(topics.WriteData, genericPacketBuffer);
  }
});

/**
 * Listen for result packets.
 *
 * The first result should contain session data from a Crownstone.
 * The second result is the result of the switch.
 */
wsServer.addEventListener(topics.ResultPacket, (data: ResultPacket) => {
  if (data.commandType === CommandPacketType.COMMAND_TYPE_REQUEST) {
    if (data.resultId !== requestId) {
      LOG.warn("Received result ID does not match request ID");
      return;
    }

    // get session data
    const sessionData = new CrownstoneSessionDataPacket(
      data.payload,
      ENCRYPTION_KEY
    );
    // create a new request ID
    let newRequestId = randInt(1, UINT16_SIZE);
    do {
      newRequestId = randInt(1, UINT16_SIZE);
    } while (newRequestId == requestId);

    requestId = newRequestId;

    // create a Crownstone packet from control and switch
    const crownstoneSwitchPacketBuffer = GenericPacketWrapper.wrap(
      GenericPacketType.PACKET_TYPE_CONTROL,
      ControlPacketWrapper.wrap(
        CommandPacketType.COMMAND_TYPE_SWITCH,
        InstanceId.INSTANCE_ID_CLOUD,
        InstanceId.INSTANCE_ID_BLE_CROWNSTONE_PERIPHERAL,
        requestId,
        CrownstonePacketWrapper.wrap(
          ENCRYPTION_KEY,
          sessionData.nonce,
          KEY_USER_LEVEL,
          sessionData.validationKey,
          CrownstoneControlPacketWrapper.wrap(
            sessionData.protocol,
            CrownstoneCommandPacketType.COMMAND_TYPE_SWITCH,
            CrownstoneSwitchCommandValueWrapper.wrap(crwnState)
          )
        )
      )
    );

    wsServer.fireEvent(topics.WriteData, crownstoneSwitchPacketBuffer);
  }
});
