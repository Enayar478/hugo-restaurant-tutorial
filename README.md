# Le Vestiaire 🧥

Mon dressing en ligne : garde-robe, wishlist, tenues, ventes Vinted et carnet de boutiques — construit autour de mon profil **Automne Chaud** et de ma vibe **Ivy League / Workwear / Militaire**.

Site statique [Hugo](https://gohugo.io), installable en PWA sur mobile, déployé automatiquement sur GitHub Pages.

## Les espaces

| Espace | Rôle |
|---|---|
| **Garde-robe** | Toutes mes pièces (possédées, à acquérir, en vente, vendues) |
| **Tenues** | Mes associations validées, par occasion et saison |
| **Studio** | Composer une tenue en direct (en magasin, avant un achat…) |
| **Wishlist** | Mes futurs achats, ajoutés depuis n'importe quelle URL (Vinted inclus) |
| **Ventes** | Mes brouillons d'annonces Vinted, prêts à copier-coller |
| **Boutiques** | Le carnet d'adresses de mes marques cibles |
| **Guide** | Ma colorimétrie, mes règles d'or et ma capsule idéale |

## Développement

```bash
hugo server          # aperçu local sur http://localhost:1313
hugo --minify        # build de production dans public/
```

Aucune dépendance Node, aucun framework : du contenu Markdown, quelques layouts, un peu de JS vanilla.

## Gestion avec Claude Code

Le projet embarque un agent **personal-shopper** et des skills dédiées (`/ajouter-piece`, `/wishlist`, `/creer-tenue`, `/annonce-vinted`). Voir [CLAUDE.md](CLAUDE.md).

## Déploiement

Chaque push sur `master` déclenche le workflow GitHub Actions qui build et publie sur GitHub Pages. Activer une fois dans **Settings → Pages → Source : GitHub Actions**.
