import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
// const socket = io("http://localhost:8000");
const socket = io("https://localhost:8443");

const pcConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

// Set up audio and video regardless of what devices are present.
const sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

const constraints = {
  audio: false,
  video: true,
};

const Room = () => {
  const localVideoRef = useRef<any>(null);
  const remoteVideoRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const isInitiator = useRef(false);
  const isChannelReady = useRef(false);
  const isStarted = useRef(false);

  const maybeStart = () => {
    console.log(
      ">>>>>>> maybeStart() ",
      isStarted.current,
      localStreamRef,
      isChannelReady.current
    );
    if (
      !isStarted.current &&
      typeof localStreamRef.current &&
      isChannelReady.current
    ) {
      console.log(">>>>>> creating peer connection");
      // createPeerConnection();
      // pc.addStream(localStream);
      // isStarted = true;
      // console.log('isInitiator', isInitiator);
      // if (isInitiator) {
      //   doCall();
      // }
    }
  };

  const gotStream = useCallback((stream: any) => {
    console.log("Adding local stream.");
    localStreamRef.current = stream;
    localVideoRef.current.srcObject = stream;
    sendMessage("got user media");
    if (isInitiator.current) {
      maybeStart();
    }
  }, []);

  useEffect(() => {
    socket.emit("create or join", "test");

    socket.on("created", (roomObject, socketId) => {
      console.log(`Created room ${roomObject} - socketId: ${socketId}`);
      // isInitiator = true;
      isInitiator.current = true;
    });

    socket.on("full", (roomObject) => {
      console.log(`Room ${roomObject} is full`);
    });

    socket.on("join", (roomObject) => {
      console.log(`Another peer made a request to join room ${roomObject}`);
      console.log(`This peer is the initiator of room ${roomObject}!`);
      isChannelReady.current = true;
    });

    socket.on("joined", (roomObject) => {
      console.log(`joined: ${roomObject}`);
      isChannelReady.current = true;
    });

    socket.on("log", (array) => {
      console.log(...array);
    });

    socket.on('message', (message) => {
      console.log('Client received message:', message);
      if (message === 'got user media') {
        maybeStart();
      } 
      // else if (message.type === 'offer') {
      //   if (!isInitiator && !isStarted) {
      //     maybeStart();
      //   }
      //   pc.setRemoteDescription(new RTCSessionDescription(message));
      //   doAnswer();
      // } else if (message.type === 'answer' && isStarted) {
      //   pc.setRemoteDescription(new RTCSessionDescription(message));
      // } else if (message.type === 'candidate' && isStarted) {
      //   const candidate = new RTCIceCandidate({
      //     sdpMLineIndex: message.label,
      //     candidate: message.candidate,
      //   });
      //   pc.addIceCandidate(candidate);
      // } else if (message === 'bye' && isStarted) {
      //   handleRemoteHangup();
      // }
    });


    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(gotStream)
      .catch((e) => {
        alert(`getUserMedia() error: ${e.name}`);
      });
  }, [gotStream]);

  const sendMessage = (message: any) => {
    console.log("Client sending message: ", message);
    socket.emit("message", message);
  };

  return (
    <div>
      <div id="videos">
        <video ref={localVideoRef} id="localVideo" autoPlay muted></video>
        <video ref={remoteVideoRef} id="remoteVideo" autoPlay></video>
      </div>
    </div>
  );
};

export default Room;
