import { WebSocketServer } from "./websocket";
import { Logger } from "./logger";

const LOG = Logger("index", true);

const PORT = 14500;
const wsServer = new WebSocketServer(PORT);

wsServer.addConnectionListener(() => {
  LOG.info(`WebSocket server listening on port ${PORT}`);
});