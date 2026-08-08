/**
 * lib/db-supabase.ts
 *
 * Drop-in replacement for lib/db.ts — same exported function signatures,
 * now backed by Supabase PostgreSQL instead of a local JSON file.
 *
 * All write operations use the service-role client (server-side only).
 * Read operations use the anon client.
 */

import { supabase, supabaseAdmin } from "./supabase"

/* ─────────────────────────────────────────────────────────
   Types (mirrors lib/db.ts)
───────────────────────────────────────────────────────── */

export interface Candidate {
  id: string
  name: string
  class: string
  category: "Roi" | "Reine"
  votes: number
  imageUrl: string
}

export interface Transaction {
  id: string
  candidateId: string
  votes: number
  amount: number
  phoneNumber: string
  operator: "MTN" | "ORANGE"
  status: "PENDING" | "SUCCESS" | "FAILED"
  createdAt: string
}

export interface Withdrawal {
  id: string
  amount: number
  phoneNumber: string
  operator: "MTN" | "ORANGE"
  reference: string
  status: "PENDING" | "SUCCESS" | "FAILED"
  createdAt: string
}

/* ─────────────────────────────────────────────────────────
   Row-to-model mappers (snake_case DB ↔ camelCase app)
───────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCandidate(row: any): Candidate {
  return {
    id: row.id,
    name: row.name,
    class: row.class,
    category: row.category as "Roi" | "Reine",
    votes: row.votes,
    imageUrl: row.image_url,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    votes: row.votes,
    amount: row.amount,
    phoneNumber: row.phone_number,
    operator: row.operator as "MTN" | "ORANGE",
    status: row.status as "PENDING" | "SUCCESS" | "FAILED",
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToWithdrawal(row: any): Withdrawal {
  return {
    id: row.id,
    amount: row.amount,
    phoneNumber: row.phone_number,
    operator: row.operator as "MTN" | "ORANGE",
    reference: row.reference,
    status: row.status as "PENDING" | "SUCCESS" | "FAILED",
    createdAt: row.created_at,
  }
}

/* ─────────────────────────────────────────────────────────
   Candidate queries
───────────────────────────────────────────────────────── */

export async function getCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .order("votes", { ascending: false })

  if (error) throw new Error(`getCandidates: ${error.message}`)
  return (data ?? []).map(rowToCandidate)
}

export async function getCandidateById(id: string): Promise<Candidate | undefined> {
  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return undefined // not found
    throw new Error(`getCandidateById: ${error.message}`)
  }
  return data ? rowToCandidate(data) : undefined
}

/* ─────────────────────────────────────────────────────────
   Transaction queries
───────────────────────────────────────────────────────── */

export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(`getTransactions: ${error.message}`)
  return (data ?? []).map(rowToTransaction)
}

export async function getTransactionById(id: string): Promise<Transaction | undefined> {
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return undefined // not found
    throw new Error(`getTransactionById: ${error.message}`)
  }
  return data ? rowToTransaction(data) : undefined
}

export async function recordTransaction(
  tx: Omit<Transaction, "createdAt" | "status">
): Promise<Transaction> {
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      id: tx.id,
      candidate_id: tx.candidateId,
      votes: tx.votes,
      amount: tx.amount,
      phone_number: tx.phoneNumber,
      operator: tx.operator,
      status: "PENDING",
    })
    .select()
    .single()

  if (error) throw new Error(`recordTransaction: ${error.message}`)
  return rowToTransaction(data)
}

export async function confirmTransaction(
  id: string,
  status: "SUCCESS" | "FAILED"
): Promise<Transaction | undefined> {
  // 1. Load the current transaction
  const tx = await getTransactionById(id)
  if (!tx) return undefined
  if (tx.status !== "PENDING") return tx // already finalized

  // 2. Update transaction status
  const { data: updatedTx, error: txError } = await supabaseAdmin
    .from("transactions")
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (txError) throw new Error(`confirmTransaction update: ${txError.message}`)

  // 3. If payment succeeded, increment candidate votes atomically
  if (status === "SUCCESS") {
    const { error: voteError } = await supabaseAdmin.rpc("increment_votes", {
      p_candidate_id: tx.candidateId,
      p_votes: tx.votes,
    })

    if (voteError) throw new Error(`confirmTransaction increment_votes: ${voteError.message}`)
  }

  return rowToTransaction(updatedTx)
}

/**
 * Expire abandoned payments: mark as FAILED every transaction still PENDING
 * and older than `maxAgeMs`. Abandoned hosted-payment collections never receive
 * a final webhook, so they would otherwise stay PENDING forever.
 *
 * Returns the number of transactions that were marked FAILED.
 */
export async function expireStalePendingTransactions(maxAgeMs: number): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString()

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .update({ status: "FAILED" })
    .eq("status", "PENDING")
    .lt("created_at", cutoff)
    .select("id")

  if (error) throw new Error(`expireStalePendingTransactions: ${error.message}`)
  return (data ?? []).length
}

/* ─────────────────────────────────────────────────────────
   Withdrawals (admin payout journal)
───────────────────────────────────────────────────────── */

export async function getWithdrawals(limit = 50): Promise<Withdrawal[]> {
  const { data, error } = await supabaseAdmin
    .from("withdrawals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getWithdrawals: ${error.message}`)
  return (data ?? []).map(rowToWithdrawal)
}

export async function recordWithdrawal(
  w: {
    id: string
    amount: number
    phoneNumber: string
    operator: "MTN" | "ORANGE"
    reference: string
    status?: "PENDING" | "SUCCESS" | "FAILED"
  }
): Promise<Withdrawal> {
  const { data, error } = await supabaseAdmin
    .from("withdrawals")
    .insert({
      id: w.id,
      amount: w.amount,
      phone_number: w.phoneNumber,
      operator: w.operator,
      reference: w.reference,
      status: w.status || "PENDING",
    })
    .select()
    .single()

  if (error) throw new Error(`recordWithdrawal: ${error.message}`)
  return rowToWithdrawal(data)
}

/* ─────────────────────────────────────────────────────────
   Admin reset (wipes all transactions, zeroes all votes)
   ───────────────────────────────────────────────────────── */

export async function resetDatabase(): Promise<void> {
  // Delete all transactions
  const { error: delError } = await supabaseAdmin
    .from("transactions")
    .delete()
    .neq("id", "") // delete all rows

  if (delError) throw new Error(`resetDatabase (delete tx): ${delError.message}`)

  // Zero all candidate votes
  const { error: resetError } = await supabaseAdmin
    .from("candidates")
    .update({ votes: 0 })
    .neq("id", "") // update all rows

  if (resetError) throw new Error(`resetDatabase (reset votes): ${resetError.message}`)
}
