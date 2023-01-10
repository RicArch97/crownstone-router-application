const WebSocketServer = require("./websocket");

const PORT = 14500;
const wsServer = new WebSocketServer({ port: PORT });

wsServer.addEventListener(() => {
  console.log(`WebSocket server listening on port ${PORT}`);
});