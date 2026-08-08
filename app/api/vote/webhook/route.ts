import { NextResponse } from "next/server"
import { confirmTransaction } from "@/lib/db-supabase"
import { verifyPaySignature } from "@/lib/camerpay"

export const dynamic = "force-dynamic"

/**
 * CamerPay sends a POST to merchant_callback_url on each status change.
 * Body is application/x-www-form-urlencoded with uuid, invoice_id, status,
 * amount, signature (HMAC-SHA256 over `uuid|invoice_id|status|amount`).
 */
export async function POST(request: Request) {
  try {
    const text = await request.text()
    const isJson = (request.headers.get("content-type") || "").includes("json")
    const body: Record<string, string> = isJson
      ? JSON.parse(text || "{}")
      : Object.fromEntries(new URLSearchParams(text))

    const { uuid, invoice_id, status, amount, signature } = body
    const invoiceRef = invoice_id || body.merchant_invoice_id || uuid

    if (!invoiceRef || !status) {
      return NextResponse.json({ success: false, error: "Missing required callback parameters" }, { status: 400 })
    }

    console.log(`[CamerPay Webhook] Callback for ${invoiceRef} → ${status}`)

    // Verify the HMAC signature (only enforced when a secret is configured)
    const verified = verifyPaySignature({ uuid, invoice_id: invoiceRef, status, amount }, signature)
    if (!verified) {
      console.warn("[CamerPay Webhook] Invalid signature — rejecting")
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 })
    }

    const finalStatus: "SUCCESS" | "FAILED" | null =
      status === "completed"
        ? "SUCCESS"
        : status === "failed" || status === "cancelled" || status === "refunded"
          ? "FAILED"
          : null

    if (!finalStatus) {
      // pending / processing — not final, just acknowledge
      return NextResponse.json({ success: true })
    }

    const tx = await confirmTransaction(invoiceRef, finalStatus)
    if (!tx) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("API Webhook error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}