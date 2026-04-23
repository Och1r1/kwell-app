/**
 * Production server for Render.com deployment
 *
 * Combines Next.js + Socket.IO on a single port
 * Uses HTTP (Render provides HTTPS termination)
 */

require('dotenv').config();

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Listen on all interfaces
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store connected users
const connectedUsers = new Map();

app.prepare().then(() => {
  // Create HTTP server (Render handles HTTPS)
  const server = createServer((req, res) => {
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

    socket.on('join', (userData) => {
      const { userId, username } = userData;
      connectedUsers.set(userId, { socketId: socket.id, username });
      socket.join(`user_${userId}`);
      console.log(`User ${username} (ID: ${userId}) joined`);

      io.emit('users_online', Array.from(connectedUsers.entries()).map(([id, data]) => ({
        userId: id,
        username: data.username,
      })));
    });

    socket.on('send_message', (messageData) => {
      const { senderId, senderName, receiverId, content, timestamp } = messageData;
      console.log(`Message from ${senderName} to user ${receiverId}`);

      io.to(`user_${receiverId}`).emit('new_message', {
        senderId,
        senderName,
        receiverId,
        content,
        timestamp,
        id: Date.now(),
      });

      socket.emit('message_sent', {
        senderId,
        receiverId,
        content,
        timestamp,
        id: Date.now(),
      });
    });

    socket.on('typing', ({ senderId, receiverId, isTyping }) => {
      io.to(`user_${receiverId}`).emit('user_typing', { userId: senderId, isTyping });
    });

    socket.on('disconnect', () => {
      for (const [userId, data] of connectedUsers.entries()) {
        if (data.socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`User ${data.username} disconnected`);
          break;
        }
      }
      io.emit('users_online', Array.from(connectedUsers.entries()).map(([id, data]) => ({
        userId: id,
        username: data.username,
      })));
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Production server ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO enabled for real-time messaging`);
  });
});
