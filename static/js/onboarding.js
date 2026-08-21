/* Onboarding : le parcours personal shopper digitalisé.
   Diagnostic colorimétrique auto-évalué (méthode des 4 saisons : veines, bijoux,
   soleil, cheveux, yeux, peau), morphologie, vibe check, puis génération de la
   fiche profil + capsule. Profil sauvé en localStorage (par appareil), exports
   Markdown et prompt IA pour affiner en session LLM avec un selfie. */
(() => {
  const DATA = window.ONBOARDING_DATA;
  const REPO = window.VESTIAIRE_REPO;
  const LS_PROFIL = 'vestiaire-profil';
  const wizard = document.getElementById('wizard');
  const barre = document.getElementById('barre');

  /* Chaque réponse porte [chaleur, profondeur] : chaleur > 0 = chaud,
     profondeur > 0 = foncé/intense. La somme détermine la saison. */
  const QUESTIONS_COLO = [
    { id: 'veines', q: 'Regarde les veines de ton poignet à la lumière du jour :', opts: [
      ['Plutôt vertes', 2, 0], ['Plutôt bleues / violettes', -2, 0], ['Un mélange des deux', 0, 0]] },
    { id: 'bijoux', q: 'Quel métal te donne meilleure mine près du visage ?', opts: [
      ['L\'or (doré)', 2, 0], ['L\'argent', -2, 0], ['Les deux se valent', 0, 0]] },
    { id: 'soleil', q: 'Au soleil, ta peau…', opts: [
      ['Bronze facilement, dorée', 1, 0], ['Prend des coups de soleil, rougit', -1, 0], ['Rougit puis finit par bronzer', 0, 0]] },
    { id: 'cheveux', q: 'Ta couleur de cheveux naturelle :', opts: [
      ['Noir profond', -1, 2], ['Brun froid / cendré', -1, 1], ['Brun chaud / châtain', 1, 1],
      ['Roux / auburn', 2, 0], ['Blond doré', 1, -1], ['Blond cendré', -1, -1], ['Gris / blanc', 0, -1]] },
    { id: 'yeux', q: 'La couleur de tes yeux :', opts: [
      ['Marron très foncé', 0, 2], ['Noisette / vert doré', 1, 1], ['Vert', 1, 0],
      ['Bleu', -1, -1], ['Gris', -1, 0]] },
    { id: 'peau', q: 'Le sous-ton de ta peau (sans bronzage) :', opts: [
      ['Porcelaine rosée', -1, -1], ['Ivoire pêche', 1, -1], ['Beige doré', 1, 0],
      ['Olive', 0, 1], ['Mate dorée', 1, 1], ['Foncée', 0, 2]] },
  ];

  const QUESTIONS_MORPHO = [
    { id: 'carrure', q: 'Ta carrure :', opts: ['Épaules larges / carrées', 'Moyenne', 'Fine / étroite'] },
    { id: 'ventre', q: 'Ton ventre :', opts: ['Plat', 'Léger', 'Présent'] },
    { id: 'jambes', q: 'Tes jambes par rapport à ton buste :', opts: ['Plutôt courtes', 'Proportionnées', 'Plutôt longues'] },
  ];

  const CONTEXTES = ['Bureau formel', 'Casual pro', 'Télétravail', 'Terrain / manuel'];
  const BUDGETS = ['< 100 €/mois', '100 – 250 €/mois', '250 – 500 €/mois', '> 500 €/mois'];

  const etat = {
    colo: {}, coloLabels: {}, morpho: {}, taille: '',
    vibes: [], icones: [], contexte: '', budget: '',
  };
  let etape = 0;
  const NB_ETAPES = 5;

  function maj(html) {
    wizard.innerHTML = html;
    barre.style.width = `${(etape / (NB_ETAPES - 1)) * 100}%`;
    window.scrollTo({ top: 0 });
  }

  /* ── Étape 0 : intro ── */
  function ecranIntro() {
    etape = 0;
    const profil = profilSauve();
    maj(`
      <h1>Créer ton profil</h1>
      <p class="lead">Le parcours complet du personal shopper : colorimétrie, morphologie, style — et à la fin, ta palette et ta garde-robe capsule personnalisées.</p>
      ${profil ? `<div class="hint">👤 Un profil <strong>${profil.saison.nom}</strong> est déjà enregistré sur cet appareil. <button class="chip" id="voir-profil">Le revoir</button> ou recommence le parcours ci-dessous.</div>` : ''}
      <div class="carte-etapes">
        <p>① <strong>Tes couleurs</strong> — 6 questions d'observation (2 min, lumière du jour recommandée)</p>
        <p>② <strong>Ta silhouette</strong> — pour les règles de coupe</p>
        <p>③ <strong>Ta vibe</strong> — univers, icônes, quotidien, budget</p>
        <p>④ <strong>Ton profil</strong> — saison, palette, interdits, capsule complète</p>
      </div>
      <p class="hint">📷 Astuce : le résultat sera encore plus précis si tu le fais valider ensuite par une IA avec un selfie — le bouton « Copier le prompt IA » de la fin prépare tout.</p>
      <button class="btn" id="commencer">C'est parti →</button>
    `);
    document.getElementById('commencer').addEventListener('click', () => ecranColo(0));
    const vp = document.getElementById('voir-profil');
    if (vp) vp.addEventListener('click', () => { ecranResultat(profil); });
  }

  /* ── Étape 1 : colorimétrie ── */
  function ecranColo(i) {
    etape = 1;
    const q = QUESTIONS_COLO[i];
    maj(`
      <p class="muted">Tes couleurs — question ${i + 1}/${QUESTIONS_COLO.length}</p>
      <h2 class="wizard-q">${q.q}</h2>
      <div class="choix" id="choix"></div>
    `);
    const box = document.getElementById('choix');
    q.opts.forEach(([label, w, d]) => {
      const b = document.createElement('button');
      b.className = 'choix-carte';
      b.textContent = label;
      b.addEventListener('click', () => {
        etat.colo[q.id] = [w, d];
        etat.coloLabels[q.id] = label;
        i + 1 < QUESTIONS_COLO.length ? ecranColo(i + 1) : ecranMorpho(0);
      });
      box.appendChild(b);
    });
  }

  /* ── Étape 2 : morphologie ── */
  function ecranMorpho(i) {
    etape = 2;
    const q = QUESTIONS_MORPHO[i];
    maj(`
      <p class="muted">Ta silhouette — question ${i + 1}/${QUESTIONS_MORPHO.length}</p>
      <h2 class="wizard-q">${q.q}</h2>
      <div class="choix" id="choix"></div>
    `);
    const box = document.getElementById('choix');
    q.opts.forEach(label => {
      const b = document.createElement('button');
      b.className = 'choix-carte';
      b.textContent = label;
      b.addEventListener('click', () => {
        etat.morpho[q.id] = label;
        i + 1 < QUESTIONS_MORPHO.length ? ecranMorpho(i + 1) : ecranVibes();
      });
      box.appendChild(b);
    });
  }

  /* ── Étape 3 : vibes, icônes, contexte, budget ── */
  function ecranVibes() {
    etape = 3;
    maj(`
      <p class="muted">Ta vibe</p>
      <h2 class="wizard-q">Quels univers te parlent ? <span class="muted">(1 à 3 choix)</span></h2>
      <div class="choix choix-grille" id="vibes"></div>
      <h2 class="wizard-q">Tes références <span class="muted">(optionnel)</span></h2>
      <div class="choix choix-grille" id="icones"></div>
      <h2 class="wizard-q">Ton quotidien</h2>
      <div class="choix" id="contextes"></div>
      <h2 class="wizard-q">Ton budget vêtements</h2>
      <div class="choix" id="budgets"></div>
      <button class="btn" id="valider" disabled>Voir mon profil →</button>
    `);

    const valider = document.getElementById('valider');
    const verifier = () => {
      valider.disabled = !(etat.vibes.length && etat.contexte && etat.budget);
    };

    const vb = document.getElementById('vibes');
    DATA.vibes.forEach(v => {
      const b = document.createElement('button');
      b.className = 'choix-carte choix-vibe';
      b.innerHTML = `<strong>${v.emoji} ${v.nom}</strong><span>${v.description}</span>`;
      b.addEventListener('click', () => {
        const i = etat.vibes.indexOf(v.id);
        if (i >= 0) etat.vibes.splice(i, 1);
        else if (etat.vibes.length < 3) etat.vibes.push(v.id);
        b.classList.toggle('is-active', etat.vibes.includes(v.id));
        verifier();
      });
      vb.appendChild(b);
    });

    const ic = document.getElementById('icones');
    DATA.icones.forEach(p => {
      const b = document.createElement('button');
      b.className = 'choix-carte';
      b.textContent = p.nom;
      b.addEventListener('click', () => {
        const i = etat.icones.indexOf(p.nom);
        i >= 0 ? etat.icones.splice(i, 1) : etat.icones.push(p.nom);
        b.classList.toggle('is-active', etat.icones.includes(p.nom));
      });
      ic.appendChild(b);
    });

    const monoChoix = (elId, valeurs, cle) => {
      const box = document.getElementById(elId);
      valeurs.forEach(v => {
        const b = document.createElement('button');
        b.className = 'choix-carte';
        b.textContent = v;
        b.addEventListener('click', () => {
          etat[cle] = v;
          box.querySelectorAll('.choix-carte').forEach(c => c.classList.remove('is-active'));
          b.classList.add('is-active');
          verifier();
        });
        box.appendChild(b);
      });
    };
    monoChoix('contextes', CONTEXTES, 'contexte');
    monoChoix('budgets', BUDGETS, 'budget');

    valider.addEventListener('click', () => {
      const profil = construireProfil();
      sauver(profil);
      ecranResultat(profil);
    });
  }

  /* ── Le diagnostic ── */
  function diagnostiquer() {
    let W = 0, D = 0;
    Object.values(etat.colo).forEach(([w, d]) => { W += w; D += d; });
    let cle;
    if (W >= 1) {
      if (D >= 1) cle = W >= 3 ? 'automne-chaud' : (D >= 3 ? 'automne-profond' : 'automne-doux');
      else cle = D <= -2 ? 'printemps-clair' : 'printemps-chaud';
    } else {
      if (D >= 1) cle = D >= 3 ? 'hiver-profond' : 'hiver-froid';
      else cle = D <= -2 ? 'ete-clair' : 'ete-doux';
    }
    return { cle, W, D };
  }

  function reglesMorpho() {
    const r = [];
    const m = etat.morpho;
    if (m.carrure === 'Épaules larges / carrées') r.push('Coupes amples et fluides pour équilibrer la carrure — éviter le très cintré et les épaulettes marquées.');
    if (m.carrure === 'Fine / étroite') r.push('Structurer le haut : épaules légèrement construites, superpositions (chemise + pull + veste), matières texturées.');
    if (m.carrure === 'Moyenne') r.push('Carrure équilibrée : la plupart des coupes fonctionnent, viser le tombé naturel de l\'épaule.');
    if (m.ventre !== 'Plat') r.push('Taille haute portée au nombril : elle allonge la jambe et structure le buste — bannir la taille basse qui coupe au mauvais endroit.');
    else r.push('Taille haute recommandée quand même : c\'est elle qui donne la silhouette héritage.');
    if (m.jambes === 'Plutôt courtes') r.push('Allonger la jambe : taille haute, pas ou peu de revers, chaussures dans les tons du pantalon.');
    if (m.jambes === 'Plutôt longues') r.push('Tu peux te permettre revers généreux et pantalons à plis.');
    r.push('Règle générale : ample ne veut pas dire informe — le volume se porte avec une taille marquée.');
    return r;
  }

  function construireProfil() {
    const diag = diagnostiquer();
    const saison = DATA.saisons[diag.cle];
    return {
      version: 1,
      date: new Date().toISOString().slice(0, 10),
      saisonCle: diag.cle,
      saison,
      scores: { chaleur: diag.W, profondeur: diag.D },
      reponses: { ...etat.coloLabels },
      morpho: { ...etat.morpho },
      regles: reglesMorpho(),
      vibes: etat.vibes,
      icones: etat.icones,
      contexte: etat.contexte,
      budget: etat.budget,
    };
  }

  /* ── Étape 4 : résultat ── */
  function ecranResultat(profil) {
    etape = 4;
    const s = profil.saison;
    const vibesChoisies = DATA.vibes.filter(v => profil.vibes.includes(v.id));

    const pastilles = s.palette.map(c =>
      `<button class="pastille" data-hex="${c.hex}" title="Copier ${c.hex}">
        <span class="pastille-rond" style="background:${c.hex}"></span>
        <span class="pastille-nom">${c.nom}</span>
      </button>`).join('');

    const capsuleParCat = {};
    DATA.capsule.forEach(item => {
      const roles = Array.isArray(item.role) ? item.role : [item.role];
      const couleurs = roles.map(r => s.roles[r] || r).join(', ');
      (capsuleParCat[item.categorie] = capsuleParCat[item.categorie] || []).push({ ...item, couleurs });
    });
    const capsuleHtml = Object.entries(capsuleParCat).map(([cat, items]) => `
      <h3>${cat}</h3>
      <div class="cards">${items.map(i => `
        <div class="card">
          <h3>${i.nom}</h3>
          <p><strong>${i.couleurs}</strong> · ${i.matiere}</p>
          <p class="muted">${i.marques} · ${i.budget}</p>
        </div>`).join('')}
      </div>`).join('');

    const signatures = vibesChoisies.flatMap(v => v.signatures.map(sg => `<li>${v.emoji} ${sg}</li>`)).join('');

    maj(`
      <h1>${s.nom}</h1>
      <p class="lead">${s.description}</p>

      <h2>Ta palette</h2>
      <div class="pastilles">${pastilles}</div>
      <p class="hint">🚫 <strong>À bannir :</strong> ${s.interdits.join(' · ')}<br>⌚ <strong>Métaux :</strong> ${s.metaux}</p>

      <h2>Tes règles de coupe</h2>
      <ul>${profil.regles.map(r => `<li>${r}</li>`).join('')}</ul>

      <h2>Ta vibe</h2>
      <p>${vibesChoisies.map(v => `${v.emoji} <strong>${v.nom}</strong>`).join(' · ')}${profil.icones.length ? ` — dans l'esprit de ${profil.icones.join(', ')}` : ''}</p>
      <p class="muted">Quotidien : ${profil.contexte} · Budget : ${profil.budget}</p>
      <h3>Tes pièces signature</h3>
      <ul>${signatures}</ul>

      <h2>Ta garde-robe capsule</h2>
      <p class="muted">15 à 20 pièces qui vont toutes ensemble, dans TA palette. ${profil.budget.startsWith('<') ? 'Avec ton budget, vise d\'abord la seconde main (Vinted, Vestiaire Collective) et les basiques Uniqlo U — la capsule se construit en 12-18 mois.' : 'Construis-la pièce par pièce, la polyvalence avant la quantité.'}</p>
      ${capsuleHtml}

      <h2>Et maintenant ?</h2>
      <div class="rack-actions">
        <button class="btn" id="copier-md">📄 Copier mon profil (Markdown)</button>
        <button class="btn" id="copier-ia">🤖 Copier le prompt IA (analyse selfie)</button>
        <button class="btn btn-ghost" id="refaire">↺ Refaire le parcours</button>
      </div>
      <p class="hint">📷 <strong>L'étape d'après :</strong> colle le « prompt IA » dans une session Claude ou Gemini avec un selfie (lumière du jour, sans filtre, fond neutre, pas de lunettes teintées) — l'IA confirmera ou affinera ta saison.</p>
      <p class="hint">🧥 <strong>Ton propre Vestiaire :</strong> ce site est un projet libre — <a href="${REPO}/fork" target="_blank" rel="noopener">forke le repo ↗</a>, colle ton profil Markdown dans <code>content/guide/_index.md</code> et laisse Claude Code générer ta capsule dans <code>content/garde-robe/</code>.</p>
      <p id="copie-ok" class="muted" hidden>✅ Copié dans le presse-papier !</p>
    `);

    document.querySelectorAll('.pastille').forEach(p =>
      p.addEventListener('click', () => copier(p.dataset.hex)));
    document.getElementById('copier-md').addEventListener('click', () => copier(exportMarkdown(profil)));
    document.getElementById('copier-ia').addEventListener('click', () => copier(exportPromptIA(profil)));
    document.getElementById('refaire').addEventListener('click', () => {
      etat.colo = {}; etat.coloLabels = {}; etat.morpho = {}; etat.vibes = []; etat.icones = [];
      etat.contexte = ''; etat.budget = '';
      ecranIntro();
    });
  }

  function exportMarkdown(p) {
    const s = p.saison;
    return `# Mon profil style — ${s.nom}

*Généré par Le Vestiaire le ${p.date}.*

## Colorimétrie : ${s.nom}

${s.description}

- **Palette :** ${s.palette.map(c => `${c.nom} (${c.hex})`).join(', ')}
- **Interdits :** ${s.interdits.join(', ')}
- **Métaux :** ${s.metaux}

## Morphologie & règles de coupe

${Object.entries(p.morpho).map(([k, v]) => `- ${k} : ${v}`).join('\n')}

${p.regles.map(r => `- ${r}`).join('\n')}

## Vibe

- **Univers :** ${p.vibes.join(', ')}
- **Références :** ${p.icones.join(', ') || '—'}
- **Quotidien :** ${p.contexte} · **Budget :** ${p.budget}
`;
  }

  function exportPromptIA(p) {
    const s = p.saison;
    return `Tu es un expert senior en personal shopping masculin, colorimétrie des 4 saisons et architecture de garde-robe capsule.

Je joins un selfie pris en lumière du jour, sans filtre, sur fond neutre. Analyse mes couleurs physiques réelles (sous-ton de peau, cheveux, yeux, contraste naturel) et confronte ton analyse à mon auto-diagnostic ci-dessous. Confirme ou corrige ma saison, en justifiant.

MON AUTO-DIAGNOSTIC (test des 4 saisons fait sur levestiaire) :
- Résultat : ${s.nom} (score chaleur ${p.scores.chaleur >= 0 ? '+' : ''}${p.scores.chaleur}, profondeur ${p.scores.profondeur >= 0 ? '+' : ''}${p.scores.profondeur})
${Object.entries(p.reponses).map(([k, v]) => `- ${k} : ${v}`).join('\n')}

MA MORPHOLOGIE : ${Object.entries(p.morpho).map(([k, v]) => `${k} : ${v}`).join(' · ')}
MON STYLE VISÉ : ${p.vibes.join(' + ')}${p.icones.length ? ` (références : ${p.icones.join(', ')})` : ''}
MON QUOTIDIEN : ${p.contexte} · BUDGET : ${p.budget}

RENDS-MOI :
1. Ma saison confirmée ou corrigée, avec la palette précise (8 couleurs en HEX) et les 3 couleurs à bannir absolument.
2. Mes règles morphologiques (hauteurs de taille, volumes, longueurs).
3. Une garde-robe capsule annuelle de 15 à 20 pièces (nom précis, matière, couleur idéale, 2-3 marques réelles avec fourchette de prix) adaptée à mon style, mon quotidien et mon budget.
4. Les accessoires : montres (métaux compatibles avec ma saison), lunettes selon la forme de mon visage, bijoux éventuels.

Sois franc : si une pièce que la plupart des hommes portent (ex. noir) ne me va pas, dis-le clairement.`;
  }

  async function copier(texte) {
    try {
      await navigator.clipboard.writeText(texte);
      const ok = document.getElementById('copie-ok');
      if (ok) { ok.hidden = false; setTimeout(() => { ok.hidden = true; }, 2500); }
    } catch (e) { alert('Copie impossible — sélectionne et copie manuellement :\n\n' + texte.slice(0, 200) + '…'); }
  }

  function sauver(profil) {
    try { localStorage.setItem(LS_PROFIL, JSON.stringify(profil)); } catch (e) {}
  }
  function profilSauve() {
    try { return JSON.parse(localStorage.getItem(LS_PROFIL)); } catch (e) { return null; }
  }

  ecranIntro();
})();
