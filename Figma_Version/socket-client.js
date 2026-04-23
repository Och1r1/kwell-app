/**
 * Socket.IO Client for Real-time Messaging
 *
 * Handles WebSocket connections for instant message delivery.
 * Works alongside the API client for E2EE messaging.
 */

// Socket.IO CDN (we'll load this dynamically)
const SOCKET_IO_CDN = 'https://cdn.socket.io/4.7.4/socket.io.min.js';

// ============================================================
// DEPLOYMENT CONFIG - Change this URL after deploying to Render
// ============================================================
// For local development (separate socket server):
// const SOCKET_URL = 'https://localhost:3001';
// For Render.com deployment (same server as API, replace with your URL):
const SOCKET_URL = 'https://localhost:3001';
// Example: const SOCKET_URL = 'https://kwell-backend.onrender.com';

let socket = null;
let isConnected = false;

/**
 * Load Socket.IO library from CDN
 */
function loadSocketIO() {
  return new Promise((resolve, reject) => {
    if (window.io) {
      resolve(window.io);
      return;
    }

    const script = document.createElement('script');
    script.src = SOCKET_IO_CDN;
    script.onload = () => resolve(window.io);
    script.onerror = () => reject(new Error('Failed to load Socket.IO'));
    document.head.appendChild(script);
  });
}

/**
 * Initialize Socket.IO connection
 * Call this after user logs in
 */
async function initializeSocket() {
  if (socket && isConnected) {
    console.log('Socket already connected');
    return socket;
  }

  try {
    const io = await loadSocketIO();

    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      secure: true,
      rejectUnauthorized: false, // Allow self-signed cert
    });

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      isConnected = true;

      // Join with user info
      const user = window.KwellAPI?.Session?.getUser();
      if (user) {
        socket.emit('join', {
          userId: user.id,
          username: user.username,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      isConnected = false;
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Message events
    socket.on('new_message', handleIncomingMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('users_online', handleUsersOnline);
    socket.on('user_typing', handleUserTyping);

    return socket;

  } catch (error) {
    console.error('Failed to initialize socket:', error);
    return null;
  }
}

/**
 * Handle incoming message from another user
 */
async function handleIncomingMessage(data) {
  console.log('Received message:', data);

  const { senderId, senderName, content, timestamp } = data;

  // Always show notification
  if (typeof showToast === 'function') {
    showToast(`New message from ${senderName}`);
  }

  // Check if we're chatting with this user
  const currentChatUser = window.selectedUserId;
  console.log('Current chat user:', currentChatUser, 'Message from:', senderId);

  if (currentChatUser === senderId) {
    try {
      // Decrypt the message
      let plaintext = content;
      if (content && content.startsWith('{')) {
        const privateKey = window.KwellAPI?.Session?.getPrivateKey();
        if (privateKey) {
          const encrypted = JSON.parse(content);
          plaintext = await window.KwellAPI.Crypto.decryptMessage(encrypted, privateKey);
        } else {
          plaintext = '[Encrypted - no private key]';
        }
      }

      // Add to UI using the global function
      if (typeof addMessageToUI === 'function') {
        addMessageToUI(plaintext, false, new Date(timestamp || Date.now()));
      } else {
        console.error('addMessageToUI function not found');
      }

    } catch (error) {
      console.error('Failed to decrypt message:', error);
      if (typeof addMessageToUI === 'function') {
        addMessageToUI('[Decryption failed]', false, new Date());
      }
    }
  }
  // Notification already shown at the top
}

/**
 * Handle confirmation that our message was sent
 */
function handleMessageSent(data) {
  console.log('Message sent confirmation:', data);
  // Message already added to UI when sent
}

/**
 * Handle online users update
 */
function handleUsersOnline(users) {
  console.log('Online users:', users);

  // Update UI to show who's online
  const onlineUserIds = users.map(u => u.userId);

  // Add online indicator to user list
  document.querySelectorAll('.online-user').forEach(el => {
    const userId = el.dataset?.userId;
    if (userId && onlineUserIds.includes(parseInt(userId))) {
      el.classList.add('is-online');
    } else {
      el.classList.remove('is-online');
    }
  });
}

/**
 * Handle typing indicator
 */
function handleUserTyping(data) {
  const { userId, isTyping } = data;

  if (window.selectedUserId === userId) {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.style.display = isTyping ? 'block' : 'none';
    }
  }
}

/**
 * Send a message via Socket.IO (for real-time delivery)
 * Also saves to database via API
 */
async function sendMessageViaSocket(receiverId, encryptedContent) {
  const user = window.KwellAPI?.Session?.getUser();
  if (!user || !socket || !isConnected) {
    console.warn('Cannot send via socket - not connected');
    return false;
  }

  socket.emit('send_message', {
    senderId: user.id,
    senderName: user.username,
    receiverId: receiverId,
    content: encryptedContent, // Already encrypted JSON string
    timestamp: new Date().toISOString(),
  });

  return true;
}

/**
 * Send typing indicator
 */
function sendTypingIndicator(receiverId, isTyping) {
  const user = window.KwellAPI?.Session?.getUser();
  if (!user || !socket || !isConnected) return;

  socket.emit('typing', {
    senderId: user.id,
    receiverId: receiverId,
    isTyping: isTyping,
  });
}

/**
 * Disconnect socket (call on logout)
 */
function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
  }
}

// Export functions
window.SocketClient = {
  initialize: initializeSocket,
  sendMessage: sendMessageViaSocket,
  sendTyping: sendTypingIndicator,
  disconnect: disconnectSocket,
  isConnected: () => isConnected,
};

console.log('Socket Client loaded. Access via window.SocketClient');
