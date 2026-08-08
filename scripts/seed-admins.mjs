#!/usr/bin/env node
/**
 * scripts/seed-admins.mjs
 *
 * Pre-creates strong administrator accounts in Supabase.
 *  - Generates a cryptographically-random 32-char password per admin (printed ONCE).
 *  - Stores only a bcrypt hash (cost 12) in the `admins` table.
 *  - Uses the service-role key from .env.local (server-side only).
 *
 * Usage:
 *   node scripts/seed-admins.mjs admin_principal admin_colearn   # usernames
 *   node scripts/seed-admins.mjs                                 # defaults to admin
 *
 * Passwords are printed to the console one time. Keep them safe.
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
  const env = loadEnv(resolve(".env.local"))
  const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error("✖ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }

  const usernames = process.argv.slice(2)
  if (usernames.length === 0) usernames.push("admin")

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  // Pre-flight: make sure the `admins` / `admin_sessions` / `login_attempts`
  // tables exist (they are created from docs/supabase_schema.sql).
  const probe = await supabase.from("admins").select("id").limit(1)
  const missingTable =
    (probe.error && probe.error.code === "PGRST301") ||
    (probe.error && /could not find the table/i.test(probe.error.message))
  if (probe.error && missingTable) {
    console.error("✖ La table `admins` n'existe pas encore sur cette instance Supabase.")
    console.error("  → Exécutez d'abord le script SQL docs/supabase_schema.sql")
    console.error("    (onglet « SQL Editor » de votre projet Supabase), puis relancez ce script.")
    process.exit(1)
  }
  if (probe.error) {
    console.error("✖ Impossible de lire la table `admins` :", probe.error.message)
    process.exit(1)
  }

  console.log("→ Seeding administrator accounts...\n")

  for (const username of usernames) {
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      console.error(`✖ Invalid username "${username}" — only letters, digits and underscore allowed.`)
      process.exit(1)
    }

    const password = strongPassword()
    const passwordHash = await bcrypt.hash(password, 12)

    const { data, error } = await supabase
      .from("admins")
      .upsert({ username, password_hash: passwordHash }, { onConflict: "username" })
      .select("id, username, created_at")
      .single()

    if (error) {
      console.error(`✖ Could not create "${username}": ${error.message}`)
      process.exit(1)
    }

    console.log("──────────────────────────────────────────────")
    console.log(`  ✔ Admin créé : ${data.username}`)
    console.log(`    URL du panneau : /admin/${env.ADMIN_SLUG || process.env.ADMIN_SLUG || "<ADMIN_SLUG>"}`)
    console.log("──────────────────────────────────────────────")
    console.log(`  Identifiant : ${data.username}`)
    console.log("  ⚠ La connexion se fait UNIQUEMENT avec le code de vérification (authentificateur).")
    console.log(`    Demandez au propriétaire (accès complet) d'assigner un authentificateur à « ${data.username} »,`)
    console.log("    puis connectez-vous avec le code à 6 chiffres de l'application.\n")
  }

  console.log("Terminé. Utilisez ces identifiants sur la page secrète du panneau admin.")
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
