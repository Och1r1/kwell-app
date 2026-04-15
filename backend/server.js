/**
 * Custom Next.js server with Socket.IO for real-time messaging
 *
 * This server runs both Next.js and Socket.IO on the same port.
 * Socket.IO enables real-time message delivery between users.
 */

// Load environment variables first
require('dotenv').config();

const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// SSL certificates for HTTPS
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs/server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/server.crt')),
};

// Store connected users: { odtId: { socketId, username } }
const connectedUsers = new Map();

app.prepare().then(() => {
  // Create HTTPS server
  const server = createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO with CORS
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // User joins with their userId
    socket.on('join', (userData) => {
      const { userId, username } = userData;

      // Store user connection
      connectedUsers.set(userId, {
        socketId: socket.id,
        username: username,
      });

      // Join a room with their userId (for direct messages)
      socket.join(`user_${userId}`);

      console.log(`User ${username} (ID: ${userId}) joined`);

      // Broadcast online users update
      io.emit('users_online', Array.from(connectedUsers.entries()).map(([id, data]) => ({
        userId: id,
        username: data.username,
      })));
    });

    // Handle new message
    socket.on('send_message', (messageData) => {
      const { senderId, senderName, receiverId, content, timestamp } = messageData;

      console.log(`Message from ${senderName} to user ${receiverId}`);

      // Send to receiver's room
      io.to(`user_${receiverId}`).emit('new_message', {
        senderId,
        senderName,
        receiverId,
        content, // This is encrypted!
        timestamp,
        id: Date.now(), // Temporary ID
      });

      // Also confirm to sender
      socket.emit('message_sent', {
        senderId,
        receiverId,
        content,
        timestamp,
        id: Date.now(),
      });
    });

    // Handle typing indicator
    socket.on('typing', ({ senderId, receiverId, isTyping }) => {
      io.to(`user_${receiverId}`).emit('user_typing', {
        userId: senderId,
        isTyping,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Find and remove user
      for (const [userId, data] of connectedUsers.entries()) {
        if (data.socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`User ${data.username} disconnected`);
          break;
        }
      }

      // Broadcast updated online users
      io.emit('users_online', Array.from(connectedUsers.entries()).map(([id, data]) => ({
        userId: id,
        username: data.username,
      })));
    });
  });

  // Start server
  server.listen(port, () => {
    console.log(`> Server ready on https://${hostname}:${port}`);
    console.log(`> Socket.IO enabled for real-time messaging`);
  });
});
