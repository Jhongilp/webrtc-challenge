import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
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
  const [isRemotePeerReady, setRemotePeerReady] = useState(false);
  const [isCallComing, setCallComing] = useState(false);

  const localVideoRef = useRef<any>(null);
  const remoteVideoRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);

  const isInitiator = useRef(false);
  const isStarted = useRef(false);
  const pc = useRef<any>(null);

  const handleRemoteStreamAdded = useCallback((event: any) => {
    console.log("Remote stream added.");
    remoteStreamRef.current = event.stream;
    remoteVideoRef.current.srcObject = remoteStreamRef.current;
  }, []);

  const handleRemoteStreamRemoved = useCallback((event: any) => {
    console.log("Remote stream removed. Event: ", event);
  }, []);

  const handleIceCandidate = useCallback((event: any) => {
    // console.log("icecandidate event: ", event);
    if (event.candidate) {
      sendMessage({
        type: "candidate",
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
      });
    } else {
      console.log("End of candidates.");
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    try {
      pc.current = new RTCPeerConnection(pcConfig);
      pc.current.onicecandidate = handleIceCandidate;
      pc.current.onaddstream = handleRemoteStreamAdded;
      pc.current.onremovestream = handleRemoteStreamRemoved;
      console.log("Created RTCPeerConnnection");
    } catch (e: any) {
      console.log(`Failed to create PeerConnection, exception: ${e.message}`);
      alert("Cannot create RTCPeerConnection object.");
    }
  }, [handleIceCandidate, handleRemoteStreamAdded, handleRemoteStreamRemoved]);

  const stop = () => {
    isStarted.current = false;
    pc.current.close();
    pc.current = null;
  };

  const handleRemoteHangup = useCallback(() => {
    console.log("Session terminated.");
    stop();
    isInitiator.current = false;
  }, []);

  useEffect(() => {
    // socket.emit("create or join", "test");

    // TODO use join instead
    socket.on("user_media", (data) => {
      console.log("user_media room - data: ", data);
      setRemotePeerReady(data.userId !== socket.id);
    });

    socket.on("call", (data) => {
      console.log("[on call]: ", data);

      // !careful, this works under the condition that this message is received only by the callee, not the caller
      // TODO what is we setRemoteDescription only when callee answers the call?
      pc.current.setRemoteDescription(
        new RTCSessionDescription(data.sessionDescription)
      );
      setCallComing(true);
    });

    socket.on("answer", (data) => {
      console.log("[on answer]: ", data);
      pc.current.setRemoteDescription(
        new RTCSessionDescription(data.sessionDescription)
      );
      // setCallComing(false);
    });

    socket.on("message", (message) => {
      // 1. offer made by call
      if (message.type === "offer") {
        console.log("[on message] [offer] ");
      }

      if (message.type === "candidate" && isStarted) {
        console.log("[on message] [on candidate] ");
        const candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate,
        });
        // TODO addIceCandidate
        pc.current.addIceCandidate(candidate);
      }
    });


    // socket.on("full", (roomObject) => {
    //   console.log(`Room ${roomObject} is full`);
    // });
    // socket.on("message", (message) => { 
    // if (message === "bye" && isStarted) {
    //     handleRemoteHangup();
    //   }
    // });
  }, [handleRemoteHangup]);

  useEffect(() => {
    const getUserMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("[setupLocalStream] socketId: ", socket.id);
        localStreamRef.current = stream;
        localVideoRef.current.srcObject = stream;

        createPeerConnection();
        pc.current.addStream(localStreamRef.current); // TODO should I move this inside createPeerConnection()?

        socket.emit("user_media", {
          roomId: "test-room",
          userId: socket.id,
        });
      } catch (error) {
        // TODO handle this case properly
        alert(`getUserMedia() error: ${error}`);
      }
    };
    getUserMedia();
  }, []);

  useEffect(() => {
    const bye = () => {
      sendMessage("bye");
    };
    window.addEventListener("beforeunload", bye);
    return () => {
      window.removeEventListener("beforeunload", bye);
    };
  }, []);

  const sendMessage = (message: any) => {
    console.log("Client sending message: ", message);
    socket.emit("message", message);
  };

  const handleOnCall = async () => {
    console.log("calling");
    try {
      const sessionDescription = await pc.current.createOffer([sdpConstraints]);
      pc.current.setLocalDescription(sessionDescription); // this is what triggers onicecandidate

      socket.emit("call", {
        roomId: "test-room",
        userId: socket.id,
        sessionDescription, // TODO pass this to callee
      });
    } catch (error) {
      console.log("createOffer() error: ", error);
    }
  };

  const handleOnAnswer = async () => {
    console.log("Sending answer to peer.");
    try {
      const sessionDescription = await pc.current.createAnswer();
      pc.current.setLocalDescription(sessionDescription);

      console.log("setLocalAndSendMessage sending message", sessionDescription);
      socket.emit("answer", {
        roomId: "test-room",
        userId: socket.id,
        sessionDescription, // TODO pass this to callee
      });
      setCallComing(false);
    } catch (error) {
      console.log("createAnswer() error: ", error);
    }
  };

  return (
    <div>
      <div id="videos">
        <video ref={localVideoRef} id="localVideo" autoPlay muted></video>
        <video ref={remoteVideoRef} id="remoteVideo" autoPlay></video>
      </div>
      <div id="controls">
        <button
          type="button"
          disabled={!isRemotePeerReady}
          onClick={handleOnCall}
        >
          CALL
        </button>
        {isCallComing && (
          <>
            <button type="button" onClick={handleOnAnswer}>
              ANSWER
            </button>
            <button type="button" disabled>
              HANGUP
            </button>
          </>
        )}
      </div>
      <div>
        <h2>Socket id {socket.id}</h2>
      </div>
    </div>
  );
};

export default Room;
