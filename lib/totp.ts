/**
 * lib/totp.ts
 *
 * Server-only helpers for TOTP (RFC 6238 two-factor authentication) used by
 * the secret admin panel. Compatible with Google Authenticator, Authy,
 * 1Password, Bitwarden and any standard authenticator app.
 */

import { generateSecret, generateURI, verifySync } from "otplib"

const ISSUER = "Bal Masque Admin"
// Accept codes valid within ±30 s of the server clock (clock-drift tolerance,
// per RFC 6238 §5.2).
const EPOCH_TOLERANCE_S = 30

/** Generate a fresh random base32 TOTP secret. */
export function generateTotpSecret(): string {
  return generateSecret()
}

/** Verify a 6-digit code against a stored secret. */
export function verifyTotp(token: string, secret: string): boolean {
  if (!token || typeof token !== "string" || !/^[0-9]{6}$/.test(token.trim())) return false
  try {
    const result = verifySync({ secret, token: token.trim(), epochTolerance: EPOCH_TOLERANCE_S })
    return result.valid === true
  } catch {
    return false
  }
}

/** Build the standard otpauth:// URI used by authenticator apps. */
export function buildOtpauthUri(secret: string, accountName: string): string {
  return generateURI({ issuer: ISSUER, label: accountName, secret })
}

/** Render an otpauth URI as a QR code data URL (for the enrollment screen). */
export async function generateQrDataUrl(otpauthUri: string): Promise<string> {
  const QRCode = (await import("qrcode")).default
  return QRCode.toDataURL(otpauthUri, { width: 280, margin: 1, errorCorrectionLevel: "M" })
}