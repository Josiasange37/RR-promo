import { createHmac, timingSafeEqual } from "crypto"
import { confirmTransaction } from "./db-supabase"

/**
 * lib/cameray.ts — Camer hosted-payment integration.
 *
 * - Payments are POSTed to /payment/initiate which returns a pay_url the voter
 *   is redirected to (hosted flow).
 * - Confirmation arrives as a signed webhook on merchant_callback_url.
 *   Signature = HMAC-SHA256 over `uuid|invoice_id|status|amount` (amount with
 *   two decimals, e.g. 10000.00).
 * - Statuses: pending | processing | completed | failed | cancelled | refunded
 * - Retraits (admin withdrawals) use POST /payouts/batch (approval batch).
 */

const CAMERPAY_API_URL = process.env.CAMERPAY_API_URL || "https://camerpay.biz/api"

const config = {
  token: process.env.CAMERPAY_TOKEN,
  callbackSecret: process.env.CAMERPAY_CALLBACK_SECRET,
  mode: process.env.CAMERPAY_MODE || "development",
}

export function isSandbox(): boolean {
  return !config.token
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const token = config.token
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/** Normalize a Cameroonian phone number to E.164 "+237XXXXXXXXX". */
export function normalizePhone(phoneNumber: string): string {
  let p = phoneNumber.trim().replace(/\s+/g, "").replace(/^\+/, "")
  if (!p.startsWith("237")) {
    if (p.startsWith("6")) p = "237" + p
    else p = "237" + p.replace(/^0+/, "")
  }
  return "+" + p
}

function paymentMethod(operator: "MTN" | "ORANGE"): string {
  return operator === "ORANGE" ? "orange_money" : "mtn_momo"
}

/**
 * Initiate a hosted Camer payment. Returns the reference the voter must
 * finish payment (and storage) on.
 */
export async function requestCollection(params: {
  amount: number
  phoneNumber: string
  externalReference: string
  callbackUrl?: string
  returnUrl?: string
  operator?: "MTN" | "ORANGE"
}): Promise<{ payUrl: string; status: "PENDING" | "SUCCESS" | "FAILED" }> {
  const { amount, phoneNumber, externalReference, callbackUrl, returnUrl, operator = "ORANGE" } = params

  if (isSandbox()) {
    console.log(`[CamerPay Sandbox] Initiating collection for ${amount} FCFA on ${normalizePhone(phoneNumber)}`)
    // Simulate the confirmation trip in sandbox.
    setTimeout(() => {
      confirmTransaction(externalReference, "SUCCESS").catch((err) =>
        console.error("Failed to confirm sandbox transaction:", err)
      )
    }, 4000)
    const sandboxReturn = returnUrl || "http://localhost:3000/"
    return { payUrl: `${sandboxReturn}?tx=${encodeURIComponent(externalReference)}`, status: "PENDING" }
  }

  const res = await fetch(`${CAMERPAY_API_URL}/payment/initiate`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      amount,
      currency: "XAF",
      payment_method: paymentMethod(operator),
      customer_phone: normalizePhone(phoneNumber),
      merchant_invoice_id: externalReference,
      merchant_callback_url: callbackUrl,
      merchant_return_url: returnUrl,
      source: "api",
    }),
    signal: AbortSignal.timeout(15000),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.pay_url) {
    const msg = data.message || data.error || `CamerPay init failed (${res.status})`
    console.error(msg)
    throw new Error(msg)
  }

  return { payUrl: data.pay_url, status: "PENDING" }
}

/** Check payment status by Camer Pay UUID. */
export async function checkTransactionStatus(reference: string): Promise<"SUCCESS" | "FAILED" | "PENDING"> {
  if (isSandbox()) return "PENDING"
  try {
    const res = await fetch(`${CAMERPAY_API_URL}/payment/${reference}/status`, {
      headers: await authHeaders(),
      signal: AbortSignal.timeout(15000),
    })
    const data = await res.json().catch(() => ({}))
    return mapStatus(data.transaction?.status || data.status)
  } catch (error) {
    console.error("CamerPay status error:", error)
    return "PENDING"
  }
}

function mapStatus(raw: string | undefined): "SUCCESS" | "FAILED" | "PENDING" {
  const s = String(raw || "").toLowerCase()
  if (s === "completed") return "SUCCESS"
  if (s === "failed" || s === "cancelled" || s === "refunded") return "FAILED"
  return "PENDING"
}

/**
 * Request a payout (retrait) to a Camero Mobile number via /payouts/batch.
 */
export async function requestDeposit(params: {
  amount: number
  phoneNumber: string
  externalReference: string
  operator?: "MTN" | "ORANGE"
}): Promise<{ reference: string; status: "PENDING" | "SUCCESS" | "FAILED" }> {
  const { amount, phoneNumber, externalReference, operator = "ORANGE" } = params

  if (isSandbox()) {
    return { reference: `sandbox-deposit-${externalReference}`, status: "SUCCESS" }
  }

  const res = await fetch(`${CAMERPAY_API_URL}/payouts/batch`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      reference: externalReference,
      description: `Retrait Bal Masqué — R:${externalReference}`,
      beneficiaries: [
        {
          phone: normalizePhone(phoneNumber),
          amount,
          name: "Bénéficiaire Bal Masqué",
          method: paymentMethod(operator),
          external_id: externalReference,
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.message || data.error || "CamerPaY payout request failed"
    console.error(msg)
    throw new Error(msg)
  }

  return { reference: data.batch_uuid || externalReference, status: "PENDING" }
}

/**
 * Verify Camer's HMAC-SHA256 webhook signature (hex).
 * data = `uuid|invoice_id|status|amount` with amount as 2 decimals.
 */
export function verifyPaySignature(
  payload: { uuid?: string; invoice_id?: string; status?: string; amount?: string | number },
  signature?: string | null
): boolean {
  if (!config.callbackSecret) return true // no secret configured → trust
  if (!signature) return false

  const amount =
    typeof payload.amount === "number"
      ? payload.amount.toFixed(2)
      : String(payload.amount || "")
  const data = `${payload.uuid || ""}|${payload.invoice_id || ""}|${payload.status || ""}|${amount}`
  const expected = createHmac("sha256", config.callbackSecret).update(data).digest("hex")

  try {
    const a = Buffer.from(expected, "hex")
    const b = Buffer.from(signature, "hex")
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}