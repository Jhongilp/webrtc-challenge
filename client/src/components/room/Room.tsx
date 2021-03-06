import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useGridWidth } from "../../hooks";

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
  audio: true,
  video: true,
};

type CALL_STATUS =
  | "not_started"
  | "calling"
  | "call_coming"
  | "answered"
  | "hangup";

type TEnumerateDevices = {
  audio: MediaDeviceInfo[];
  video: MediaDeviceInfo[];
};

type TDeviceSelectionChange = {
  type: "audio" | "video";
  selectedMedia: MediaDeviceInfo;
};

const getUpdatedStream = async ({
  type,
  selectedMedia,
}: TDeviceSelectionChange) => {
  const newConstraints = {
    ...constraints,
    [type]: { deviceId: { exact: selectedMedia.deviceId } },
  };
  const stream = await navigator.mediaDevices.getUserMedia(newConstraints);
  return stream;
};

const Room = ({ roomId }: { roomId: number }) => {
  const [callStatus, updateCallStatus] = useState<CALL_STATUS>("not_started");
  const [isRemotePeerReady, setRemotePeerReady] = useState(false);
  const [deviceList, setDeviceList] = useState<TEnumerateDevices>({
    audio: [],
    video: [],
  });

  const localVideoRef = useRef<any>(null);
  const remoteVideoRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);
  const pc = useRef<any>(null);

  const wrapperRef = useRef<any>(null);
  const width = useGridWidth(wrapperRef);

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
        roomId
      });
    } else {
      console.log("End of candidates.");
    }
  }, [roomId]);

  const handleConnectionStateChange = useCallback((event: any) => {
    console.log(
      "[pc connection] on state change: ",
      pc.current.connectionState
    );
  }, []);
  const handleOnTrackEvents = useCallback((event: any) => {
    console.log("[pc connection] on track event: ", event);
  }, []);

  const createPeerConnection = useCallback(() => {
    try {
      pc.current = new RTCPeerConnection(pcConfig);
      pc.current.onicecandidate = handleIceCandidate;
      pc.current.onaddstream = handleRemoteStreamAdded;
      pc.current.onconnectionstatechange = handleConnectionStateChange;
      pc.current.ontrack = handleOnTrackEvents;
      console.log("Created RTCPeerConnnection");
    } catch (e: any) {
      console.log(`Failed to create PeerConnection, exception: ${e.message}`);
      alert("Cannot create RTCPeerConnection object.");
    }
  }, [
    handleIceCandidate,
    handleRemoteStreamAdded,
    handleConnectionStateChange,
    handleOnTrackEvents,
  ]);

  useEffect(() => {
    // socket.emit("create or join", "test");

    // TODO use join instead
    socket.on("join", (data) => {
      console.log("joined room - data: ", data);
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

        navigator.mediaDevices
          .enumerateDevices()
          .then(function (devices) {
            console.log("device LIST: ", devices);
            const audioDeviceList = devices.filter(
              (device) => device.kind === "audioinput"
            );
            const videoDeviceList = devices.filter(
              (device) => device.kind === "videoinput"
            );
            setDeviceList({
              audio: audioDeviceList,
              video: videoDeviceList,
            });
          })
          .catch(function (err) {
            console.log(err.name + ": " + err.message);
          });

        socket.emit("join", {
          roomId,
          userId: socket.id,
        });
      } catch (error) {
        // TODO handle this case properly
        alert(`getUserMedia() error: ${error}`);
      }
    };
    getUserMedia();
  }, [createPeerConnection, roomId]);

  const handleOnHangup = useCallback(() => {
    sendMessage({
      type: "hangup",
      roomId,
      userId: socket.id,
    });
    pc.current.close();
    pc.current = null;
  }, [roomId]);

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
        roomId,
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
        roomId,
        userId: socket.id,
        sessionDescription, // TODO pass this to callee
      });
      updateCallStatus("answered");
    } catch (error) {
      console.log("createAnswer() error: ", error);
      updateCallStatus("hangup");
    }
  };

  const stopCurrentTracks = () => {
    localStreamRef.current.getTracks().forEach((track: any) => {
      track.stop();
    });
  };

  const handleOnDeviceSelectionChange = async ({
    type,
    selectedMedia,
  }: TDeviceSelectionChange) => {
    stopCurrentTracks();
    const stream = await getUpdatedStream({ type, selectedMedia });
    localStreamRef.current = stream;
    localVideoRef.current.srcObject = stream;
    console.log("[stream tracks] ", stream.getTracks());
    stream.getTracks().forEach((track) => pc.current.addTrack(track, stream));
  };

  const handleOnAudioDeviceSelected = async (e: any) => {
    const selectedMic = deviceList.audio.find(
      (device) => device.deviceId === e.currentTarget.value
    );
    if (selectedMic) {
      console.log("on mic change device selected: ", selectedMic);
      handleOnDeviceSelectionChange({
        type: "audio",
        selectedMedia: selectedMic,
      });
    }
  };

  const handleOnVideoDeviceSelected = async (e: any) => {
    const selectedCamera = deviceList.video.find(
      (device) => device.deviceId === e.currentTarget.value
    );
    if (selectedCamera) {
      console.log("on video change device selected: ", selectedCamera);
      handleOnDeviceSelectionChange({
        type: "video",
        selectedMedia: selectedCamera,
      });
    }
  };

  const isCalling = callStatus === "calling";
  const isCallComing = callStatus === "call_coming";
  const isCallStablished = callStatus === "answered";

  return (
    <div ref={wrapperRef} className="room">
      <div className="media-controls">
        <div className="mic-selection">
          <label htmlFor="camera-list">Camera</label>
          <select onChange={handleOnVideoDeviceSelected} id="camera-list">
            {deviceList.video.map((device) => {
              return (
                <option value={device.deviceId} key={device.deviceId}>
                  {device.label}
                </option>
              );
            })}
          </select>
        </div>
        <div className="camera-selection">
          <label htmlFor="mic-list">Mic</label>
          <select onChange={handleOnAudioDeviceSelected} id="mic-list">
            {deviceList.audio.map((device) => {
              return (
                <option
                  defaultValue="default"
                  value={device.deviceId}
                  key={device.deviceId}
                >
                  {device.label}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      <div className="room-videos--container" style={{ width }}>
        <div
          className={`local-video-wrapper ${
            isCallStablished ? "local-p2p" : ""
          }`}
        >
          <video ref={localVideoRef} id="localVideo" autoPlay muted></video>
        </div>
        <div
          className={`remote-video-wrapper ${
            isCallStablished ? "show-remote-video" : ""
          }`}
        >
          <video ref={remoteVideoRef} id="remoteVideo" autoPlay></video>
        </div>
      </div>
      <div id="room-controls">
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
      {/* <div>
        <h2>Socket id {socket.id}</h2>
      </div> */}
    </div>
  );
};

export default Room;
