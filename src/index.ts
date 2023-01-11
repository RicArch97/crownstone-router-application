import { WebSocketServer } from "./websocket";
import { Logger } from "tslog";

export const _Logger = new Logger();

const PORT = 14500;
const wsServer = new WebSocketServer(PORT);

wsServer.addEventListener(() => {
  _Logger.info(`WebSocket server listening on port ${PORT}`);
});