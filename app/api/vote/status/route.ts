import { NextResponse } from "next/server"
import { expireStalePendingTransactions, getTransactionById } from "@/lib/db-supabase"
import { PAYMENT_EXPIRY_MS } from "@/lib/payment-expiry"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "ID transaction manquant" }, { status: 400 })
    }

    // Lazily expire any abandoned pending payment before answering, so a stale
    // poll reports FAILED instead of PENDING forever.
    await expireStalePendingTransactions(PAYMENT_EXPIRY_MS)

    const tx = await getTransactionById(id)
    if (!tx) {
      return NextResponse.json({ success: false, error: "Transaction introuvable" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      status: tx.status,
      candidateId: tx.candidateId,
      votes: tx.votes,
      amount: tx.amount,
    })
  } catch (error: any) {
    console.error("API Vote Status error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 })
  }
}
