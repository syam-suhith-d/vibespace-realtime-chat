const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// This is used for running the website initially on local system 
// const io = new Server(server, {
//   cors: {
//     // ✅ CORRECTED PORT NUMBER TO 5173
//     origin: ["http://localhost:5173", "http://192.168.0.104:5173"],
//     methods: ["GET", "POST"],
//   },
// });

// Updated for live deployment 
const io = new Server(server, {
  cors: {
    origin: "*", // Allows your future Vercel site to connect
    methods: ["GET", "POST"],
  },
});

io.on('connection', (socket) => {
  console.log('[DEBUG] A user connected with socket ID:', socket.id);

socket.on('set_username', (username) => {
    try {
      console.log(`[DEBUG] Received 'set_username' event with name: "${username}"`);
      socket.username = username;
      console.log(`[DEBUG] Successfully set username for ${socket.id}`);

      // Tell everyone ELSE that this user joined
      socket.broadcast.emit('message', {
        text: `${username} joined the chat 👋`,
        username: 'System',
        id: Date.now(),
        type: 'system' // We add a custom type to style it differently in React
      });
    } catch (error) {
      console.error('[FATAL ERROR] in "set_username" handler:', error);
    }
  });

  socket.on('message', (message) => {
    console.log('[DEBUG] Received "message" event.');
    try {
      if (!socket.username) {
        console.log('[DEBUG] Message received from user without a username. Ignoring.');
        return;
      }
      if (!message || typeof message.text === 'undefined') {
          console.error('[ERROR] Received an invalid message object:', message);
          return;
      }
      console.log(`[DEBUG] Processing message: "${message.text}" from user: ${socket.username}`);
      const messageWithUser = {
        text: message.text,
        username: socket.username,
        id: Date.now(),
      };
      io.emit('message', messageWithUser);
      console.log('[DEBUG] Broadcasted message to all clients.');
    } catch (error) {
      console.error('[FATAL ERROR] in "message" handler:', error);
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      console.log(`[DEBUG] ${socket.username} disconnected.`);
      
      // Tell EVERYONE that this user left
      io.emit('message', {
        text: `${socket.username} left the chat 🚪`,
        username: 'System',
        id: Date.now(),
        type: 'system'
      });
    }
  });

  // Handle typing events
  socket.on('typing', (isTyping) => {
    if (!socket.username) return;
    
    // socket.broadcast sends it to everyone ELSE, not the sender
    socket.broadcast.emit('user_typing', {
      username: socket.username,
      isTyping: isTyping
    });
  });

  
});

// This is used for running the website initially on local system 
// server.listen(4000, '0.0.0.0', () => {
//   console.log('✅ Server running on http://YOUR_IP:4000');
// });

// Updated for live deployment 
// Uses the cloud provider's port, or 4000 if running locally
const PORT = process.env.PORT || 4000; 

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});