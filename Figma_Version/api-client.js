/**
 * Kwell API Client
 * Handles all communication with the backend server
 *
 * Security features:
 * - HTTPS for secure transmission
 * - JWT tokens for authentication
 * - E2EE for message encryption/decryption
 */

// ============================================================
// DEPLOYMENT CONFIG
// ============================================================
// For local development: const API_BASE_URL = 'https://localhost:3000/api';
// For production:
const API_BASE_URL = 'https://kwell-app.onrender.com/api';

// ============================================================
// Session Management (JWT Token Storage)
// ============================================================

const Session = {
  /**
   * Store user session after login
   * @param {Object} data - Login response data
   */
  save(data) {
    // Store JWT token securely
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('user', JSON.stringify(data.user));
  },

  /**
   * Get the current JWT token
   * @returns {string|null}
   */
  getToken() {
    return sessionStorage.getItem('token');
  },

  /**
   * Get current user info
   * @returns {Object|null}
   */
  getUser() {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Check if user is logged in
   * @returns {boolean}
   */
  isLoggedIn() {
    return !!this.getToken();
  },

  /**
   * Clear session (logout)
   */
  clear() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    // Also clear private key if stored
    sessionStorage.removeItem('privateKey');
  },

  /**
   * Store private key for E2EE (IMPORTANT: Only in sessionStorage, never localStorage!)
   * @param {string} privateKey - PEM formatted private key
   */
  savePrivateKey(privateKey) {
    sessionStorage.setItem('privateKey', privateKey);
  },

  /**
   * Store a sent message locally so sender can read it later
   * @param {number} recipientId - Who the message was sent to
   * @param {string} encryptedContent - The encrypted content (for matching)
   * @param {string} plaintext - The original plaintext message
   */
  saveSentMessage(recipientId, encryptedContent, plaintext) {
    const key = 'sentMessages';
    const existing = JSON.parse(localStorage.getItem(key) || '{}');

    // Use a hash of the encrypted content as the key
    const msgKey = btoa(encryptedContent).substring(0, 50);
    existing[msgKey] = {
      recipientId,
      plaintext,
      timestamp: Date.now()
    };

    localStorage.setItem(key, JSON.stringify(existing));
  },

  /**
   * Get plaintext of a sent message by its encrypted content
   * @param {string} encryptedContent - The encrypted content to look up
   * @returns {string|null} - The plaintext or null if not found
   */
  getSentMessage(encryptedContent) {
    const key = 'sentMessages';
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    const msgKey = btoa(encryptedContent).substring(0, 50);
    return existing[msgKey]?.plaintext || null;
  },

  /**
   * Get private key for decryption
   * @returns {string|null}
   */
  getPrivateKey() {
    return sessionStorage.getItem('privateKey');
  }
};

// ============================================================
// HTTP Helper Functions
// ============================================================

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/users/login')
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>}
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Add auth header if we have a token
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const token = Session.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data;
  } catch (error) {
    // Handle network errors (e.g., self-signed cert warning)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running and you\'ve accepted the certificate.');
    }
    throw error;
  }
}

// ============================================================
// Authentication API
// ============================================================

const AuthAPI = {
  /**
   * Register a new user
   * @param {string} username - Display name
   * @param {string} email - Email address
   * @param {string} password - Password
   * @returns {Promise<Object>}
   */
  async register(username, email, password) {
    return apiRequest('/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
  },

  /**
   * Login user
   * @param {string} email - Email address
   * @param {string} password - Password
   * @returns {Promise<Object>}
   */
  async login(email, password) {
    const data = await apiRequest('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    // Save session on successful login
    Session.save(data);
    return data;
  },

  /**
   * Logout user
   */
  logout() {
    Session.clear();
  }
};

// ============================================================
// Key Management API (for E2EE)
// ============================================================

const KeysAPI = {
  /**
   * Generate a new key pair for the current user
   * The private key is returned ONCE and must be stored client-side
   * @returns {Promise<Object>} - { publicKey, privateKey }
   */
  async generateKeyPair() {
    const data = await apiRequest('/keys', {
      method: 'POST'
    });

    // Store private key in session (WARNING: This is cleared on browser close!)
    Session.savePrivateKey(data.privateKey);

    return data;
  },

  /**
   * Get a user's public key for encrypting messages to them
   * @param {number} userId - User ID to get public key for
   * @returns {Promise<Object>} - { userId, username, publicKey }
   */
  async getPublicKey(userId) {
    return apiRequest(`/keys?userId=${userId}`);
  }
};

// ============================================================
// Users API
// ============================================================

const UsersAPI = {
  /**
   * Get all users
   * @returns {Promise<Array>}
   */
  async getAll() {
    return apiRequest('/users');
  },

  /**
   * Get a specific user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object>}
   */
  async getById(id) {
    return apiRequest(`/users/${id}`);
  }
};

// ============================================================
// Messages API
// ============================================================

const MessagesAPI = {
  /**
   * Send a message (encrypted)
   * @param {number} receiverId - Recipient's user ID
   * @param {string} content - Message content (will be encrypted)
   * @returns {Promise<Object>}
   */
  async send(receiverId, content) {
    return apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, content })
    });
  },

  /**
   * Get messages for current user
   * @param {string} type - 'received', 'sent', or 'all' (default: 'all')
   * @returns {Promise<Object>} - { messages: [...] }
   */
  async get(type = 'all') {
    return apiRequest(`/messages?type=${type}`);
  },

  /**
   * Get conversation with a specific user
   * @param {number} userId - The other user's ID
   * @returns {Promise<Object>} - { messages: [...] }
   */
  async getConversation(userId) {
    return apiRequest(`/messages?withUser=${userId}`);
  }
};

// ============================================================
// Tasks API
// ============================================================

const TasksAPI = {
  /**
   * Get all tasks
   * @param {Object} filters - Optional filters { status, assignedTo }
   * @returns {Promise<Object>} - { tasks: [...] }
   */
  async getAll(filters = {}) {
    let query = '';
    if (filters.status) query += `status=${filters.status}&`;
    if (filters.assignedTo) query += `assignedTo=${filters.assignedTo}&`;
    return apiRequest(`/tasks${query ? '?' + query : ''}`);
  },

  /**
   * Create a new task
   * @param {Object} task - { title, description, deadline, estimatedHours, priority, requiredSkills, assignedToId }
   * @returns {Promise<Object>}
   */
  async create(task) {
    return apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
  },

  /**
   * Update a task
   * @param {number} id - Task ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>}
   */
  async update(id, updates) {
    return apiRequest('/tasks', {
      method: 'PUT',
      body: JSON.stringify({ id, ...updates })
    });
  },

  /**
   * Delete a task
   * @param {number} id - Task ID
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return apiRequest(`/tasks?id=${id}`, {
      method: 'DELETE'
    });
  }
};

// ============================================================
// Team API
// ============================================================

const TeamAPI = {
  /**
   * Get all team members with skills and workload
   * @returns {Promise<Object>} - { members: [...] }
   */
  async getMembers() {
    return apiRequest('/team');
  }
};

// ============================================================
// Profile API
// ============================================================

const ProfileAPI = {
  /**
   * Get current user's profile
   * @returns {Promise<Object>}
   */
  async get() {
    return apiRequest('/users/profile');
  },

  /**
   * Update current user's profile
   * @param {Object} updates - { role, status, skills }
   * @returns {Promise<Object>}
   */
  async update(updates) {
    return apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  /**
   * Add a skill to current user
   * @param {string} skill - Skill name
   * @returns {Promise<Object>}
   */
  async addSkill(skill) {
    const profile = await this.get();
    const skills = profile.skills || [];
    if (!skills.includes(skill)) {
      skills.push(skill);
    }
    return this.update({ skills });
  },

  /**
   * Remove a skill from current user
   * @param {string} skill - Skill name
   * @returns {Promise<Object>}
   */
  async removeSkill(skill) {
    const profile = await this.get();
    const skills = (profile.skills || []).filter(s => s !== skill);
    return this.update({ skills });
  }
};

// ============================================================
// AI Delegate API
// ============================================================

const AIDelegateAPI = {
  /**
   * Generate AI task delegation suggestions
   * @param {Object} options - { taskIds, sortBy }
   * @returns {Promise<Object>} - { suggestion, assignments, tasks, members }
   */
  async generateSuggestions(options = {}) {
    return apiRequest('/ai-delegate', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  },

  /**
   * Apply AI suggestions (assign tasks to members)
   * @param {Array} assignments - [{ taskId, memberId }, ...]
   * @returns {Promise<Object>}
   */
  async applySuggestions(assignments) {
    return apiRequest('/ai-delegate', {
      method: 'PUT',
      body: JSON.stringify({ assignments })
    });
  }
};

// ============================================================
// Dashboard API
// ============================================================

const DashboardAPI = {
  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} - { stats, activeTasks }
   */
  async getStats() {
    return apiRequest('/dashboard');
  }
};

// ============================================================
// Contribution API
// ============================================================

const ContributionAPI = {
  /**
   * Get contribution statistics for all team members
   * @returns {Promise<Object>} - { members, summary }
   */
  async getStats() {
    return apiRequest('/contribution');
  }
};

// ============================================================
// Channels API (Group Chat)
// ============================================================

const ChannelsAPI = {
  /**
   * Get messages for a channel
   * @param {string} channel - Channel name (general, coding, design, meetings)
   * @returns {Promise<Object>} - { messages: [...] }
   */
  async getMessages(channel) {
    return apiRequest(`/channels?channel=${channel}`);
  },

  /**
   * Send a message to a channel
   * @param {string} channel - Channel name
   * @param {string} content - Message content
   * @returns {Promise<Object>}
   */
  async sendMessage(channel, content) {
    return apiRequest('/channels', {
      method: 'POST',
      body: JSON.stringify({ channel, content })
    });
  }
};

// ============================================================
// E2EE Encryption (Client-Side using Web Crypto API)
// ============================================================

const Crypto = {
  /**
   * Import a PEM public key for encryption
   * @param {string} pemKey - PEM formatted public key
   * @returns {Promise<CryptoKey>}
   */
  async importPublicKey(pemKey) {
    // Remove PEM headers and convert to binary
    const pemContents = pemKey
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    return window.crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      false,
      ['encrypt']
    );
  },

  /**
   * Import a PEM private key for decryption
   * @param {string} pemKey - PEM formatted private key
   * @returns {Promise<CryptoKey>}
   */
  async importPrivateKey(pemKey) {
    // Remove PEM headers and convert to binary
    const pemContents = pemKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    return window.crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      false,
      ['decrypt']
    );
  },

  /**
   * Encrypt a message using recipient's public key
   * Uses hybrid encryption for longer messages:
   * 1. Generate random AES key
   * 2. Encrypt message with AES
   * 3. Encrypt AES key with RSA
   *
   * @param {string} message - Plaintext message
   * @param {string} publicKeyPem - Recipient's public key (PEM)
   * @returns {Promise<Object>} - { encryptedKey, encryptedMessage, iv }
   */
  async encryptMessage(message, publicKeyPem) {
    const publicKey = await this.importPublicKey(publicKeyPem);

    // Generate random AES key
    const aesKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt message with AES
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      messageData
    );

    // Export AES key and encrypt with RSA
    const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
    const encryptedKey = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      rawAesKey
    );

    // Convert to base64 for transmission
    return {
      encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedKey))),
      encryptedMessage: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
      iv: btoa(String.fromCharCode(...iv))
    };
  },

  /**
   * Decrypt a message using your private key
   * @param {Object} encrypted - { encryptedKey, encryptedMessage, iv }
   * @param {string} privateKeyPem - Your private key (PEM)
   * @returns {Promise<string>} - Decrypted message
   */
  async decryptMessage(encrypted, privateKeyPem) {
    const privateKey = await this.importPrivateKey(privateKeyPem);

    // Convert from base64
    const encryptedKey = Uint8Array.from(atob(encrypted.encryptedKey), c => c.charCodeAt(0));
    const encryptedData = Uint8Array.from(atob(encrypted.encryptedMessage), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));

    // Decrypt AES key with RSA
    const rawAesKey = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedKey
    );

    // Import AES key
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      rawAesKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt message with AES
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }
};

// ============================================================
// Helper Functions for UI Integration
// ============================================================

/**
 * Send an encrypted message to another user
 * @param {number} receiverId - Recipient's user ID
 * @param {string} plaintext - Message to send
 * @returns {Promise<Object>}
 */
async function sendSecureMessage(receiverId, plaintext) {
  // Get recipient's public key
  const { publicKey } = await KeysAPI.getPublicKey(receiverId);

  // Encrypt the message client-side
  const encrypted = await Crypto.encryptMessage(plaintext, publicKey);

  // Send encrypted message to server
  // The server stores it without being able to read it!
  return MessagesAPI.send(receiverId, JSON.stringify(encrypted));
}

/**
 * Decrypt a received message
 * @param {string} encryptedContent - JSON string of encrypted message
 * @returns {Promise<string>} - Decrypted plaintext
 */
async function decryptReceivedMessage(encryptedContent) {
  const privateKey = Session.getPrivateKey();
  if (!privateKey) {
    throw new Error('No private key available. Please generate your keys first.');
  }

  const encrypted = JSON.parse(encryptedContent);
  return Crypto.decryptMessage(encrypted, privateKey);
}

// Export for use in other scripts
window.KwellAPI = {
  Session,
  AuthAPI,
  KeysAPI,
  UsersAPI,
  MessagesAPI,
  ChannelsAPI,
  TasksAPI,
  TeamAPI,
  ProfileAPI,
  AIDelegateAPI,
  DashboardAPI,
  ContributionAPI,
  Crypto,
  sendSecureMessage,
  decryptReceivedMessage
};

console.log('Kwell API Client loaded. Access via window.KwellAPI');
