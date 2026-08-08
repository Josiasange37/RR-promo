import { NextResponse } from "next/server"
import { expireStalePendingTransactions } from "@/lib/db-supabase"
import { PAYMENT_EXPIRY_MS, PAYMENT_EXPIRY_MINUTES } from "@/lib/payment-expiry"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Cron endpoint invoked periodically by Vercel (see vercel.json crons).
 * Marks every transaction that stayed PENDING for more than
 * PAYMENT_EXPIRY_MINUTES as FAILED.
 *
 * Idempotent and safe to call from a browser too: it only flips status for
 * transactions older than the expiry window.
 */
export async function GET() {
  try {
    const expired = await expireStalePendingTransactions(PAYMENT_EXPIRY_MS)
    return NextResponse.json({ ok: true, expired, windowMinutes: PAYMENT_EXPIRY_MINUTES })
  } catch (error: any) {
    console.error("Payment expiry cron failed:", error)
    return NextResponse.json({ ok: false, error: error.message || "Internal error" }, { status: 500 })
  }
}