/* Studio : composeur de tenues en planche visuelle (flat lay).
   Données depuis index.json (avec vignettes HTML pré-rendues), brouillons en localStorage.
   Slots : 1 veste, 2 hauts (superposition), 1 pantalon, 1 chaussures, accessoires illimités —
   taper une pièce d'un slot plein remplace la plus ancienne. */
(async () => {
  const root = document.getElementById('studio');
  const CATS = ['veste', 'haut', 'pantalon', 'chaussures', 'accessoire'];
  const LIMITES = { veste: 1, haut: 2, pantalon: 1, chaussures: 1, accessoire: Infinity };
  const LABELS = { veste: 'Veste', haut: 'Haut', pantalon: 'Pantalon', chaussures: 'Chaussures', accessoire: 'Accessoires' };
  const LS_KEY = 'vestiaire-tenues';
  let pieces = [];
  let selection = []; // slugs, ordre d'ajout
  let filtre = '';

  try {
    const res = await fetch(root.dataset.index);
    pieces = (await res.json()).pieces.filter(p => p.statut !== 'vendu');
  } catch (e) {
    document.getElementById('inventaire').innerHTML = '<p class="muted">Impossible de charger la garde-robe (hors-ligne ?).</p>';
    return;
  }

  const bySlug = Object.fromEntries(pieces.map(p => [p.slug, p]));

  /* Pièce candidate (US 4.2) : éphémère, vit en mémoire, jamais committée
     ni sauvegardée — elle disparaît en quittant la page. */
  const SLUG_CANDIDATE = '__candidate__';
  function ajouterCandidate({ image, lien, categorie }) {
    const p = {
      slug: SLUG_CANDIDATE, titre: 'Pièce à tester', categorie,
      couleur: '', marque: lien ? new URL(lien).hostname.replace('www.', '') : 'en magasin',
      statut: 'a-acquerir', lien: lien || '', candidate: true,
      vignette: image
        ? `<div class="vignette"><img src="${image}" alt="Pièce à tester"></div>`
        : '<div class="vignette vignette-creuse"></div>',
    };
    pieces = pieces.filter(x => x.slug !== SLUG_CANDIDATE).concat(p);
    bySlug[SLUG_CANDIDATE] = p;
    selection = selection.filter(s => s !== SLUG_CANDIDATE);
    toggle(SLUG_CANDIDATE);
    afficherVerdict(p);
  }

  /* La règle des 3 tenues : combien de tenues complètes (haut + bas +
     chaussures) la candidate permet-elle avec les pièces possédées ? */
  function afficherVerdict(candidate) {
    const possedees = c => pieces.filter(p => p.statut === 'possede' && p.categorie === c);
    const compte = { haut: possedees('haut').length, pantalon: possedees('pantalon').length, chaussures: possedees('chaussures').length };
    if (candidate.categorie in compte) compte[candidate.categorie] = Math.max(1, compte[candidate.categorie]);
    const tenues = candidate.categorie === 'veste' || candidate.categorie === 'accessoire'
      ? compte.haut * compte.pantalon * compte.chaussures
      : ['haut', 'pantalon', 'chaussures'].filter(c => c !== candidate.categorie)
          .reduce((n, c) => n * compte[c], 1);

    const box = document.getElementById('verdict');
    const BASE = { haut: 'hauts', pantalon: 'pantalons', chaussures: 'chaussures' };
    const detail = Object.entries(BASE).map(([c, label]) => `${possedees(c).length} ${label}`).join(' · ');

    /* Le test n'a de sens que si chaque brique d'une tenue existe : une seule
       catégorie vide donnerait « 0 tenue », ce qui parlerait de ta garde-robe,
       pas de la pièce testée. */
    const manquantes = Object.entries(BASE)
      .filter(([c]) => c !== candidate.categorie && possedees(c).length === 0)
      .map(([, label]) => label);

    if (manquantes.length) {
      box.innerHTML = `<div class="verdict verdict-non">
        ℹ️ <strong>Impossible de trancher :</strong> tu n'as aucun${manquantes.length > 1 ? 'e de ces catégories' : ''} <strong>${manquantes.join(' ni ')}</strong> en statut « possédé ».
        Passe tes vraies pièces en <code>statut: possede</code> et le test des 3 tenues deviendra fiable.
        <br><span class="muted">Base comptée : ${detail}.</span>
      </div>`;
      return;
    }

    const assez = tenues >= 3;
    box.innerHTML = `<div class="verdict ${assez ? 'verdict-ok' : 'verdict-non'}">
      ${assez
        ? `✅ <strong>${tenues} tenues possibles</strong> avec ce que tu possèdes déjà — la pièce s'intègre.`
        : `⚠️ <strong>${tenues} tenue${tenues > 1 ? 's' : ''} seulement</strong> avec ce que tu possèdes. En dessous de 3, repose-la (ou complète d'abord ta base).`}
      <br><span class="muted">Base comptée : ${detail} en statut « possédé ».</span>
    </div>`;
  }

  function toggle(slug) {
    const i = selection.indexOf(slug);
    if (i >= 0) { selection.splice(i, 1); render(); return; }
    const cat = bySlug[slug].categorie;
    const memesCat = selection.filter(s => bySlug[s] && bySlug[s].categorie === cat);
    if (memesCat.length >= LIMITES[cat]) {
      selection.splice(selection.indexOf(memesCat[0]), 1); // remplace la plus ancienne
    }
    selection.push(slug);
    render();
  }

  function carteInventaire(p) {
    const el = document.createElement('div');
    el.className = 'card carte-piece' + (selection.includes(p.slug) ? ' is-selected' : '') + (p.candidate ? ' candidate' : '');
    el.innerHTML = `${p.vignette}
      <span class="badge badge-${p.statut}">${p.statut.replace(/-/g, ' ')}</span>
      <h3>${p.titre}</h3><p>${[p.marque, p.couleur].filter(Boolean).join(' · ')}</p>`;
    el.addEventListener('click', () => toggle(p.slug));
    return el;
  }

  function renderPlanche() {
    const planche = document.getElementById('selection');
    planche.innerHTML = '';
    let vide = true;
    CATS.forEach(cat => {
      const slugs = selection.filter(s => bySlug[s] && bySlug[s].categorie === cat);
      if (!slugs.length) {
        const slot = document.createElement('div');
        slot.className = 'slot slot-vide';
        slot.innerHTML = `<div class="vignette vignette-creuse"></div><span class="slot-titre">${LABELS[cat]}</span>`;
        planche.appendChild(slot);
        return;
      }
      vide = false;
      slugs.forEach(s => {
        const p = bySlug[s];
        const slot = document.createElement('div');
        slot.className = 'slot' + (p.candidate ? ' candidate' : '');
        slot.innerHTML = `${p.vignette}<span class="slot-titre">${p.titre}${p.candidate ? ' <em>(à tester)</em>' : ''}</span>`;
        slot.title = 'Retirer';
        slot.addEventListener('click', () => toggle(s));
        planche.appendChild(slot);
      });
    });
    planche.classList.toggle('planche-vide', vide);
    document.getElementById('compte').textContent = selection.length ? `(${selection.length})` : '';
  }

  function render() {
    // filtres catégories
    const fg = document.getElementById('cat-filtres');
    fg.innerHTML = '';
    ['', ...CATS].forEach(c => {
      const b = document.createElement('button');
      b.className = 'chip' + (filtre === c ? ' is-active' : '');
      b.textContent = c === '' ? 'Tout' : LABELS[c] + (c === 'accessoire' || c === 'chaussures' ? '' : 's');
      b.addEventListener('click', () => { filtre = c; render(); });
      fg.appendChild(b);
    });

    // inventaire
    const inv = document.getElementById('inventaire');
    inv.innerHTML = '';
    const visibles = pieces.filter(p => !filtre || p.categorie === filtre);
    if (!visibles.length) inv.innerHTML = '<p class="muted">Aucune pièce dans cette catégorie.</p>';
    visibles.forEach(p => inv.appendChild(carteInventaire(p)));

    renderPlanche();
    renderBrouillons();
  }

  function brouillons() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (e) { return []; }
  }

  function renderBrouillons() {
    const list = brouillons();
    document.getElementById('brouillons-section').hidden = !list.length;
    const el = document.getElementById('brouillons');
    el.innerHTML = '';
    list.forEach((t, i) => {
      const c = document.createElement('div');
      c.className = 'card';
      const minis = t.pieces.map(s => bySlug[s] ? `<span class="mini">${bySlug[s].vignette}</span>` : '').join('');
      c.innerHTML = `<div class="mini-planche">${minis}</div><h3>${t.nom}</h3>`;
      const load = document.createElement('button');
      load.className = 'chip'; load.textContent = 'Charger';
      load.addEventListener('click', () => { selection = t.pieces.filter(s => bySlug[s]); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      const del = document.createElement('button');
      del.className = 'chip'; del.textContent = 'Supprimer';
      del.addEventListener('click', () => {
        const l = brouillons(); l.splice(i, 1);
        try { localStorage.setItem(LS_KEY, JSON.stringify(l)); } catch (e) {}
        renderBrouillons();
      });
      c.append(load, del);
      el.appendChild(c);
    });
  }

  /* La candidate n'existe pas dans le repo : on ne la garde ni ne l'exporte. */
  const selectionReelle = () => selection.filter(s => s !== SLUG_CANDIDATE);

  document.getElementById('sauver').addEventListener('click', () => {
    const pieces = selectionReelle();
    if (!pieces.length) return;
    const nom = document.getElementById('nom-tenue').value.trim() || 'Tenue sans nom';
    const l = brouillons();
    l.unshift({ nom, pieces });
    try { localStorage.setItem(LS_KEY, JSON.stringify(l)); } catch (e) {}
    renderBrouillons();
  });

  document.getElementById('exporter').addEventListener('click', () => {
    const pieces = selectionReelle();
    if (!pieces.length) return;
    const nom = document.getElementById('nom-tenue').value.trim() || 'Nouvelle tenue';
    const slug = nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ordonnee = CATS.flatMap(c => pieces.filter(s => bySlug[s].categorie === c));
    const md = `---\ntitle: "${nom}"\npieces: [${ordonnee.join(', ')}]\noccasion: \nsaison: []\n---\n`;
    const pre = document.getElementById('export');
    pre.hidden = false;
    pre.textContent = `# À enregistrer dans content/tenues/${slug}.md\n# (ou dis à Claude : « crée la tenue ${nom} avec ces pièces »)\n`
      + (selection.length > pieces.length ? '# (la pièce à tester n\'est pas incluse — ajoute-la d\'abord à ta garde-robe)\n' : '')
      + `\n${md}`;
    navigator.clipboard && navigator.clipboard.writeText(md).catch(() => {});
  });

  document.getElementById('viderBtn').addEventListener('click', () => { selection = []; render(); });

  /* Formulaire « Tester une pièce » (US 4.2) */
  let photoCandidate = null;
  const champPhoto = document.getElementById('photo-candidate');
  champPhoto.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const lecteur = new FileReader();
    lecteur.onerror = () => {
      document.getElementById('verdict').innerHTML = '<div class="verdict verdict-non">⚠️ Photo illisible — réessaie avec un autre fichier.</div>';
    };
    lecteur.onload = () => { photoCandidate = lecteur.result; document.getElementById('ajouter-candidate').click(); };
    lecteur.readAsDataURL(f);
  });

  document.getElementById('ajouter-candidate').addEventListener('click', () => {
    const lienBrut = document.getElementById('lien-candidate').value.trim();
    let lien = '';
    if (lienBrut) {
      try { const u = new URL(lienBrut); if (u.protocol === 'http:' || u.protocol === 'https:') lien = u.href; } catch (e) {}
      if (!lien) { document.getElementById('verdict').innerHTML = '<div class="verdict verdict-non">⚠️ Lien invalide — colle une adresse commençant par https://</div>'; return; }
    }
    if (!photoCandidate && !lien) {
      document.getElementById('verdict').innerHTML = '<div class="verdict verdict-non">⚠️ Ajoute une photo ou un lien produit pour tester la pièce.</div>';
      return;
    }
    ajouterCandidate({ image: photoCandidate, lien, categorie: document.getElementById('cat-candidate').value });
    // La photo ne vaut que pour la pièce qu'on vient de tester.
    photoCandidate = null;
    champPhoto.value = '';
  });

  render();
})();
