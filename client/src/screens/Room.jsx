import React, { useEffect, useCallback, useState, useRef } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import StarBorder from "../components/StarBorder";
import "../styles/Room.css";
import { MdCallEnd } from "react-icons/md";
import { FaUser } from "react-icons/fa";

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isRemoteVideoOn, setIsRemoteVideoOn] = useState(true);
  const remoteAudioRef = useRef(null);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  // Bind remote stream to hidden audio element so audio keeps playing even if video is hidden
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      try {
        remoteAudioRef.current.srcObject = remoteStream;
      } catch (e) {
        // Fallback for older browsers
        remoteAudioRef.current.src = window.URL.createObjectURL(remoteStream);
      }
    }
  }, [remoteStream]);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  // Receive remote video toggle changes
  useEffect(() => {
    if (!socket) return;
    const onRemoteVideoToggle = ({ from, isOn }) => {
      // Only process if it matches our current remote peer
      if (!remoteSocketId || from === remoteSocketId) {
        setIsRemoteVideoOn(!!isOn);
      }
    };
    socket.on("peer:video-toggle", onRemoteVideoToggle);
    return () => socket.off("peer:video-toggle", onRemoteVideoToggle);
  }, [socket, remoteSocketId]);

  const toggleVideo = () => {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOn(videoTrack.enabled);
      // Inform remote peer so they can show placeholder
      if (remoteSocketId) {
        socket.emit("user:video-toggle", { to: remoteSocketId, isOn: videoTrack.enabled });
      }
    }
  };

  const toggleAudio = () => {
    if (myStream) {
      const audioTrack = myStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioOn(audioTrack.enabled);
    }
  };

  const leaveCall = () => {
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
    }
    window.location.href = "/";
  };

  return (
    <div className="room-container">
      <div className="room-header">
        <div className="logo">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#2D8CFF"/>
            <path d="M12 20C12 15.5817 15.5817 12 20 12C24.4183 12 28 15.5817 28 20C28 24.4183 24.4183 28 20 28C15.5817 28 12 24.4183 12 20Z" fill="white"/>
            <circle cx="20" cy="20" r="3" fill="#2D8CFF"/>
          </svg>
          <h1>LinkMeet</h1>
        </div>
        <div className="connection-status">
          {remoteSocketId ? (
            <span className="status-connected">
              <span className="status-dot"></span>
              Connected
            </span>
          ) : (
            <span className="status-waiting">
              <span className="status-dot waiting"></span>
              Waiting for others...
            </span>
          )}
        </div>
      </div>

      <div className="video-grid">
        {remoteStream && (
          <div className="video-container main-video">
            {/* Remote video or placeholder */}
            {isRemoteVideoOn ? (
              <ReactPlayer
                playing
                height="100%"
                width="100%"
                url={remoteStream}
                className="video-player"
              />
            ) : (
              <div className="video-placeholder">
                {/* Keep remote audio playing */}
                <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
                <div className="glass-avatar">
                  <FaUser size={64} />
                </div>
                <div className="video-off-badge">Video Off</div>
              </div>
            )}
            <div className="video-label">Remote User</div>
          </div>
        )}

        {myStream && (
          <div className={`video-container ${remoteStream ? 'pip-video' : 'main-video'}`}>
            {/* Local video or placeholder */}
            {isVideoOn ? (
              <ReactPlayer
                playing
                muted
                height="100%"
                width="100%"
                url={myStream}
                className="video-player"
              />
            ) : (
              <div className="video-placeholder">
                <div className="glass-avatar self">
                  <FaUser size={56} />
                </div>
                <div className="video-off-badge">Your Video is Off</div>
              </div>
            )}
            <div className="video-label">You {!isVideoOn && '(Video Off)'}</div>
          </div>
        )}

        {!myStream && !remoteStream && (
          <div className="empty-state">
            <div className="empty-icon">📹</div>
            <h2>Ready to join?</h2>
            <p>Click the button below to start your meeting</p>
          </div>
        )}
      </div>

      <div className="control-bar">
        <div className="controls-left">
          {remoteSocketId && !myStream && (
            <StarBorder color="#2D8CFF" speed="4s" className="star-button" onClick={handleCallUser}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 5.5C3 14.0604 9.93959 21 18.5 21C18.8862 21 19.2691 20.9859 19.6483 20.9581C20.0834 20.9262 20.3009 20.9103 20.499 20.7963C20.663 20.7019 20.8185 20.5345 20.9007 20.364C21 20.1582 21 19.9181 21 19.438V16.6207C21 16.2169 21 16.015 20.9335 15.842C20.8749 15.6891 20.7795 15.553 20.6559 15.4456C20.516 15.324 20.3262 15.255 19.9468 15.117L16.74 13.9509C16.2985 13.7904 16.0777 13.7101 15.8683 13.7237C15.6836 13.7357 15.5059 13.7988 15.3549 13.9058C15.1837 14.0271 15.0629 14.2285 14.8212 14.6314L14 16C11.3501 14.7999 9.2019 12.6489 8 10L9.36863 9.17882C9.77145 8.93713 9.97286 8.81628 10.0942 8.64506C10.2012 8.49408 10.2643 8.31637 10.2763 8.1317C10.2899 7.92227 10.2096 7.70153 10.0491 7.26005L8.88299 4.05321C8.745 3.67376 8.67601 3.48403 8.55442 3.3441C8.44701 3.22049 8.31089 3.12515 8.15802 3.06645C7.98496 3 7.78308 3 7.37932 3H4.56201C4.08188 3 3.84181 3 3.63598 3.09925C3.4655 3.18146 3.29814 3.33701 3.2037 3.50103C3.08968 3.69907 3.07375 3.91662 3.04189 4.35173C3.01413 4.73086 3 5.11378 3 5.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Start Call
            </StarBorder>
          )}
          {myStream && (
            <StarBorder color="#4ade80" speed="5s" className="star-button" onClick={sendStreams}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 18H11C12.1046 18 13 17.1046 13 16V8C13 6.89543 12.1046 6 11 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Send Stream
            </StarBorder>
          )}
        </div>

        <div className="controls-center">
          <StarBorder 
            color={isAudioOn ? "#4ade80" : "#ef4444"}
            speed="5s"
            className="star-button-round"
            onClick={toggleAudio}
            disabled={!myStream}
          >
            {isAudioOn ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 1C10.3431 1 9 2.34315 9 4V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V4C15 2.34315 13.6569 1 12 1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 10V12C19 15.866 15.866 19 12 19M5 10V12C5 15.866 8.13401 19 12 19M12 19V23M8 23H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 9.4V4C15 2.34315 13.6569 1 12 1C10.8224 1 9.80325 1.67852 9.3122 2.66593M12 19V23M8 23H16M3 3L21 21M5.00043 10V12C5.00043 13.3613 5.41496 14.6274 6.12627 15.6787M19.0004 12V10M12.0004 15C13.4031 15 14.6692 14.4722 15.6395 13.6011" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </StarBorder>

          <StarBorder 
            color={isVideoOn ? "#2D8CFF" : "#ef4444"}
            speed="5s"
            className="star-button-round"
            onClick={toggleVideo}
            disabled={!myStream}
          >
            {isVideoOn ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 18H11C12.1046 18 13 17.1046 13 16V8C13 6.89543 12.1046 6 11 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M16 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L16 14M3.5 7L20.5 21M11 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18H11C12.1046 18 13 17.1046 13 16V8C13 6.89543 12.1046 6 11 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </StarBorder>

          <StarBorder 
            color="#ef4444"
            speed="4s"
            className="star-button-round leave-star"
            onClick={leaveCall}
          >
            <MdCallEnd size={24} />
          </StarBorder>
        </div>

        <div className="controls-right">
          <StarBorder color="#fbbf24" speed="6s" className="star-button-round">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </StarBorder>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
