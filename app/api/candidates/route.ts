import { NextResponse } from "next/server"
import { getCandidates } from "@/lib/db-supabase"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const candidates = await getCandidates()
    return NextResponse.json({ success: true, candidates })
  } catch (error: any) {
    console.error("API Candidates error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 })
  }
}
