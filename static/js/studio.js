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
    el.className = 'card carte-piece' + (selection.includes(p.slug) ? ' is-selected' : '');
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
        slot.className = 'slot';
        slot.innerHTML = `${p.vignette}<span class="slot-titre">${p.titre}</span>`;
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

  document.getElementById('sauver').addEventListener('click', () => {
    if (!selection.length) return;
    const nom = document.getElementById('nom-tenue').value.trim() || 'Tenue sans nom';
    const l = brouillons();
    l.unshift({ nom, pieces: [...selection] });
    try { localStorage.setItem(LS_KEY, JSON.stringify(l)); } catch (e) {}
    renderBrouillons();
  });

  document.getElementById('exporter').addEventListener('click', () => {
    if (!selection.length) return;
    const nom = document.getElementById('nom-tenue').value.trim() || 'Nouvelle tenue';
    const slug = nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ordonnee = CATS.flatMap(c => selection.filter(s => bySlug[s].categorie === c));
    const md = `---\ntitle: "${nom}"\npieces: [${ordonnee.join(', ')}]\noccasion: \nsaison: []\n---\n`;
    const pre = document.getElementById('export');
    pre.hidden = false;
    pre.textContent = `# À enregistrer dans content/tenues/${slug}.md\n# (ou dis à Claude : « crée la tenue ${nom} avec ces pièces »)\n\n${md}`;
    navigator.clipboard && navigator.clipboard.writeText(md).catch(() => {});
  });

  document.getElementById('viderBtn').addEventListener('click', () => { selection = []; render(); });

  render();
})();
