---
name: wishlist
description: Ajoute un article à la wishlist depuis une URL (boutique, Vinted, eBay…) ou une description. À utiliser quand l'utilisateur partage un lien ou une envie d'achat futur.
---

# Ajouter à la wishlist depuis une URL

Argument attendu : une URL de produit, ou une description libre.

1. **Si URL** : récupère la page avec WebFetch et extrais titre, marque, prix, image (og:image), état/taille si seconde main. Les pages Vinted/eBay bloquent parfois le fetch : dans ce cas demande à l'utilisateur les infos manquantes (titre, prix) plutôt que d'inventer.
2. **Verdict styliste d'abord** : évalue la pièce contre le profil Automne Chaud / Ivy-Workwear-Militaire (`CLAUDE.md`, `content/guide/_index.md`). Donne un avis franc (✅/⚠️/❌) et signale les doublons avec la garde-robe ou la wishlist existante. Ajoute quand même si l'utilisateur confirme.
3. Crée `content/wishlist/<slug>.md` avec le schéma de `CLAUDE.md` :
   - `source` : `vinted` si l'URL contient vinted, `vestiaire-co`, `ebay`, sinon `boutique`.
   - `priorite` : demandée à l'utilisateur ou `moyenne` par défaut.
   - Dans le corps : pourquoi cette pièce, taille visée, prix cible de négociation si seconde main.
4. **Image produit — toujours rapatriée dans le repo, jamais hotlinkée** (une image Vinted meurt avec l'annonce, une URL externe ne marche pas hors-ligne) : télécharge l'og:image (ou la meilleure image produit) dans `static/img/wishlist/<slug>.jpg`, compressée (bord long ≤ 1200 px, qualité ~80, < 150 Ko). Le site la détecte automatiquement par convention ; laisse `image: ""` dans ce cas. Si le téléchargement échoue, mets l'URL externe dans `image:` en pis-aller et signale-le.
5. Vérifie le build puis résume avec le budget total wishlist mis à jour.
