/**
 * Standalone Socket.IO Server for Real-time Messaging
 *
 * Runs on port 3001 alongside the Next.js server on port 3000.
 * This avoids database path issues while providing real-time messaging.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = 3001;

// SSL certificates for HTTPS
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs/server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/server.crt')),
};

// Create HTTPS server with a simple response for certificate acceptance
const server = https.createServer(httpsOptions, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>Kwell Socket.IO Server</title></head>
    <body style="font-family: sans-serif; padding: 40px; text-align: center;">
      <h1>Socket.IO Server Running</h1>
      <p style="color: green; font-size: 24px;">Certificate accepted!</p>
      <p>You can close this tab and return to the chat.</p>
      <p style="color: #888; font-size: 14px;">Real-time messaging is enabled on port ${PORT}</p>
    </body>
    </html>
  `);
});

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Store connected users: { odtId: { socketId, username } }
const connectedUsers = new Map();

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

    console.log(`Message from ${senderName} (${senderId}) to user ${receiverId}`);

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
server.listen(PORT, () => {
  console.log(`Socket.IO server running on https://localhost:${PORT}`);
  console.log('Real-time messaging enabled');
});
