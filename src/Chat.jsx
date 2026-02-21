import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:4000', { autoConnect: false });

function Chat() {
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const messagesEndRef = useRef(null); // Reference to the bottom of the chat

  // Auto-scroll effect. Every time 'messages' updates, scroll to the bottom.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!hasJoined) return;

    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [hasJoined]);

  useEffect(() => {
    if (hasJoined) {
      const connectHandler = () => {
        socket.emit('set_username', username);
      };

      const messageHandler = (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      };

      socket.on('connect', connectHandler);
      socket.on('message', messageHandler);

      return () => {
        socket.off('connect', connectHandler);
        socket.off('message', messageHandler);
      };
    }
  }, [hasJoined, username]);

  const handleJoin = () => {
    if (username.trim()) setHasJoined(true);
  };

  const sendMessage = () => {
    if (input.trim()) {
      const message = { text: input };
      socket.emit('message', message);
      setInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  if (!hasJoined) {
    return (
      <div className="join-container">
        <h1>Join Chat</h1>
        <input
          type="text"
          placeholder="Enter your name..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button onClick={handleJoin}>Join</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <h1>Real-time Chat Box</h1>
      <div className="messages">
        {messages.map((msg) => {
          // Render System Notifications differently
          if (msg.type === 'system' || msg.username === 'System') {
            return (
              <div key={msg.id} className="system-message">
                {msg.text}
              </div>
            );
          }

          // Regular User Messages
          return (
            <div
              key={msg.id}
              className={`message-container ${msg.username === username ? 'my-message' : 'other-message'}`}
            >
              <div className="username">{msg.username}</div>
              <div className="message">{msg.text}</div>
            </div>
          );
        })}
        {/* An invisible element at the bottom to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default Chat;