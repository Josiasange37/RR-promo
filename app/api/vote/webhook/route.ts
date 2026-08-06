import { NextResponse } from "next/server"
import { confirmTransaction } from "@/lib/db-supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { external_reference, status } = body

    if (!external_reference || !status) {
      return NextResponse.json({ success: false, error: "Missing required callback parameters" }, { status: 400 })
    }

    console.log(`[CamPay Webhook] Received callback for ${external_reference} with status ${status}`)

    // Standardize status
    let finalStatus: "SUCCESS" | "FAILED" = "FAILED"
    if (status === "SUCCESS" || status === "successful" || status === "APPROVED") {
      finalStatus = "SUCCESS"
    }

    const tx = await confirmTransaction(external_reference, finalStatus)
    if (!tx) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("API Webhook error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
