# Server Authentication on Login

This document explains the server authentication implementation for INFO2222 Phase 3, specifically addressing:
- (a) Client verification of the server's certificate before transmitting credentials
- (b) Hardcoded CA public key and its security implications

---

## Table of Contents
1. [Overview](#overview)
2. [How to Test Server Authentication](#how-to-test-server-authentication)
3. [Implementation Details](#implementation-details)
   - [3.1 Client-Side Certificate Verification](#31-client-side-certificate-verification)
   - [3.2 Hardcoded CA Public Key (Certificate Pinning)](#32-hardcoded-ca-public-key-certificate-pinning)
   - [3.3 Server Certificate Endpoint](#33-server-certificate-endpoint)
4. [Certificate Generation Process](#certificate-generation-process)
5. [Security Implications of Hardcoded CA](#security-implications-of-hardcoded-ca)
6. [Code Walkthrough](#code-walkthrough)

---

## Overview

Server authentication ensures the client is communicating with the legitimate server before sending any sensitive data (credentials). This prevents Man-in-the-Middle (MITM) attacks where an attacker could:
1. Intercept the connection between client and server
2. Present a fraudulent certificate
3. Capture the user's credentials

Our implementation uses **certificate pinning** - the client has the CA's public key hardcoded and verifies the server's certificate against it before transmitting any credentials.

---

## How to Test Server Authentication

### Prerequisites
- Backend server running with HTTPS enabled
- Browser console open (F12 → Console tab)

### Test Steps

**Step 1: Open the application**
```
Open Figma_Version/figma.html in your browser
Open browser console (F12 → Console)
```

**Step 2: Manually verify server certificate**
```javascript
// In browser console:
await KwellAPI.ServerAuth.verifyServerCertificate()
```

**Expected output:**
```javascript
{
  verified: true,
  serverCert: "-----BEGIN CERTIFICATE-----..."
}
```

**Step 3: Test login with certificate verification**
```javascript
// The login automatically verifies server certificate first
await KwellAPI.AuthAPI.login("test@example.com", "password123")
```

**Console output shows:**
```
[AuthAPI] Server not verified, performing certificate verification...
[ServerAuth] Starting server certificate verification...
[ServerAuth] CA certificate verified successfully
[ServerAuth] Server certificate chain verified successfully
[AuthAPI] Server certificate verified, proceeding with login
```

**Step 4: Demonstrate failed verification (simulated attack)**
```javascript
// Temporarily modify the trusted CA (simulates receiving wrong cert)
const originalCA = KwellAPI.TRUSTED_CA_PUBLIC_KEY;
// This would fail if the server presented a different CA
```

---

## Implementation Details

### 3.1 Client-Side Certificate Verification

**File Location:**
```
Figma_Version/api-client.js
```

**How it works:**

Before the login function sends any credentials, it MUST verify the server's identity:

```javascript
async login(email, password) {
  // Step 1: Verify server certificate BEFORE sending credentials
  if (!ServerAuth.isServerVerified()) {
    console.log('[AuthAPI] Server not verified, performing certificate verification...');
    const verification = await ServerAuth.verifyServerCertificate();

    if (!verification.verified) {
      // CRITICAL: Do NOT send credentials if server cannot be verified
      throw new Error(`Server authentication failed: ${verification.error}`);
    }
  }

  // Step 2: Only now send credentials to the verified server
  const data = await apiRequest('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  return data;
}
```

**Key points:**
1. Certificate verification happens BEFORE any credentials are transmitted
2. If verification fails, the login is aborted immediately
3. Credentials are never sent to an unverified server

---

### 3.2 Hardcoded CA Public Key (Certificate Pinning)

**File Location:**
```
Figma_Version/api-client.js
```

The CA public key is embedded directly in the client code:

```javascript
const TRUSTED_CA_PUBLIC_KEY = `-----BEGIN CERTIFICATE-----
MIIFpTCCA42gAwIBAgIUPC71aFKOeQoaFdQYDzQhUsqsoIYwDQYJKoZIhvcNAQEL
BQAwYjELMAkGA1UEBhMCQVUxDDAKBgNVBAgMA05TVzEPMA0GA1UEBwwGU3lkbmV5
MQ4wDAYDVQQKDAVLd2VsbDERMA8GA1UECwwIU2VjdXJpdHkxETAPBgNVBAMMCEt3
ZWxsIENBMB4XDTI2MDQxNDEyMTkzN1oXDTI3MDQxNDEyMTkzN1owYjELMAkGA1UE
BhMCQVUxDDAKBgNVBAgMA05TVzEPMA0GA1UEBwwGU3lkbmV5MQ4wDAYDVQQKDAVL
d2VsbDERMA8GA1UECwwIU2VjdXJpdHkxETAPBgNVBAMMCEt3ZWxsIENBMIICIjAN
...
-----END CERTIFICATE-----`;
```

**Verification Process:**

```javascript
verifyCACertificate(receivedCACert) {
  // Normalize both certificates (remove whitespace differences)
  const normalizedTrusted = TRUSTED_CA_PUBLIC_KEY.replace(/\s/g, '');
  const normalizedReceived = receivedCACert.replace(/\s/g, '');

  // Compare the certificates
  const match = normalizedTrusted === normalizedReceived;

  if (!match) {
    console.error('[ServerAuth] CA certificate mismatch detected!');
    console.error('[ServerAuth] This could indicate a Man-in-the-Middle attack');
  }

  return match;
}
```

---

### 3.3 Server Certificate Endpoint

**File Location:**
```
backend/app/api/certificate/route.ts
```

The server exposes an endpoint that returns its certificate chain:

```typescript
export async function GET() {
  // Read the server certificate
  const certPath = path.join(process.cwd(), 'certs', 'server.crt')
  const serverCert = fs.readFileSync(certPath, 'utf8')

  // Read the CA certificate (for chain verification)
  const caPath = path.join(process.cwd(), 'certs', 'ca.crt')
  const caCert = fs.readFileSync(caPath, 'utf8')

  return NextResponse.json({
    serverCertificate: serverCert,
    caCertificate: caCert,
    issuer: 'Kwell CA',
    subject: 'localhost',
    algorithm: 'RSA-SHA256'
  })
}
```

---

## Certificate Generation Process

The certificates are generated using OpenSSL with a two-step process:

### Step 1: Generate the CA (Certificate Authority)

```bash
# Generate CA private key (4096-bit RSA)
openssl genrsa -out ca.key 4096

# Generate CA certificate (self-signed, valid for 1 year)
openssl req -x509 -new -nodes -key ca.key -sha256 -days 365 -out ca.crt \
  -subj "/C=AU/ST=NSW/L=Sydney/O=Kwell/OU=Security/CN=Kwell CA"
```

**CA Certificate details:**
- **Algorithm:** RSA-4096 with SHA-256
- **Validity:** 365 days
- **Organization:** Kwell
- **Common Name:** Kwell CA

### Step 2: Generate the Server Certificate (signed by CA)

```bash
# Generate server private key (2048-bit RSA)
openssl genrsa -out server.key 2048

# Generate Certificate Signing Request (CSR)
openssl req -new -key server.key -out server.csr \
  -subj "/C=AU/ST=NSW/L=Sydney/O=Kwell/OU=Server/CN=localhost"

# Sign the CSR with our CA to create the server certificate
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 365 -sha256 \
  -extfile <(printf "subjectAltName=DNS:localhost,IP:127.0.0.1")
```

**Server Certificate details:**
- **Algorithm:** RSA-2048 with SHA-256
- **Signed by:** Kwell CA
- **Subject Alternative Names:** localhost, 127.0.0.1
- **Validity:** 365 days

### Certificate Chain

```
Kwell CA (Root/Self-signed)
    └── Server Certificate (signed by Kwell CA)
```

---

## Security Implications of Hardcoded CA

### Advantages (Why we do this)

| Advantage | Explanation |
|-----------|-------------|
| **MITM Prevention** | Even if an attacker has a valid browser-trusted certificate, they cannot impersonate our server because their certificate won't be signed by our specific CA |
| **Trust Control** | We don't rely on hundreds of public CAs that could be compromised or coerced |
| **Zero Trust** | Client explicitly trusts only ONE CA, reducing attack surface |
| **Transparency** | The trusted CA is visible in the code, can be audited |

### Disadvantages (Trade-offs)

| Disadvantage | Explanation | Mitigation |
|--------------|-------------|------------|
| **CA Key Compromise** | If CA private key is leaked, attacker can issue valid certificates | Store CA key in HSM, rotate keys periodically |
| **Update Requirement** | If CA changes, ALL clients must be updated | Plan certificate rotation with client update cycles |
| **Certificate Expiry** | When CA expires, all clients fail | Monitor expiry dates, update before expiration |
| **No Revocation** | Cannot easily revoke a compromised certificate | Implement certificate expiry checks, short validity periods |
| **Build Dependency** | Client code must be updated for cert changes | Use configuration management for production |

### Security Best Practices

1. **Protect the CA private key**
   - Never commit `ca.key` to version control
   - Store in secure hardware (HSM) for production
   - Use different CAs for development vs. production

2. **Certificate rotation**
   - Plan for annual certificate renewal
   - Have a process to update clients before expiry

3. **Backup keys**
   - Keep secure offline backups of CA private key
   - Document the key recovery process

4. **Monitor expiry**
   ```javascript
   // Client can check certificate expiry
   const certExpiry = new Date('2027-04-14'); // From cert
   if (Date.now() > certExpiry.getTime()) {
     console.warn('Certificate has expired!');
   }
   ```

---

## Code Walkthrough

### Complete Flow: Login with Server Authentication

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
│                                                                  │
│  1. User enters email/password                                   │
│                    │                                             │
│                    ▼                                             │
│  2. AuthAPI.login() called                                       │
│                    │                                             │
│                    ▼                                             │
│  3. Check: Is server verified?                                   │
│     ┌──────No──────┼──────Yes─────┐                             │
│     │              │              │                              │
│     ▼              │              ▼                              │
│  4. Call /api/certificate         │  Skip to Step 7             │
│     │              │              │                              │
│     ▼              │              │                              │
│  5. Compare CA cert with          │                              │
│     TRUSTED_CA_PUBLIC_KEY         │                              │
│     ┌──────────────┴──────────────┐                             │
│     │ Match?                      │                              │
│     │ No ─► ABORT! Possible MITM  │                              │
│     │ Yes                         │                              │
│     ▼                             │                              │
│  6. Mark server as verified       │                              │
│     │                             │                              │
│     └──────────────┬──────────────┘                             │
│                    │                                             │
│                    ▼                                             │
│  7. NOW send credentials to /api/users/login                    │
│                    │                                             │
└────────────────────┼────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER                                   │
│                                                                  │
│  8. Receive credentials (protected by TLS + verified cert)       │
│  9. Validate credentials against database                        │
│  10. Return JWT token                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Code Sections

**1. Hardcoded CA (api-client.js:20-55)**
```javascript
const TRUSTED_CA_PUBLIC_KEY = `-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----`;
```

**2. Certificate Verification (api-client.js:ServerAuth.verifyServerCertificate)**
```javascript
async verifyServerCertificate() {
  // Fetch server certificate
  const response = await fetch(`${API_BASE_URL}/certificate`);
  const { serverCertificate, caCertificate } = await response.json();

  // Verify CA matches our trusted CA
  const caVerified = this.verifyCACertificate(caCertificate);
  if (!caVerified) {
    return { verified: false, error: 'CA mismatch' };
  }

  return { verified: true };
}
```

**3. Login with Verification (api-client.js:AuthAPI.login)**
```javascript
async login(email, password) {
  // MUST verify server before sending credentials
  if (!ServerAuth.isServerVerified()) {
    const verification = await ServerAuth.verifyServerCertificate();
    if (!verification.verified) {
      throw new Error('Server authentication failed');
    }
  }

  // Only now send credentials
  return apiRequest('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}
```

---

## Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| Hardcoded CA | `api-client.js` | Certificate pinning - only trust our CA |
| ServerAuth module | `api-client.js` | Certificate verification logic |
| Certificate endpoint | `/api/certificate` | Expose server cert for verification |
| Modified login | `AuthAPI.login()` | Verify server BEFORE sending credentials |
| CA certificate | `certs/ca.crt` | Root certificate for signing |
| Server certificate | `certs/server.crt` | Server's TLS certificate |

---

*Document created for INFO2222 Phase 3 - Server Authentication (Task 2)*
