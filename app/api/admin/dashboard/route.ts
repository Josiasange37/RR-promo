import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readSessionCookie, verifySessionToken, getSessionAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

const PAGE_SIZE_DEFAULT = 50

export async function GET(request: Request) {
  try {
    const token = readSessionCookie(request)
    if (!token || !(await verifySessionToken(token))) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }
    const currentAdmin = await getSessionAdmin(request)

    const { searchParams } = new URL(request.url)
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0)
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT))

    const [candidatesRes, statsRes, pageRes, countRes] = await Promise.all([
      supabaseAdmin.from("candidates").select("*").order("votes", { ascending: false }),
      // Aggregate over ALL transactions (not just the visible page)
      supabaseAdmin.from("transactions").select("status, votes, amount"),
      supabaseAdmin
        .from("transactions")
        .select("id, candidate_id, votes, amount, phone_number, operator, status, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      supabaseAdmin.from("transactions").select("*", { count: "exact", head: true }),
    ])

    const candidates = (candidatesRes.data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      class: row.class,
      category: row.category,
      votes: row.votes,
      imageUrl: row.image_url,
    }))

    const transactions = (pageRes.data ?? []).map((row: any) => ({
      id: row.id,
      candidateId: row.candidate_id,
      votes: row.votes,
      amount: row.amount,
      phoneNumber: row.phone_number,
      operator: row.operator,
      status: row.status,
      createdAt: row.created_at,
    }))

    const allTx = (statsRes.data ?? []) as { status: string; votes: number; amount: number }[]
    const totalTransactions = countRes.count ?? allTx.length

    let totalCollected = 0
    let totalVotes = 0
    let successCount = 0
    let failedCount = 0
    let pendingCount = 0

    allTx.forEach((tx) => {
      if (tx.status === "SUCCESS") {
        totalCollected += tx.amount
        totalVotes += tx.votes
        successCount++
      } else if (tx.status === "FAILED") {
        failedCount++
      } else {
        pendingCount++
      }
    })

    const roiRankings = candidates.filter((c: any) => c.category === "Roi").sort((a: any, b: any) => b.votes - a.votes)
    const reineRankings = candidates.filter((c: any) => c.category === "Reine").sort((a: any, b: any) => b.votes - a.votes)

    return NextResponse.json({
      success: true,
      current: currentAdmin
        ? { id: currentAdmin.id, username: currentAdmin.username, isOwner: currentAdmin.is_owner }
        : null,
      stats: { totalCollected, totalVotes, successCount, failedCount, pendingCount, totalTransactions },
      roiRankings,
      reineRankings,
      recentTransactions: transactions,
      pagination: { offset, limit, total: totalTransactions, hasMore: offset + transactions.length < totalTransactions },
    })
  } catch (error: any) {
    console.error("API Admin Dashboard error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 })
  }
}