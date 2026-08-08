# Déploiement Vercel — Bal Masqué 2026

Étapes exactes pour déployer en production (paiements CamerPay réels).

## 1. Importer le projet

1. [vercel.com/new](https://vercel.com/new) → importer le dépôt `gh:Josiasange37/RR-promo`.
2. Framework détecté automatiquement (Next.js). `vercel.json` configure déjà `build` + `npm install`.
3. Ne PAS modifier la commande de build.

## 2. Variables d'environnement

Pendant la création **ou** après (Project → Settings → Environment Variables), ajouter pour **Production** (et Development si voulu) :

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | copier depuis `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | copier depuis `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | copier depuis `.env.local` |
| `ADMIN_SLUG` | copier depuis `.env.local` |
| `CAMERPAY_TOKEN` | copier depuis `.env.local` |
| `CAMERPAY_CALLBACK_SECRET` | copier depuis `.env.local` |
| `CAMERPAY_MODE` | `production` |
| `CAMERPAY_PUBLIC_URL` | la future URL publique **sans slash final** (ex. `https://mon-bal-2026.vercel.app`) |

> ⚠️ `CAMERPAY_PUBLIC_URL` doit être la VRAIE URL finale (= celle qu'utiliseront les électeurs).
> C'est là que CamerPay envoie le webhook et redirige après paiement.

## 3. Vérifier après déploiement

Ouvrir l'URL de production et tester :

1. `GET https://<url>/api/candidates` → JSON avec les candidats.
2. `POST https://<url>/api/vote/initiate` avec `{ candidateId, votes, phoneNumber, operator }` → réponse `payUrl`.
3. Le `payUrl` ne doit PAS contenir `sandbox/simulate` → sinon le token désactive n'est pas configuré (mode sandbox).

## 4. Déclarer le callback dans le dashboard CamerPay

Dashboard CamerPay → API & webhooks → **URL de callback** :
`https://<url>/api/vote/webhook`

Théoriquement le callback est déjà transmis via `merchant_callback_url` à chaque `initiate`, mais le déclarer dans le dashboard évite toute divergence.

## 5. (Recommandé) Domain personal

Si un domaine propre est ajouté : **faire pointer** et remettre `CAMERPAY_PUBLIC_URL` sur le nouveau domaine, puis redéployer.

## 6. Remarque — secrets

- `.env.local` est ignoré par git (jamais poussé).
- Générer un nouvel `ADMIN_SLUG` avant production si le nœud présent a déjà été exposé:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`