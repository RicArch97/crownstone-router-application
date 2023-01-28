# Crownstone router application

Implements a websocket server, and the Crownstone router protocol to communicate with the Crownstone router firmware running on an ESP32.

An example application is defined in `src/index.ts` with a listener for incoming LDR data from a UART device, connected to the ESP32 running the Crownstone router firmware. When the retrieved value falls below a set limit, a switch value packet will be routed back to the UART device, which switches an LED.

## Development

First install NodeJS 18 (LTS) on your system using your package manager (Linux) or download the installer (Windows) from [here](https://nodejs.org/en/download/).

In the project folder, run
```shell
npm install
```
To install all the dependencies and dev dependencies.

### Running the application

Running the application can be done by
```shell
npm start
```
This opens a websocket server on port 14500 by default. The port can be changed in `src/index.ts`.
