# REPRISE-LOCALE.md — à ouvrir au début de ta session Claude Code locale

Tout ce qui n'a **pas** pu être fait depuis le cloud (accès, tokens, actions manuelles GitHub) est consigné ici, dans l'ordre. Coche au fur et à mesure.

## 1. Actions manuelles GitHub (5 minutes)

- [ ] **Activer GitHub Pages** — bloquant, le site n'est pas encore en ligne à cause de ça.
  `Settings → Pages → Build and deployment → Source : « GitHub Actions »`.
  Le workflow a déjà échoué 2× pour cette seule raison (`Resource not accessible by integration` : le token d'Actions n'a pas le droit de créer le site Pages lui-même). Une fois activé : relancer le dernier workflow depuis l'onglet Actions (« Re-run all jobs »), ou simplement pousser un commit.
  → URL finale : `https://enayar478.github.io/hugo-restaurant-tutorial/`
- [ ] **(Optionnel) Renommer le repo** (`Settings → General → Repository name`, ex. `vestiaire`).
  Le déploiement s'adapte tout seul (baseURL injectée par `configure-pages`). Deux références à mettre à jour dans le repo après renommage :
  - `hugo.toml` → `params.repoUrl` (sert au bouton « Ajouter une photo »)
  - `README.md` (mention de l'URL)
- [ ] **Installer la PWA** sur ton téléphone une fois le site en ligne (Partager → « Sur l'écran d'accueil »).

## 2. La séance photo (le vrai chantier)

Le site fonctionne dès maintenant avec des silhouettes teintées, mais sa valeur explose avec de vraies photos.

- Protocole complet : `content/guide/_index.md#protocole-photo` (fond écru, lumière du jour, flat lay 3:4, ≤ 1200 px, < 150 Ko).
- **Convention** : `static/img/pieces/<slug>.jpg` → détection automatique, zéro front matter à toucher.
- Trois façons d'ajouter :
  1. Depuis le téléphone : bouton « 📷 Ajouter une photo » sur chaque fiche sans photo (ouvre l'upload GitHub, nomme le fichier comme indiqué).
  2. En local avec Claude : « ajoute cette photo à la pièce blazer-marine » (la skill `/ajouter-piece` compresse via ImageMagick/Pillow).
  3. En vrac : déposer les JPEG dans `static/img/pieces/`, puis demander à Claude de vérifier noms/poids.
- Suivi : compteur « 📷 x/y en photo » + filtre « Sans photo » sur la page Garde-robe.

## 3. À tester en local (accès réseau complet requis)

- [ ] `hugo server` puis vérifier la planche du Studio, les vignettes, le filtre « sans photo ».
- [ ] La skill `/wishlist <url>` avec une vraie URL boutique **et** une URL Vinted : le téléchargement de l'og:image vers `static/img/wishlist/<slug>.jpg` n'a pas pu être testé depuis le cloud (réseau sortant restreint). Si Vinted bloque le fetch, la skill doit demander les infos au lieu d'inventer — vérifier ce comportement.
- [ ] Le service worker : après déploiement, passer en mode avion et vérifier que garde-robe + studio + vignettes restent consultables. `CACHE_VERSION` est à `vestiaire-v2` ; l'incrémenter à chaque évolution du shell.

## 4. Mise à jour des statuts (premier vrai usage)

La capsule est pré-remplie en `statut: a-acquerir`. Passe en `statut: possede` (avec `taille`, `prix` payé, `date_achat`) tout ce que tu possèdes déjà — c'est ce qui rend le compteur d'accueil et le Studio honnêtes. Dis simplement à Claude : « je possède déjà X, Y, Z ».

## 5. Backlog — Phase 3 (mode magasin/cabine), à faire ensuite

Issues du brainstorming personal-shopper (user stories complètes en section 6) :

1. **Pièce candidate éphémère** (US-7.2) : dans le Studio, un bouton « 📷 Pièce en magasin » → `<input type="file" capture="environment">` → l'image (object URL, jamais committée) occupe un slot de la planche face à tes pièces. Le garde-fou anti-achat : « au moins 3 tenues possibles, sinon repose-la ».
2. **Wishlist fantôme dans le Studio** (US-4.2) : injecter les entrées wishlist dans `index.json` avec un rendu bordure pointillée, pour tester un futur achat contre la garde-robe.
3. **Palette de poche** (US-7.3) : page d'aplats plein écran des couleurs autorisées + interdits barrés, pour arbitrer sous les néons d'un magasin.

## 6. Backlog — Phase 4 (confort) et US détaillées

- Export de la planche en PNG (canvas, images du repo uniquement — CORS interdit les externes).
- Check-list photos Vinted sur les annonces (face, dos, étiquette taille, composition, défauts) + galerie à téléverser.
- Mode valise : union dédupliquée des pièces de plusieurs tenues cochées.
- Filtre par pastilles couleur sur la garde-robe.
- Vues secondaires sur les fiches (`<slug>-2.jpg`, `<slug>-3.jpg`).

Les user stories complètes (format « En tant que… », priorités MoSCoW, implications images) sont dans la conversation de brainstorming — les reprendre au besoin en relançant l'agent : « relis REPRISE-LOCALE.md et détaille les US de la phase 3 ».

## 7. Onboarding — ce qui reste inaccessible depuis le cloud

Le parcours `/profil/` (auto-diagnostic 4 saisons, morpho, vibe check, capsule générée, exports Markdown + prompt IA) est **entièrement fonctionnel en statique**. Ce qui suit demande tes accès/tokens :

**Toutes les vues du parcours sont livrées et fonctionnelles** (caméra guidée + masque ovale + checklist, upload, précisions, morphologie, quiz de style, icônes, contexte/budget, écran d'analyse, fiche profil, capsule avec liens marques, test de pièce au Studio). Il ne reste qu'à **brancher le backend d'analyse** : c'est un seul endpoint, et un seul champ de configuration.

### Le branchement — 1 ligne dans `hugo.toml`

```toml
[params]
  apiUrl = "https://ton-app.vercel.app/api/analyse"   # vide = mode démo
```

Tant que `apiUrl` est vide, le parcours tourne en **mode démo** (estimation locale, étiquetée comme telle dans l'UI) : tout est testable de bout en bout. Dès que l'URL est renseignée, le front POSTe le vrai payload et n'affiche plus que ce que le backend renvoie — **aucune ligne de front à modifier**.

### Contrat d'API (à respecter côté backend)

**Requête** — `POST {apiUrl}`, `Content-Type: application/json` :

```jsonc
{
  "photo_base64": "data:image/jpeg;base64,…",   // le selfie (peut être null si l'utilisateur a tout passé)
  "precisions":   { "yeux": "Noisette / vert doré", "cheveux": "…", "soleil": "…", "veines": "…", "bijoux": "…" },
  "morphologie":  { "taille_cm": "178", "silhouette": "Épaules larges / carrure athlétique", "complexes": ["Ventre"] },
  "vibes":        { "aimees": ["ivy", "workwear"], "passees": ["techwear"] },
  "icones":       ["Paul Newman", "Steve McQueen"],
  "contexte":     "Casual pro",
  "sorties":      "Quelques fois par mois",
  "budget_mensuel": 250
}
```

**Réponse** — JSON strict, exactement cette forme (c'est ce que `ecranResultat()` sait rendre) :

```jsonc
{
  "saison": {
    "nom": "Automne Chaud",
    "description": "…",
    "palette":   [{ "nom": "Terracotta", "hex": "#C0653B" }],   // 5 à 8 entrées
    "interdits": ["Noir pur", "Blanc optique", "Argenté brillant"],  // exactement 3
    "metaux":    "Or, bronze, laiton — finitions mates"
  },
  "regles_morpho":    ["Coupes amples pour équilibrer la carrure…"],
  "vibes":            ["Ivy League", "Workwear"],
  "pieces_signature": ["🎓 Blazer croisé", "🔨 Fatigue pant"],
  "capsule": [{
    "nom": "Blazer en laine croisé",
    "categorie": "Vestes / Manteaux",         // sert au groupage de l'affichage
    "saison_portee": "toute l'année",         // "hiver" | "été" | "toute l'année"
    "couleur": "Marine",
    "matiere": "Laine",
    "marques": [{ "nom": "Suitsupply", "url": "https://suitsupply.com" }],
    "budget": "250 – 400 €"
  }],                                          // 15 à 20 pièces
  "accessoires": "<p>Montres : …</p>",         // HTML libre, ou null
  "commentaire": null                          // texte affiché en bas, ou null
}
```

En cas d'erreur : renvoyer un statut HTTP ≠ 2xx — le front affiche un écran d'erreur avec bouton « Réessayer ».

### Notes d'implémentation backend

- **Vercel** build le site Hugo nativement ; la function va dans `api/analyse.js` (ou `.ts`).
- SDK `@anthropic-ai/sdk`, modèle **`claude-opus-5`** — multimodal : le selfie passe en bloc `{ type: "image", source: { type: "base64", media_type: "image/jpeg", data } }` dans le message user (retirer le préfixe `data:image/jpeg;base64,` de la chaîne avant de l'envoyer).
- **Sortie structurée** : utiliser `output_config: { format: … }` avec le JSON Schema du contrat ci-dessus, plutôt que demander « réponds en JSON » dans le prompt.
- Clé API en variable d'environnement Vercel — **jamais** dans le client.
- Prompt système : « Expert senior en personal shopping masculin, colorimétrie des 4 saisons et architecture de garde-robe capsule. » Lui passer le payload complet ; insister sur : capsule **adaptée aux vibes aimées** (un rockeur ne reçoit pas de blazer Ivy), au contexte, au budget mensuel, et sur des marques réelles avec URLs valides.
- `data/onboarding.yaml` reste utile comme **référentiel** (les 9 saisons avec palettes HEX, les vibes et leurs signatures) : à passer au modèle comme base de vérité, ou à garder juste pour le mode démo.
- Prévoir un rate-limit basique sur la function (sinon ta clé paie l'internet entier).

### Autres points à traiter en local

- [ ] **(Optionnel) Repo « template »** pour le partage : `Settings → General → cocher « Template repository »` — les proches créent leur Vestiaire en un clic.
- [ ] **Stockage du profil** : aujourd'hui `localStorage` (1 personne = 1 navigateur), la photo n'est jamais persistée. Si tu veux des comptes multi-appareils, c'est une décision d'architecture à prendre ensemble — ne rien improviser.

## 8. Rappels d'architecture (pour ne pas casser)

- Résolution d'image : front matter `image` → convention `static/img/…/<slug>.jpg` → silhouette teintée (`data/couleurs.yaml`). Nouvelle couleur = nouvelle entrée dans ce fichier.
- `index.json` embarque le HTML des vignettes : toute évolution du partial `vignette.html` profite automatiquement au Studio.
- Jamais de hotlinking d'images externes (hors-ligne + pérennité) : tout dans le repo, compressé.
- `hugo --minify` doit passer sans erreur avant tout commit ; commits en français au présent.
