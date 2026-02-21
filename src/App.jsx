import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:4000', { autoConnect: false });

function Chat() {
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  // State to keep track of users who are currently typing
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null); // Keeps track of our 2-second timer
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]); // Scroll down if messages OR typing indicator appears

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

      // Listen for typing events from the server
      const typingHandler = ({ username: typingUsername, isTyping }) => {
        setTypingUsers((prev) => {
          if (isTyping) {
            // Add user to the array if they aren't already in it
            if (!prev.includes(typingUsername)) return [...prev, typingUsername];
            return prev;
          } else {
            // Remove user from the array if they stopped typing
            return prev.filter((u) => u !== typingUsername);
          }
        });
      };

      socket.on('connect', connectHandler);
      socket.on('message', messageHandler);
      socket.on('user_typing', typingHandler); // Add the listener

      return () => {
        socket.off('connect', connectHandler);
        socket.off('message', messageHandler);
        socket.off('user_typing', typingHandler); // Cleanup
      };
    }
  }, [hasJoined, username]);

  const handleJoin = () => {
    if (username.trim()) setHasJoined(true);
  };

  // Handle what happens when we type in the input box
  const handleInputChange = (e) => {
    setInput(e.target.value);

    // Tell server we are typing
    socket.emit('typing', true);

    // Clear the previous timer if we are still typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set a new 2-second timer. If we stop typing for 2 seconds, tell server we stopped.
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', false);
    }, 2000);
  };

  const sendMessage = () => {
    if (input.trim()) {
      const message = { text: input };
      socket.emit('message', message);
      setInput('');
      
      // Tell server we stopped typing immediately after sending
      socket.emit('typing', false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        />
        <button onClick={handleJoin}>Join</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <h1> Vibe Space Chatter </h1>
        <p style={{ display: 'flex', justifyContent: 'center', fontSize: '0.85rem', color: '#666', fontWeight: 'normal' }}>
          (Real-time Chat Box)
        </p>
      <div className="messages">
        {messages.map((msg) => {
          if (msg.type === 'system' || msg.username === 'System') {
            return (
              <div key={msg.id} className="system-message">
                {msg.text}
              </div>
            );
          }

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
        
        {/* Render the typing indicator just above the bottom */}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        {/* Swapped onChange to use our new handleInputChange function */}
        <input
          type="text"
          value={input}
          onChange={handleInputChange} 
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default Chat;