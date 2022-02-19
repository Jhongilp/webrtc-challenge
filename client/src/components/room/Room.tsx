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

type CALL_STATUS =
  | "not_started"
  | "calling"
  | "call_coming"
  | "answered"
  | "hangup";

const Room = () => {
  const [callStatus, updateCallStatus] = useState<CALL_STATUS>("not_started");
  const [isRemotePeerReady, setRemotePeerReady] = useState(false);

  const localVideoRef = useRef<any>(null);
  const remoteVideoRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);
  const pc = useRef<any>(null);

  const handleRemoteStreamAdded = useCallback((event: any) => {
    console.log("Remote stream added.");
    remoteStreamRef.current = event.stream;
    remoteVideoRef.current.srcObject = remoteStreamRef.current;
  }, []);

  const handleIceCandidate = useCallback((event: any) => {
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
      console.log("Created RTCPeerConnnection");
    } catch (e: any) {
      console.log(`Failed to create PeerConnection, exception: ${e.message}`);
      alert("Cannot create RTCPeerConnection object.");
    }
  }, [handleIceCandidate, handleRemoteStreamAdded]);

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
      updateCallStatus("call_coming");
    });

    socket.on("answer", (data) => {
      console.log("[on answer]: ", data);
      pc.current.setRemoteDescription(
        new RTCSessionDescription(data.sessionDescription)
      );
      updateCallStatus("answered");
    });

    socket.on("message", (message) => {
      // 1. offer made by call
      if (message.type === "offer") {
        console.log("[on message] [offer] ");
      }

      if (message.type === "candidate") {
        // console.log("[on message] [on candidate] ");
        const candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate,
        });
        pc.current.addIceCandidate(candidate);
      }

      if (message.type === "hangup") {
        console.log("[on message] [on hangup] ");
        updateCallStatus("hangup");
      }
    });

    // socket.on("full", (roomObject) => {
    //   console.log(`Room ${roomObject} is full`);
    // });
    // socket.on("message", (message) => {
  }, []);

  useEffect(() => {
    const getUserMedia = async () => {
      try {
        createPeerConnection();
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream
          .getTracks()
          .forEach((track) => pc.current.addTrack(track, stream));

        console.log("[setupLocalStream] socketId: ", socket.id);
        localStreamRef.current = stream;
        localVideoRef.current.srcObject = stream;

        pc.current.addEventListener("connectionstatechange", (event: any) => {
          console.log(
            "[pc connection] on state change: ",
            pc.current.connectionState
          );
        });

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
  }, [createPeerConnection]);

  const handleOnHangup = useCallback(() => {
    sendMessage({
      type: "hangup",
      roomId: "test-room",
      userId: socket.id,
    });
    pc.current.close();
    pc.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("beforeunload", handleOnHangup);
    return () => {
      window.removeEventListener("beforeunload", handleOnHangup);
    };
  }, [handleOnHangup]);

  const sendMessage = (message: any) => {
    console.log("Client sending message: ", message);
    socket.emit("message", message);
  };

  const handleOnCall = async () => {
    console.log("calling");
    updateCallStatus("calling");
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
      updateCallStatus("not_started");
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
      updateCallStatus("answered");
    } catch (error) {
      console.log("createAnswer() error: ", error);
      updateCallStatus("hangup");
    }
  };

  const isCalling = callStatus === "calling";
  const isCallComing = callStatus === "call_coming";
  const isCallStablished = callStatus === "answered";

  return (
    <div>
      <div id="videos">
        <video ref={localVideoRef} id="localVideo" autoPlay muted></video>
        <video ref={remoteVideoRef} id="remoteVideo" autoPlay></video>
      </div>
      <div id="controls">
        {!isCallStablished && (
          <button
            type="button"
            disabled={!isRemotePeerReady}
            onClick={handleOnCall}
          >
            {isCalling ? "CALLING ..." : "CALL"}
          </button>
        )}
        {isCallComing && (
          <button type="button" onClick={handleOnAnswer}>
            ANSWER
          </button>
        )}
        {(isCallComing || isCallStablished) && (
          <button type="button" onClick={handleOnHangup}>
            HANGUP
          </button>
        )}
      </div>
      <div>
        <h2>Socket id {socket.id}</h2>
      </div>
    </div>
  );
};

export default Room;
