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

- [ ] **(Optionnel) Repo « template »** pour le partage : `Settings → General → cocher « Template repository »`. Les proches créent alors leur Vestiaire en un clic (« Use this template ») au lieu d'un fork. Le bouton final du wizard pointe sur `/fork` — le mettre à jour vers `/generate` si tu actives le template.
- [ ] **Analyse selfie par IA (US 1.1 + 2.1 de Gemini)** — impossible en statique pur : exposer une clé API dans une page publique = clé volée en quelques heures. Deux options quand tu voudras la vraie version :
  1. **Sans backend (recommandé pour commencer)** : le wizard génère déjà le « prompt IA » complet (auto-diagnostic + consignes selfie) → l'utilisateur le colle dans sa propre session Claude/Gemini. Zéro infra, zéro coût pour toi, déjà livré.
  2. **Avec backend (Vercel)** : migrer l'hébergement vers Vercel (le repo est un site Hugo, Vercel le build nativement) + une serverless function `/api/analyse` qui reçoit le selfie (base64) + les réponses du wizard, appelle l'API Anthropic côté serveur (clé en variable d'environnement Vercel, jamais dans le client) et renvoie le JSON profil. Points techniques pour la session locale :
     - SDK : `@anthropic-ai/sdk`, modèle **`claude-opus-5`** (multimodal : bloc `{type: "image", source: {type: "base64", media_type: "image/jpeg", data: …}}` dans le message user).
     - Sortie structurée : utiliser `output_config: {format: …}` (JSON strict) plutôt que « réponds en JSON » dans le prompt.
     - Le prompt système est déjà rédigé : c'est `exportPromptIA()` dans `static/js/onboarding.js`, à transposer côté serveur (rôle système « Expert Senior en Personal Shopping Masculin… », sortie : saison + palette HEX + interdits + règles morpho + capsule 15-20 pièces + accessoires).
     - Prévoir un rate-limit basique sur la function (sinon ta clé paie l'internet entier).
- [ ] **Caméra guidée avec masque ovale (US 1.1)** : faisable en statique (`getUserMedia` + overlay), mais ne sert à rien tant que l'analyse IA n'existe pas — la traiter avec l'option 2 ci-dessus.
- [ ] **Multi-profils / comptes** : hors modèle statique. Le choix assumé : 1 personne = 1 navigateur (localStorage) pour tester, 1 personne = 1 repo pour adopter. Ne pas partir sur un backend d'auth sans y avoir vraiment réfléchi.

## 8. Rappels d'architecture (pour ne pas casser)

- Résolution d'image : front matter `image` → convention `static/img/…/<slug>.jpg` → silhouette teintée (`data/couleurs.yaml`). Nouvelle couleur = nouvelle entrée dans ce fichier.
- `index.json` embarque le HTML des vignettes : toute évolution du partial `vignette.html` profite automatiquement au Studio.
- Jamais de hotlinking d'images externes (hors-ligne + pérennité) : tout dans le repo, compressé.
- `hugo --minify` doit passer sans erreur avant tout commit ; commits en français au présent.
