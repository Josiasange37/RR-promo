import { NextResponse } from "next/server"
import { getCandidateById, recordTransaction } from "@/lib/db-supabase"
import { requestCollection } from "@/lib/campay"

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

    if (operator !== "MTN" && operator !== "ORANGE") {
      return NextResponse.json({ success: false, error: "Opérateur de paiement invalide" }, { status: 400 })
    }

    // CamPay unit vote price is 100 FCFA
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

    // 4. Request CamPay payment collection
    console.log(`[API Initiate] Starting payment request for transaction ${txId}`)
    const payResult = await requestCollection({
      amount,
      phoneNumber,
      externalReference: txId,
    })

    return NextResponse.json({
      success: true,
      transactionId: tx.id,
      paymentReference: payResult.reference,
      amount,
      status: tx.status,
    })
  } catch (error: any) {
    console.error("API Initiate Vote error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 })
  }
}
