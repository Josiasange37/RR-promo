import { NextResponse } from "next/server"
import { getCandidateById, recordTransaction } from "@/lib/db-supabase"
import { requestCollection } from "@/lib/camerpay"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { candidateId, votes, phoneNumber, operator } = body

    // 1. Validation
    if (!candidateId || !votes || !phoneNumber || !operator) {
      return NextResponse.json({ success: false, error: "Champs requis manquants" }, { status: 400 })
    }

    const candidate = await getCandidateById(candidateId)
    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidat introuvable" }, { status: 404 })
    }

    const voteCount = parseInt(votes, 10)
    if (isNaN(voteCount) || voteCount <= 0) {
      return NextResponse.json({ success: false, error: "Nombre de votes invalide" }, { status: 400 })
    }

    // CamerPay caps a single transaction at 1 000 000 XAF (10 000 votes × 100 FCFA).
    const MAX_VOTES = 10000
    if (voteCount > MAX_VOTES) {
      return NextResponse.json(
        { success: false, error: `Montant maximum de ${MAX_VOTES} votes (1 000 000 FCFA) dépassé` },
        { status: 400 }
      )
    }

    if (operator !== "MTN" && operator !== "ORANGE") {
      return NextResponse.json({ success: false, error: "Opérateur de paiement invalide" }, { status: 400 })
    }

    // Unit vote price is 100 FCFA
    const unitPrice = 100
    const amount = voteCount * unitPrice

    // 2. Generate transaction ID
    const txId = `tx_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

    // 3. Record pending transaction in Supabase
    const tx = await recordTransaction({
      id: txId,
      candidateId,
      votes: voteCount,
      amount,
      phoneNumber,
      operator,
    })

    // 4. Request the CamerPay hosted payment
    const origin = new URL(request.url).origin
    console.log(`[API Initiate] Starting payment request for transaction ${txId}`)
    const payResult = await requestCollection({
      amount,
      phoneNumber,
      externalReference: txId,
      callbackUrl: `${origin}/api/vote/webhook`,
      returnUrl: `${origin}?tx=${txId}`,
      operator,
    })

    return NextResponse.json({
      success: true,
      transactionId: tx.id,
      paymentReference: txId,
      payUrl: payResult.payUrl,
      amount,
      status: tx.status,
    })
  } catch (error: any) {
    console.error("API Initiate Vote error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 })
  }
}