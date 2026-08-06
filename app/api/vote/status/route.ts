import { NextResponse } from "next/server"
import { getTransactionById } from "@/lib/db-supabase"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "ID transaction manquant" }, { status: 400 })
    }

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
