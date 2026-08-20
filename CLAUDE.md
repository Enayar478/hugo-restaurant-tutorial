# Le Vestiaire — CLAUDE.md

Site statique Hugo (sans thème externe, sans Node) qui gère la garde-robe de son propriétaire : pièces, tenues, wishlist, annonces Vinted, boutiques. Déployé sur GitHub Pages via `.github/workflows/deploy.yml` à chaque push sur `master`. Installable en PWA.

## Le propriétaire

- **Colorimétrie : Automne Chaud.** Palette : terracotta, vert olive, moutarde, camel, chocolat, écru, marine, rouille, bordeaux.
- **Interdits stylistiques : noir pur, blanc optique (préférer l'écru), métaux argentés brillants** (préférer or, bronze, laiton, mat).
- **Vibe : Ivy League / Workwear / Militaire.** Coupes amples, taille haute (portée au nombril).
- Le guide complet (capsule idéale, montres, lunettes, chevalière) est dans `content/guide/_index.md` — c'est la source de vérité pour tout conseil de style.

Toujours respecter ces règles quand tu conseilles, crées ou évalues une pièce, une tenue ou un achat.

## Commandes

```bash
hugo server    # dev local
hugo --minify  # build (doit passer sans erreur avant tout commit)
```

## Structure & modèle de contenu

Tout le contenu est en Markdown avec front matter YAML. Les slugs de fichiers sont en kebab-case français sans accents (`blazer-marine.md`).

### `content/garde-robe/<slug>.md` — une pièce

```yaml
---
title: "Blazer croisé bleu marine"
categorie: veste        # veste | haut | pantalon | chaussures | accessoire
couleur: marine         # couleur dominante, en minuscules
marque: "Suitsupply"
saison: [hiver, ete]    # hiver, ete — les deux si toute l'année
statut: possede         # possede | a-acquerir | en-vente | vendu
prix: 350               # prix payé ou budget estimé, en euros
taille: "48"            # optionnel
date_achat: 2026-03-15  # optionnel
image: ""               # optionnel, URL ou chemin static/
tags: [ivy]             # optionnel : ivy, workwear, militaire, dandy…
---
Notes libres : entretien, ressenti, historique.
```

### `content/wishlist/<slug>.md` — un futur achat

```yaml
---
title: "Hamilton Khaki Field Bronze"
lien: "https://www.hamiltonwatch.com/..."   # champ `lien`, PAS `url` (réservé par Hugo)
prix: 895
marque: "Hamilton"
source: boutique        # boutique | vinted | vestiaire-co | ebay | autre
priorite: haute         # haute | moyenne | basse
categorie: accessoire
image: ""
---
Pourquoi cette pièce, taille visée, prix cible…
```

### `content/tenues/<slug>.md` — une tenue

```yaml
---
title: "Ivy d'automne"
pieces: [blazer-marine, chemise-oxford-ecru, pantalon-velours-camel, penny-loafers-daim]
occasion: bureau        # bureau | week-end | soiree | voyage…
saison: [hiver]
---
```

`pieces` liste des slugs existants de `content/garde-robe/` — toujours vérifier qu'ils existent.

### `content/ventes/<slug>.md` — une annonce Vinted

```yaml
---
title: "Chino camel Dockers W32"
piece: chino-camel      # slug garde-robe si la pièce y est
prix: 25
etat: "Très bon état"   # Neuf avec étiquette | Neuf sans étiquette | Très bon état | Bon état | Satisfaisant
statut: brouillon       # brouillon | publie | vendu
---
Le corps du fichier EST le texte de l'annonce, prêt à copier-coller sur Vinted.
```

Quand une annonce passe à `publie`, mettre la pièce correspondante en `statut: en-vente` ; à `vendu`, en `statut: vendu`.

### `data/boutiques.yaml` — le carnet d'adresses

Liste d'objets `{ nom, url, categorie, notes }`. Catégories : vestes-manteaux, hauts, pantalons, chaussures, montres, lunettes, multi, seconde-main.

## Layouts & JS

- `layouts/` : templates par section ; `layouts/index.json` génère `index.json` (l'inventaire consommé par le Studio).
- `static/css/main.css` : tout le style, variables CSS palette Automne en tête de fichier.
- `static/js/studio.js` : le composeur de tenues (localStorage, export front matter).
- PWA : `static/manifest.webmanifest` + `static/sw.js` (garder `CACHE_VERSION` incrémenté à chaque grosse évolution du shell).

## Agent & skills

- Agent `.claude/agents/personal-shopper.md` : styliste personnel, connaît le profil et le modèle de contenu.
- Skills : `/ajouter-piece`, `/wishlist` (ajout depuis une URL), `/creer-tenue`, `/annonce-vinted`.

## Conventions

- Interface et contenu en français.
- Pas de dépendance externe (fonts CDN, frameworks) : le site doit rester léger et fonctionner hors-ligne.
- Après toute modification de contenu ou layout : `hugo --minify` doit builder sans erreur ni warning.
- Commits en français, courts, au présent (« Ajoute le fatigue pant olive »).
