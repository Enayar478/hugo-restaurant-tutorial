---
name: ajouter-piece
description: Ajoute une pièce à la garde-robe (content/garde-robe/). À utiliser quand l'utilisateur dit avoir acheté, reçu ou voulu référencer un vêtement, une paire de chaussures ou un accessoire qu'il possède.
---

# Ajouter une pièce à la garde-robe

1. Rassemble les informations depuis la demande (et pose UNE question groupée s'il manque l'essentiel) : nom, catégorie (`veste | haut | pantalon | chaussures | accessoire`), couleur dominante, marque, saison, prix payé, taille, date d'achat.
2. Vérifie la cohérence colorimétrique (profil Automne Chaud, voir `CLAUDE.md`). Si la pièce est hors palette (noir pur, blanc optique, argenté), ajoute-la quand même si l'utilisateur la possède, mais signale-le dans le corps du fichier et suggère de la basculer en vente.
3. Si la pièce correspond à un slot de la capsule déjà présent avec `statut: a-acquerir` (ex. `blazer-marine`), **mets à jour ce fichier existant** (statut → `possede`, complète marque/prix/taille/date) au lieu d'en créer un nouveau.
4. Sinon crée `content/garde-robe/<slug>.md` (slug kebab-case sans accents) avec le front matter exact du schéma dans `CLAUDE.md`, `statut: possede`.
5. Si la pièce était en wishlist, supprime l'entrée wishlist correspondante (et déplace son image de `static/img/wishlist/` vers `static/img/pieces/<slug>.jpg` si elle existe).
6. **Photo** : si l'utilisateur fournit une photo (fichier ou chemin), traite-la avant de la placer dans `static/img/pieces/<slug>.jpg` : JPEG, bord long ≤ 1200 px, qualité ~80, poids cible < 150 Ko (ImageMagick `convert <src> -auto-orient -resize 1200x1200> -quality 80 <dest>` ou Python/Pillow). Convention : le site détecte automatiquement `static/img/pieces/<slug>.jpg`, pas besoin de renseigner le champ `image` dans ce cas. Sans photo, rappelle le bouton « Ajouter une photo » de la fiche et le protocole photo du Guide.
7. Vérifie le build (`./hugo --minify` ou `hugo --minify` si installé) puis résume : pièce créée/mise à jour, et avec quoi elle s'associe dans la garde-robe actuelle.
