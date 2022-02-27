# WebRTC MEET APP

This is a basic WebRTC application usin Node.js and React

## Server

```
npm run dev
```

## Client

To run the client we need to move to client folder and install the packages.

```
npm install
// then
npm start
```

# About WebRTC

WebRTC is a combination of protocols that allow Real Time Communication in the browser.

## UDP, WebSockets and WebRTC

We can use WebSockets in the initial signaling stage. In this initial stage, we just stablish a connection between the users. It will be used as a medium to share the data needed to stablish a WebRTC connection. Once WebRTC is stablished, it transports its data over UDP.

## WebRTC steps

- Signaling
- Connecting
- Securing
- Communicating

# Protocols that we need to understand first

- ### SIP: Session Initiation Protocol
  A signaling protocol that is used commonly in VoIP
- ### SDP: Session Description Protocol

  SDP contains the codec, source address, and timing information of audio and video. See [Anatomy of a WebRTC SDP](https://webrtchacks.com/sdp-anatomy/ "Anatomy of a WebRTC SDP").

- ### ICE: Interactive Connectivity Establishment
  Stablishing a connection between two peers is not as easier as regular server/client architecture. Since WebRTC is about peer-to-peer (p2p) connection, there are some network challenges, mostly because the public IP that is required to make the p2p connection is not always available due to NAT routers.
  ICE is a mechanism that used along with STUN and TURN servers allows to stablish a connection.

ICE Candidate Types:

- host: local address
- srflx: address from STUN server
- relay: address from TURN server

In order to have a reliable WebRTC connection a TURN server is always required. ICE collects all the possible connections available (local, STUN, TURN) and the protocol will decice which one is the optimal connection. See [WebRTC for the Curious](https://webrtcforthecurious.com/docs/03-connecting/ "WebRTC for the Curious").

- ### RTP: Realtime Transport Protocol
- ### RTCP: Realtime Transport Control Protocol
- ### DTLS: Datagram Transport Layer Security
- ### SRTP: Secure Realtime Transport Protocol


## Types of servers used

- ### Signaling server (can be the same application server)
- ### STUN / TURN servers
- ### Media servers

### CODECS

## Audio codecs

- ### OPUS
- ### G.711

## Video codecs

- ### VP8
- ### H.264

## WebRTC connection types

- ### MESH
- ### MCU
- ### SFU

# native-webrtc-peer-to-peer

A basic native WebRTC peer to peer Web App implementation

It includes a web client and a signaling server for clients to connect and do signaling for WebRTC.

It uses [adapter.js](https://github.com/webrtc/adapter) for WebRTC and [socket.io](https://socket.io/) for signaling

### Dependencies

- [NodeJS](https://nodejs.org)
- [Docker](https://www.docker.com)

### Starting with Docker

Go to the directory that has your Dockerfile and run the following command to build the Docker image. The -t flag lets you tag your image so it's easier to find later using the docker images command:

```
docker build . -t <your username>/webrtc-app
```

Run the image you previously built:

```
docker run -p 8080:80 -e DEBUG=* -d <your username>/webrtc-app
```

Using this command the app will be accessible at [localhost:8080](http://localhost:8080) and running in [DEBUG mode](https://www.npmjs.com/package/debug)

### Starting and debugging (without docker)

Build the backend:

`npm run build`

Autofix code style:

`npm run lint:fix`

For just running:

`npm run dev`

For running with debug mode:

`DEBUG=* npm run dev`

### Credit where credit is due:

Initial code from https://github.com/googlecodelabs/webrtc-web
