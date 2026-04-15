import crypto from 'crypto'

/**
 * E2EE (End-to-End Encryption) Utilities
 *
 * How it works:
 * 1. Each user generates an RSA key pair (public + private)
 * 2. Public key is stored on server and shared with other users
 * 3. Private key is kept ONLY on the client (never sent to server)
 * 4. To send a message: encrypt with recipient's PUBLIC key
 * 5. To read a message: decrypt with your PRIVATE key
 *
 * This means the server NEVER sees plaintext messages!
 */

/**
 * Generate an RSA key pair for a user
 * Returns { publicKey, privateKey } in PEM format
 */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  })

  return { publicKey, privateKey }
}

/**
 * Encrypt a message using recipient's public key
 * Only the recipient can decrypt this with their private key
 */
export function encryptMessage(message: string, recipientPublicKey: string): string {
  const buffer = Buffer.from(message, 'utf-8')
  const encrypted = crypto.publicEncrypt(
    {
      key: recipientPublicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    buffer
  )
  return encrypted.toString('base64')
}

/**
 * Decrypt a message using your private key
 * Only works if the message was encrypted with your public key
 */
export function decryptMessage(encryptedMessage: string, privateKey: string): string {
  const buffer = Buffer.from(encryptedMessage, 'base64')
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    buffer
  )
  return decrypted.toString('utf-8')
}

/**
 * For longer messages, we use hybrid encryption:
 * 1. Generate a random AES key
 * 2. Encrypt the message with AES (symmetric)
 * 3. Encrypt the AES key with RSA (asymmetric)
 * 4. Send both encrypted key and encrypted message
 */
export function encryptMessageHybrid(
  message: string,
  recipientPublicKey: string
): { encryptedKey: string; encryptedMessage: string; iv: string } {
  // Generate random AES key and IV
  const aesKey = crypto.randomBytes(32) // 256-bit key
  const iv = crypto.randomBytes(16) // 128-bit IV

  // Encrypt message with AES
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv)
  let encrypted = cipher.update(message, 'utf-8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  // Encrypt AES key with RSA
  const encryptedKey = crypto.publicEncrypt(
    {
      key: recipientPublicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    aesKey
  )

  return {
    encryptedKey: encryptedKey.toString('base64'),
    encryptedMessage: encrypted + ':' + authTag.toString('base64'),
    iv: iv.toString('base64')
  }
}

/**
 * Decrypt a hybrid-encrypted message
 */
export function decryptMessageHybrid(
  encryptedKey: string,
  encryptedMessage: string,
  iv: string,
  privateKey: string
): string {
  // Decrypt AES key with RSA
  const aesKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(encryptedKey, 'base64')
  )

  // Split encrypted message and auth tag
  const [encrypted, authTagBase64] = encryptedMessage.split(':')
  const authTag = Buffer.from(authTagBase64, 'base64')

  // Decrypt message with AES
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    aesKey,
    Buffer.from(iv, 'base64')
  )
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'base64', 'utf-8')
  decrypted += decipher.final('utf-8')

  return decrypted
}
