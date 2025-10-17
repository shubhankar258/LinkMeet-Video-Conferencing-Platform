import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import SpotlightCard from "../components/SpotlightCard";
import CardNav from "../components/CardNav";
import Hyperspeed from "../components/Hyperspeed";
import "../styles/Lobby.css";

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { room } = data;
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  // Logo SVG as data URL
  const logoDataUrl = "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='40' height='40' rx='8' fill='%232D8CFF'/%3E%3Cpath d='M12 20C12 15.5817 15.5817 12 20 12C24.4183 12 28 15.5817 28 20C28 24.4183 24.4183 28 20 28C15.5817 28 12 24.4183 12 20Z' fill='white'/%3E%3Ccircle cx='20' cy='20' r='3' fill='%232D8CFF'/%3E%3C/svg%3E";

  const navItems = [
    {
      label: 'Features',
      bgColor: '#667eea',
      textColor: 'white',
      links: [
        { label: 'HD Video Calls', href: '#video' },
        { label: 'Screen Sharing', href: '#screen' },
        { label: 'Chat Messaging', href: '#chat' }
      ]
    },
    {
      label: 'Resources',
      bgColor: '#764ba2',
      textColor: 'white',
      links: [
        { label: 'Documentation', href: '#docs' },
        { label: 'API Reference', href: '#api' },
        { label: 'Support', href: '#support' }
      ]
    },
    {
      label: 'Company',
      bgColor: '#f093fb',
      textColor: 'white',
      links: [
        { label: 'About Us', href: '#about' },
        { label: 'Contact', href: '#contact' },
        { label: 'Careers', href: '#careers' }
      ]
    }
  ];

  return (
    <div className="lobby-container">
        <Hyperspeed />
      <CardNav
        logo={logoDataUrl}
        logoAlt="LinkMeet Logo"
        items={navItems}
        baseColor="rgba(255, 255, 255, 0.95)"
        menuColor="#667eea"
        buttonBgColor="#667eea"
        buttonTextColor="white"
        onGetStarted={() => console.log('Get Started clicked')}
      />

      <div className="lobby-content">
        <SpotlightCard className="lobby-spotlight-card" spotlightColor="rgba(102, 126, 234, 0.4)">
          <div className="card-header">
            <h2>Join a Meeting</h2>
            <p>Enter your details to join or create a room</p>
          </div>

          <form onSubmit={handleSubmitForm} className="lobby-form">
            <div className="form-group">
              <label htmlFor="email">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M2.5 6.66667L9.0755 11.0504C9.63533 11.4236 10.3647 11.4236 10.9245 11.0504L17.5 6.66667M4.16667 15.8333H15.8333C16.7538 15.8333 17.5 15.0871 17.5 14.1667V5.83333C17.5 4.91286 16.7538 4.16667 15.8333 4.16667H4.16667C3.24619 4.16667 2.5 4.91286 2.5 5.83333V14.1667C2.5 15.0871 3.24619 15.8333 4.16667 15.8333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="room">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5.83333 9.16667H14.1667M5.83333 9.16667C4.91286 9.16667 4.16667 8.42047 4.16667 7.5V4.16667C4.16667 3.24619 4.91286 2.5 5.83333 2.5H14.1667C15.0871 2.5 15.8333 3.24619 15.8333 4.16667V7.5C15.8333 8.42047 15.0871 9.16667 14.1667 9.16667M5.83333 9.16667V15.8333C5.83333 16.7538 6.57953 17.5 7.5 17.5H12.5C13.4205 17.5 14.1667 16.7538 14.1667 15.8333V9.16667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Room Code
              </label>
              <input
                type="text"
                id="room"
                placeholder="Enter room code"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="join-button">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 10C15 12.7614 12.7614 15 10 15M15 10C15 7.23858 12.7614 5 10 5M15 10H17.5M10 15C7.23858 15 5 12.7614 5 10M10 15V17.5M5 10C5 7.23858 7.23858 5 10 5M5 10H2.5M10 5V2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Join Room
            </button>
          </form>
        </SpotlightCard>
      </div>
    </div>
  );
};

export default LobbyScreen;
