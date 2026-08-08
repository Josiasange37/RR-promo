#!/usr/bin/env node
/**
 * scripts/reset-password.mjs
 *
 * Reset the password for an admin account and print it once.
 *
 * Usage:
 *   node scripts/reset-password.mjs <username>
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import crypto from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

function loadEnv(file) {
  if (!existsSync(file)) return {}
  const out = {}
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const value = m[2].replace(/^["']|["']$/g, "")
    if (!value.startsWith("#")) out[m[1]] = value
  }
  return out
}

function strongPassword(len = 32) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789!@#$%^&*_-+=?"
  const bytes = crypto.randomBytes(len)
  let pw = ""
  for (let i = 0; i < len; i++) pw += charset[bytes[i] % charset.length]
  return pw
}

async function main() {
  const username = process.argv[2]
  if (!username || !/^[a-zA-Z0-9_]+$/.test(username)) {
    console.error("Usage: node scripts/reset-password.mjs <username>")
    process.exit(1)
  }

  const env = loadEnv(resolve(".env.local"))
  const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("✖ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data, error } = await supabase
    .from("admins")
    .select("id, username")
    .eq("username", username)
    .single()
  if (error || !data) {
    console.error(`✖ Compte « ${username} » introuvable :`, error?.message || "aucun résultat")
    process.exit(1)
  }

  const password = strongPassword()
  const passwordHash = await bcrypt.hash(password, 12)

  const { error: updateError } = await supabase
    .from("admins")
    .update({ password_hash: passwordHash })
    .eq("id", data.id)
  if (updateError) {
    console.error("✖ Échec de la mise à jour :", updateError.message)
    process.exit(1)
  }

  console.log("──────────────────────────────────────────────")
  console.log("  ✔ Mot de passe réinitialisé")
  console.log(`    Compte  : ${data.username}`)
  console.log(`    Mot de passe : ${password}`)
  console.log("  ⚠ Copiez-le maintenant — il ne sera plus jamais affiché.")
  console.log("  Connexion : identifiant + mot de passe + code à 6 chiffres (authentificateur).")
  console.log("──────────────────────────────────────────────")
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})