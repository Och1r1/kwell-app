import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * GET /api/certificate
 * Returns the server's SSL certificate for client-side verification
 *
 * This endpoint allows clients to verify the server's identity
 * before transmitting sensitive credentials (login data)
 */
export async function GET() {
  try {
    // Read the server certificate
    const certPath = path.join(process.cwd(), 'certs', 'server.crt')
    const serverCert = fs.readFileSync(certPath, 'utf8')

    // Read the CA certificate (for chain verification)
    const caPath = path.join(process.cwd(), 'certs', 'ca.crt')
    const caCert = fs.readFileSync(caPath, 'utf8')

    return NextResponse.json({
      serverCertificate: serverCert,
      caCertificate: caCert,
      // Include certificate metadata for verification
      issuer: 'Kwell CA',
      subject: 'localhost',
      algorithm: 'RSA-SHA256'
    })
  } catch (error) {
    console.error('Error reading certificates:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve server certificate' },
      { status: 500 }
    )
  }
}
