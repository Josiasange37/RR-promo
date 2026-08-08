# Application de Vote — Bal Masqué 2026

Application web mobile-first de vote en ligne pour l'élection du Roi et de la Reine du Bal Masqué 2026. Conçue par XYBERCLAN.

## Fonctionnalités

- **Mobile-First & Cinematic UI** : Design haut de gamme avec arrière-plans vidéo cinématiques, effets de flou de verre (liquid glass) et animations fluides.
- **Vote interactif** : Pop-up d'attribution des votes (100 FCFA/vote) avec calcul en temps réel.
- **Paiements CamPay** : Intégration MTN MoMo / Orange Money. Mode Bac à sable (sandbox) automatique s'il n'y a pas de clés API.
- **Suivi & Classement en direct** : Mise à jour automatique des voix toutes les 8 secondes.
- **Tableau de Bord Admin** : Suivi financier global (total récolté, réussite des transactions, votes par candidat) et possibilité de réinitialiser la base de données.

## Installation & Lancement local

1. Installez les dépendances :
```bash
npm install
```

2. Lancez le serveur de développement :
```bash
npm run dev
```

3. Ouvrez [http://localhost:3000](http://localhost:3000).

## Configuration

Vous pouvez ajouter les variables d'environnement suivantes dans un fichier `.env.local` :

```env
# Lieu SÉCRET du panneau admin — longue chaîne aléatoire : /admin/<ADMIN_SLUG>
# Générer :  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ADMIN_SLUG=cle_secrete_40_caracteres

# Supabase (obligatoire)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Configuration CamPay (Optionnel — active le mode réel si défini)
CAMPAY_TOKEN=votre_token_campay
CAMPAY_APP_USERNAME=votre_nom_utilisateur
CAMPAY_APP_PASSWORD=votre_mot_de_passe
CAMPAY_MODE=development
```

## Panneau Administrateur (URL secrète)

- Le panneau est accessible UNIQUEMENT à `/admin/<ADMIN_SLUG>`. Toute autre URL `/admin/...` ou `/admin` renvoie une **404** (aucune trace côté client).
- Créez les comptes administrateur (mot de passe fort, hash bcrypt cost 12) :
  ```bash
  node scripts/seed-admins.mjs admin_prod admin_orga
  ```
  Les mots de passe générés s'affichent **une seule fois**.
- Sessions par cookie `HttpOnly` (8 h), verrouillage après 5 connexions ratées (15 min), comptes hâchés en bcrypt. Les requêtes passent par le client Supabase avec paramètres liés → aucun risque d'injection SQL.

## Structure du Projet

- `app/page.tsx` — Landing page interactive de vote (galerie des candidats, classements, modal de paiement, guide).
- `components/admin/admin-panel.tsx` — Console de supervision XYBERCLAN (rendue à l'URL secrète).
- `app/api/admin/login|dashboard|reset|logout` — API d'authentification et de supervision (server-side only, cookie HttpOnly).
- `lib/admin-auth.ts` — Sessions HttpOnly, rate limiting, cookies.
- `lib/db-supabase.ts` — Accès Supabase (candidats, transactions).
- `lib/campay.ts` — Client d'intégration CamPay Mobile Money et simulation.
- `components/ui/coverflow-carousel.tsx` — Carousel 3D coverflow optisé pour le défilement automatique et le drag tactile.
