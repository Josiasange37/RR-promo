import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireOwner } from "@/lib/admin-auth"
import { requestDeposit } from "@/lib/camerpay"
import { getWithdrawals, recordWithdrawal } from "@/lib/db-supabase"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const owner = await requireOwner(request)
    if (!owner) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50))
    const withdrawals = await getWithdrawals(limit)

    return NextResponse.json({ success: true, withdrawals })
  } catch (error: any) {
    console.error("API Admin Withdraw list error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwner(request)
    if (!owner) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, phoneNumber, operator } = body

    // Validation
    const amountNum = parseInt(amount, 10)
    if (!amountNum || amountNum < 100) {
      return NextResponse.json({ success: false, error: "Montant invalide (minimum 100 FCFA)" }, { status: 400 })
    }

    const cleanedPhone = String(phoneNumber || "").trim().replace(/\s+/g, "")
    if (!/^(\+?237)?[0-9]{9}$/.test(cleanedPhone)) {
      return NextResponse.json({ success: false, error: "Numéro de téléphone invalide" }, { status: 400 })
    }

    if (operator !== "MTN" && operator !== "ORANGE") {
      return NextResponse.json({ success: false, error: "Opérateur invalide" }, { status: 400 })
    }

    const txId = `wd_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

    // Execute payout via CamPay deposit
    const payResult = await requestDeposit({
      amount: amountNum,
      phoneNumber: cleanedPhone,
      externalReference: txId,
    })

    // Journal the withdrawal
    await recordWithdrawal({
      id: txId,
      amount: amountNum,
      phoneNumber: cleanedPhone,
      operator,
      reference: payResult.reference,
    })

    return NextResponse.json({
      success: true,
      withdrawalId: txId,
      reference: payResult.reference,
      status: payResult.status,
    })
  } catch (error: any) {
    console.error("API Admin Withdraw error:", error)
    return NextResponse.json({ success: false, error: error.message || "Retrait impossible" }, { status: 500 })
  }
}
