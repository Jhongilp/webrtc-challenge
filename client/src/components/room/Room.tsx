import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
// const socket = io("http://localhost:8000");
const socket = io("https://localhost:8443");

const Room = () => {

  useEffect(() => {
    socket.emit('create or join', "test");

    socket.on('created', (roomObject, socketId) => {
      console.log(`Created room ${roomObject} - socketId: ${socketId}`);
      // isInitiator = true;
    });
  }, [])

  return (
    <div>
      <div id="videos">
        <video id="localVideo" autoPlay muted></video>
        <video id="remoteVideo" autoPlay></video>
      </div>
    </div>
  );
};

export default Room;
