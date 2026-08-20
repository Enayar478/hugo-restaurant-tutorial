/* Studio : composeur de tenues. Données depuis index.json, brouillons en localStorage. */
(async () => {
  const root = document.getElementById('studio');
  const CATS = ['veste', 'haut', 'pantalon', 'chaussures', 'accessoire'];
  const LS_KEY = 'vestiaire-tenues';
  let pieces = [];
  let selection = new Set();
  let filtre = '';

  try {
    const res = await fetch(root.dataset.index);
    pieces = (await res.json()).pieces.filter(p => p.statut !== 'vendu');
  } catch (e) {
    document.getElementById('inventaire').innerHTML = '<p class="muted">Impossible de charger la garde-robe (hors-ligne ?).</p>';
    return;
  }

  const bySlug = Object.fromEntries(pieces.map(p => [p.slug, p]));

  function carte(p) {
    const el = document.createElement('div');
    el.className = 'card' + (selection.has(p.slug) ? ' is-selected' : '');
    el.style.cursor = 'pointer';
    el.innerHTML = `<span class="badge badge-${p.statut}">${p.statut.replace(/-/g, ' ')}</span>
      <h3>${p.titre}</h3><p>${[p.marque, p.couleur].filter(Boolean).join(' · ')}</p>`;
    el.addEventListener('click', () => {
      selection.has(p.slug) ? selection.delete(p.slug) : selection.add(p.slug);
      render();
    });
    return el;
  }

  function render() {
    // filtres catégories
    const fg = document.getElementById('cat-filtres');
    fg.innerHTML = '';
    ['', ...CATS].forEach(c => {
      const b = document.createElement('button');
      b.className = 'chip' + (filtre === c ? ' is-active' : '');
      b.textContent = c === '' ? 'Tout' : c.charAt(0).toUpperCase() + c.slice(1) + 's';
      b.addEventListener('click', () => { filtre = c; render(); });
      fg.appendChild(b);
    });

    // inventaire
    const inv = document.getElementById('inventaire');
    inv.innerHTML = '';
    const visibles = pieces.filter(p => !filtre || p.categorie === filtre);
    if (!visibles.length) inv.innerHTML = '<p class="muted">Aucune pièce dans cette catégorie.</p>';
    visibles.forEach(p => inv.appendChild(carte(p)));

    // sélection
    const sel = document.getElementById('selection');
    sel.innerHTML = '';
    if (!selection.size) {
      sel.innerHTML = '<p class="muted">Touche des pièces ci-dessous pour les ajouter.</p>';
    } else {
      [...selection].forEach(s => { if (bySlug[s]) sel.appendChild(carte(bySlug[s])); });
    }
    document.getElementById('compte').textContent = selection.size ? `(${selection.size})` : '';
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
      c.innerHTML = `<h3>${t.nom}</h3><p>${t.pieces.map(s => bySlug[s] ? bySlug[s].titre : s).join(' + ')}</p>`;
      const load = document.createElement('button');
      load.className = 'chip'; load.textContent = 'Charger';
      load.addEventListener('click', () => { selection = new Set(t.pieces); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
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
    if (!selection.size) return;
    const nom = document.getElementById('nom-tenue').value.trim() || 'Tenue sans nom';
    const l = brouillons();
    l.unshift({ nom, pieces: [...selection] });
    try { localStorage.setItem(LS_KEY, JSON.stringify(l)); } catch (e) {}
    renderBrouillons();
  });

  document.getElementById('exporter').addEventListener('click', () => {
    if (!selection.size) return;
    const nom = document.getElementById('nom-tenue').value.trim() || 'Nouvelle tenue';
    const slug = nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const md = `---\ntitle: "${nom}"\npieces: [${[...selection].join(', ')}]\noccasion: \nsaison: []\n---\n`;
    const pre = document.getElementById('export');
    pre.hidden = false;
    pre.textContent = `# À enregistrer dans content/tenues/${slug}.md\n# (ou dis à Claude : « crée la tenue ${nom} avec ces pièces »)\n\n${md}`;
    navigator.clipboard && navigator.clipboard.writeText(md).catch(() => {});
  });

  document.getElementById('viderBtn').addEventListener('click', () => { selection.clear(); render(); });

  render();
})();
