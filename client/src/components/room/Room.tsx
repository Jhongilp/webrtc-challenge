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
  const [isRemotePeerReady, setRemotePeerReady] = useState(false)
  const [isCallComing, setCallComing] = useState(false)

  const localVideoRef = useRef<any>(null);
  const remoteVideoRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);

  const isInitiator = useRef(false);
  const isChannelReady = useRef(false);
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

  const handleCreateOfferError = useCallback((event: any) => {
    console.log("createOffer() error: ", event);
  }, []);

  const setLocalAndSendMessage = useCallback((sessionDescription: any) => {
    // Set Opus as the preferred codec in SDP if Opus is present.
    //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
    pc.current.setLocalDescription(sessionDescription);
    console.log("setLocalAndSendMessage sending message", sessionDescription);
    sendMessage(sessionDescription);
  }, []);

  const doCall = useCallback(() => {
    console.log("Sending offer to peer");
    pc.current
      .createOffer([sdpConstraints])
      .then((offer: any) => setLocalAndSendMessage(offer))
      .catch(handleCreateOfferError);
  }, [setLocalAndSendMessage, handleCreateOfferError]);

  const maybeStart = useCallback(() => {
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
      createPeerConnection();
      pc.current.addStream(localStreamRef.current); // TODO should I move this inside createPeerConnection()?
      isStarted.current = true;
      console.log("isInitiator", isInitiator.current);
      if (isInitiator.current) {
        doCall();
      }
    }
  }, [createPeerConnection, doCall]);

  const gotStream = useCallback(
    (stream: any) => {
      console.log("Adding local stream.");
      localStreamRef.current = stream;
      localVideoRef.current.srcObject = stream;
      sendMessage("user_media");
      if (isInitiator.current) {
        maybeStart();
      }
    },
    [maybeStart]
  );

  const onCreateSessionDescriptionError = (error: any) => {
    console.log(`Failed to create session description: ${error.toString()}`);
    // trace(`Failed to create session description: ${error.toString()}`);
  };

  const doAnswer = useCallback(() => {
    console.log("Sending answer to peer.");
    pc.current
      .createAnswer()
      .then((answer: any) => setLocalAndSendMessage(answer))
      .catch(onCreateSessionDescriptionError);
  }, [setLocalAndSendMessage]);

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

    socket.on("user_media", (data) => {
      console.log("user_media room - data: ", data);
      setRemotePeerReady(true);
    });
    
    // socket.on("created", (roomObject, socketId) => {
    //   console.log(`Created room ${roomObject} - socketId: ${socketId}`);
    //   isInitiator.current = true;
    // });

    // socket.on("full", (roomObject) => {
    //   console.log(`Room ${roomObject} is full`);
    // });

    // socket.on("join", (roomObject) => {
    //   console.log(`Another peer made a request to join room ${roomObject}`);
    //   console.log(`This peer is the initiator of room ${roomObject}!`);
    //   isChannelReady.current = true;
    // });

    // socket.on("joined", (roomObject) => {
    //   console.log(`joined: ${roomObject}`);
    //   isChannelReady.current = true;
    // });

    // socket.on("log", (array) => {
    //   console.log(...array);
    // });

    // socket.on("message", (message) => {
    //   console.log("Client received message:", message);
    //   if (message === "got user media") {
    //     maybeStart();
    //   } else if (message.type === "offer") {
    //     if (!isInitiator.current && !isStarted.current) {
    //       maybeStart();
    //     }
    //     pc.current.setRemoteDescription(new RTCSessionDescription(message));
    //     doAnswer();
    //   } else if (message.type === "answer" && isStarted) {
    //     pc.current.setRemoteDescription(new RTCSessionDescription(message));
    //   } else if (message.type === "candidate" && isStarted) {
    //     const candidate = new RTCIceCandidate({
    //       sdpMLineIndex: message.label,
    //       candidate: message.candidate,
    //     });
    //     pc.current.addIceCandidate(candidate);
    //   } else if (message === "bye" && isStarted) {
    //     handleRemoteHangup();
    //   }
    // });
  }, [maybeStart, doAnswer, handleRemoteHangup]);

  useEffect(() => {
    const getUserMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("[setupLocalStream] socketId: ", socket.id);
        localStreamRef.current = stream;
        localVideoRef.current.srcObject = stream;
        socket.emit("user_media", {
          roomId: 'test-room',
          userId: socket.id
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

  const handleOnCall = () => {
    createPeerConnection();
    pc.current.addStream(localStreamRef.current); // TODO should I move this inside createPeerConnection()?
    doCall();
  };

  return (
    <div>
      <div id="videos">
        <video ref={localVideoRef} id="localVideo" autoPlay muted></video>
        <video ref={remoteVideoRef} id="remoteVideo" autoPlay></video>
      </div>
      <div id="controls">
        <button type="button" disabled={!isRemotePeerReady} onClick={handleOnCall}>
          CALL
        </button>
        <button type="button" disabled={!isCallComing}>ANSWER</button>
        <button type="button" disabled>HANGUP</button>
      </div>
    <div>
      <h2>Socket id {socket.id}</h2>
    </div>
    </div>
  );
};

export default Room;

/**
 * 1. get user media
 */
