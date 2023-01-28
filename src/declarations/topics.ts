/**
 * Event topics for event listeners
 */

export const topics = {
  // server & socket topics
  Upgrade: "upgrade",
  Headers: "headers",
  Close: "close",
  RawData: "data",

  // received packets
  GeneralPacket: "GeneralPacket",
  DataPacket: "DataPacket",
  ResultPacket: "ResultPacket",

  // write data to socket
  WriteData: "WriteData"
}