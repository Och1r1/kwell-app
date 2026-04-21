# INFO2222 Phase 3 - Security Implementation Documentation

This document explains all security implementations (Task 1) and vulnerability demonstrations (Task 2) for the video recording.

---

## Table of Contents
1. [How to Run the Project](#how-to-run-the-project)
2. [Task 1: Security Implementations](#task-1-security-implementations)
   - [1.1 Password Hashing (bcrypt + salt)](#11-password-hashing-bcrypt--salt)
   - [1.2 JWT Authentication](#12-jwt-authentication)
   - [1.3 TLS/HTTPS Encryption](#13-tlshttps-encryption)
   - [1.4 End-to-End Encryption (E2EE)](#14-end-to-end-encryption-e2ee)
3. [Task 2: Vulnerability Demonstrations](#task-2-vulnerability-demonstrations)
   - [2.1 Weak Password Storage (MD5)](#21-weak-password-storage-md5)
   - [2.2 SQL Injection](#22-sql-injection)

---

## How to Run the Project

### Prerequisites
- Node.js installed
- Terminal access

### Setup Steps

```bash
# 1. Navigate to backend folder
cd backend

# 2. Run setup script (first time only)
chmod +x setup.sh
./setup.sh

# 3. Start the API server (Terminal 1)
npm run dev:https

# 4. Start Socket.IO server (Terminal 2)
npm run socket
```

### Access the Application
1. Open `https://localhost:3000` in browser → Accept certificate warning
2. Open `https://localhost:3001` in browser → Accept certificate warning
3. Open `Figma_Version/figma.html` in browser

---

# Task 1: Security Implementations

## 1.1 Password Hashing (bcrypt + salt)

### Theory
Passwords should NEVER be stored in plaintext. If a database is breached, attackers can read all passwords directly. Instead, we use:

- **Hashing**: One-way function that converts password to unreadable string
- **Salt**: Random data added to password before hashing (prevents rainbow table attacks)
- **bcrypt**: Industry-standard algorithm with built-in salt and configurable work factor

### File Location
```
backend/app/api/users/register/route.ts
backend/app/api/users/login/route.ts
```

### Code Explanation

**Registration (register/route.ts)** - SECURE VERSION (currently commented out for Task 2 demo):
```typescript
// Generate a unique salt for this user
const salt = crypto.randomBytes(16).toString('hex')

// Hash the password with bcrypt (12 rounds = ~250ms to compute)
const saltedPassword = salt + password
const passwordHash = await bcrypt.hash(saltedPassword, 12)
```

**What this does:**
1. `crypto.randomBytes(16)` - Creates random 16-byte salt unique to each user
2. `salt + password` - Prepends salt to password
3. `bcrypt.hash(..., 12)` - Hashes with 12 rounds (2^12 = 4096 iterations)

**Login (login/route.ts)** - SECURE VERSION:
```typescript
const saltedPassword = user.salt + password
const isPasswordValid = await bcrypt.compare(saltedPassword, user.passwordHash)
```

**What this does:**
1. Retrieves user's unique salt from database
2. Combines salt with entered password
3. bcrypt compares the hash (timing-safe comparison)

### Why This is Secure
- Each user has unique salt → same password = different hash
- bcrypt is slow by design → brute force attacks take years
- Even if database is leaked, passwords cannot be reversed

---

## 1.2 JWT Authentication

### Theory
JWT (JSON Web Token) is a secure way to authenticate users without storing sessions on the server:

- **Stateless**: Server doesn't need to store session data
- **Signed**: Token is cryptographically signed, cannot be forged
- **Self-contained**: Contains user info (id, email) inside the token

### File Location
```
backend/lib/jwt.ts          # JWT generation and verification
backend/lib/auth.ts         # Authentication middleware
```

### Code Explanation

**JWT Generation (jwt.ts):**
```typescript
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}
```

**What this does:**
1. Takes user data (userId, email, username)
2. Signs it with secret key
3. Sets expiration time (24 hours)
4. Returns token string like: `eyJhbGciOiJIUzI1NiIs...`

**Authentication Middleware (auth.ts):**
```typescript
export function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  const decoded = verifyToken(token)
  return decoded // Contains userId, email, username
}
```

**What this does:**
1. Extracts token from `Authorization: Bearer <token>` header
2. Verifies signature using secret key
3. Returns user data if valid, null if invalid/expired

### Why This is Secure
- Token is signed with secret key → cannot be forged
- Expires after 24 hours → limits damage if stolen
- Stateless → no session hijacking possible

---

## 1.3 TLS/HTTPS Encryption

### Theory
TLS (Transport Layer Security) encrypts all data between browser and server:

- **Encryption**: Data is encrypted in transit, cannot be read by eavesdroppers
- **Authentication**: Certificate proves server identity
- **Integrity**: Data cannot be modified in transit

### File Location
```
backend/certs/server.key    # Private key
backend/certs/server.crt    # SSL Certificate
backend/package.json        # HTTPS configuration in scripts
```

### How It's Configured

**package.json script:**
```json
"dev:https": "next dev --experimental-https --experimental-https-key ./certs/server.key --experimental-https-cert ./certs/server.crt"
```

**Socket.IO server (socket-server.js):**
```javascript
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'server.crt'))
}
const server = https.createServer(httpsOptions, ...)
```

### Why This is Secure
- All HTTP traffic is encrypted with TLS 1.3
- Even if network traffic is intercepted, it cannot be read
- Self-signed certificate (for development) - production would use CA-signed

---

## 1.4 End-to-End Encryption (E2EE)

### Theory
E2EE ensures only the sender and recipient can read messages:

- **Server cannot read messages**: Messages are encrypted before leaving the client
- **Hybrid encryption**: RSA for key exchange, AES for message encryption
- **Perfect forward secrecy**: Each message has unique encryption key

### File Locations
```
backend/lib/crypto.ts                    # Server-side key generation
Figma_Version/api-client.js              # Client-side encryption/decryption
backend/app/api/keys/route.ts            # Key management API
```

### How It Works

**Step 1: Key Generation (crypto.ts):**
```typescript
export function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  })
  return { publicKey, privateKey }
}
```
- Generates 2048-bit RSA key pair
- Public key stored on server
- Private key given to user (never stored on server!)

**Step 2: Message Encryption (api-client.js):**
```javascript
async encryptMessage(message, publicKeyPem) {
  // 1. Generate random AES-256 key
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt']
  )

  // 2. Encrypt message with AES
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, aesKey, messageData
  )

  // 3. Encrypt AES key with recipient's RSA public key
  const encryptedKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' }, publicKey, rawAesKey
  )

  return { encryptedKey, encryptedMessage, iv }
}
```

**Step 3: Message Decryption:**
```javascript
async decryptMessage(encrypted, privateKeyPem) {
  // 1. Decrypt AES key with your RSA private key
  const rawAesKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' }, privateKey, encryptedKey
  )

  // 2. Decrypt message with AES key
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, aesKey, encryptedData
  )

  return decodedMessage
}
```

### Why This is Secure
- RSA-2048 + AES-256-GCM = military-grade encryption
- Server only stores encrypted blobs → cannot read messages
- Each message has unique AES key → compromising one doesn't compromise others

---

# Task 2: Vulnerability Demonstrations

## 2.1 Weak Password Storage (MD5)

### Theory
MD5 is a broken hashing algorithm:
- **Fast**: Can compute billions of hashes per second
- **No salt**: Same password = same hash (rainbow tables work)
- **Collisions found**: Multiple inputs can produce same hash

### Vulnerable Code Location
```
backend/app/api/users/register/route.ts  (currently active)
backend/app/api/users/login/route.ts     (currently active)
```

### Vulnerable Code

**Registration (VULNERABLE - currently active):**
```typescript
// VULNERABLE VERSION - MD5
const salt = 'not-used-in-vulnerable-version'
const passwordHash = crypto.createHash('md5').update(password).digest('hex')
```

**Login (VULNERABLE - currently active):**
```typescript
// VULNERABLE VERSION - MD5
const inputHash = crypto.createHash('md5').update(password).digest('hex')
const isPasswordValid = inputHash === user.passwordHash
```

### Attack Scenario - Step by Step

**Step 1: Register a user with a simple password**
1. Open `figma.html` in browser
2. Click "Sign up"
3. Enter:
   - Username: `victim`
   - Email: `victim@test.com`
   - Password: `12345678`
4. Click "Create account"

**Step 2: View the database (attacker has database access)**
```bash
sqlite3 backend/prisma/dev.db "SELECT email, passwordHash FROM User;"
```

**Output:**
```
victim@test.com|25d55ad283aa400af464c76d713c07ad
```

**Step 3: Crack the hash**
1. Go to https://crackstation.net
2. Paste: `25d55ad283aa400af464c76d713c07ad`
3. Click "Crack Hashes"
4. Result: `12345678` - Password revealed!

### Video Script for Demo
1. "First, let me show our database with weak password storage"
2. Show terminal: run the sqlite3 command
3. "As you can see, passwords are stored as MD5 hashes"
4. "An attacker who gains database access can easily crack these"
5. Open CrackStation, paste hash
6. "Within seconds, the password is revealed: 12345678"
7. "This is why we use bcrypt with unique salts in the secure version"

### How to Switch Back to Secure Version
In both `register/route.ts` and `login/route.ts`:
1. Comment out the "VULNERABLE VERSION" code block
2. Uncomment the "SECURE VERSION" code block

---

## 2.2 SQL Injection

### Theory
SQL injection occurs when user input is directly concatenated into SQL queries:
- **No input validation**: User input is trusted
- **String concatenation**: Input becomes part of SQL command
- **Query manipulation**: Attacker can modify query logic

### Vulnerable Code Location
```
backend/app/api/users/login-vulnerable/route.ts
```

### Vulnerable Code
```typescript
// VULNERABLE: Raw SQL with string concatenation
const query = `SELECT * FROM User WHERE email = '${email}' AND passwordHash = '${password}'`

const users = await prisma.$queryRawUnsafe(query)
```

**What's wrong:**
- User input (`email`, `password`) is directly inserted into SQL string
- No escaping or parameterization
- Attacker can inject SQL commands

### Attack Scenario - Step by Step

**Step 1: Show normal login fails**
```bash
curl -k -X POST https://localhost:3000/api/users/login-vulnerable -H "Content-Type: application/json" -d '{"email": "fake@test.com", "password": "wrongpassword"}'
```

**Output:**
```json
{"error":"Invalid email or password"}
```

**Step 2: Perform SQL injection attack**
```bash
curl -k -X POST https://localhost:3000/api/users/login-vulnerable -H "Content-Type: application/json" -d '{"email": "'\'' OR '\''1'\''='\''1'\'' --", "password": "x"}'
```

**Output:**
```json
{
  "message": "Login successful (VULNERABLE ENDPOINT)",
  "warning": "This endpoint is vulnerable to SQL injection!",
  "injectedQuery": "SELECT * FROM User WHERE email = '' OR '1'='1' --' AND passwordHash = 'x'",
  "token": "eyJhbGci...",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

**What happened:**
- Original query: `WHERE email = 'input' AND passwordHash = 'input'`
- Injected query: `WHERE email = '' OR '1'='1' --' AND passwordHash = 'x'`
- `OR '1'='1'` is always true → returns all users
- `--` comments out the rest → password check bypassed
- Attacker logs in as first user without knowing password!

### Video Script for Demo
1. "Now let me demonstrate SQL injection"
2. "First, a normal login attempt with wrong credentials"
3. Run first curl command → shows "Invalid email or password"
4. "Now, let's inject malicious SQL"
5. Run second curl command
6. "Look at the response - Login successful!"
7. "The injected query shows how our input manipulated the SQL"
8. Point to `' OR '1'='1' --` in the query
9. "We logged in as 'testuser' without knowing their password"
10. "This is why we use parameterized queries in the secure version"

### Why Secure Version is Safe
The secure login (`/api/users/login`) uses Prisma ORM:
```typescript
const user = await prisma.user.findUnique({
  where: { email }  // Parameterized - cannot be injected
})
```
Prisma automatically escapes all inputs → SQL injection impossible.

---

# Summary

| Task | Security Feature | Implementation | File Location |
|------|-----------------|----------------|---------------|
| 1.1 | Password Hashing | bcrypt + unique salt | `register/route.ts`, `login/route.ts` |
| 1.2 | Authentication | JWT tokens | `lib/jwt.ts`, `lib/auth.ts` |
| 1.3 | Transport Security | TLS/HTTPS | `certs/`, `package.json` |
| 1.4 | Message Privacy | E2EE (RSA + AES) | `lib/crypto.ts`, `api-client.js` |
| 2.1 | Vulnerability Demo | Weak MD5 hashing | `register/route.ts` (vulnerable version) |
| 2.2 | Vulnerability Demo | SQL Injection | `login-vulnerable/route.ts` |

---

# After Recording: Restore Secure Versions

After finishing the video, restore the secure code:

**1. Password Hashing - Edit both files:**
- `backend/app/api/users/register/route.ts`
- `backend/app/api/users/login/route.ts`

Comment out "VULNERABLE VERSION", uncomment "SECURE VERSION"

**2. SQL Injection endpoint:**
- Can be deleted or left as-is (it's a separate endpoint)
- The main `/api/users/login` is still secure

---

*Document created for INFO2222 Phase 3 - Group 03*
