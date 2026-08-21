/* Onboarding — le parcours personal shopper, fidèle aux épiques produit :
   ① Capture visuelle (caméra masque ovale + checklist, ou upload) et précisions manuelles
   ② Diagnostic colorimétrie & morphologie (analyse via backend — voir analyser())
   ③ Vibe check (quiz de cartes façon Tinder), icônes, contexte & budget
   ④ Fiche profil + capsule générée
   Le POST part vers window.VESTIAIRE_API (hugo.toml → params.apiUrl). Tant que
   l'endpoint est vide : MODE DÉMO — une estimation locale rend le même JSON que
   le backend, pour tester tout le parcours de bout en bout. Contrat d'API
   documenté dans REPRISE-LOCALE.md. */
(() => {
  const DATA = window.ONBOARDING_DATA;
  const API = window.VESTIAIRE_API || '';
  const LS_PROFIL = 'vestiaire-profil';
  const wizard = document.getElementById('wizard');
  const barre = document.getElementById('barre');

  const CHECKLIST = [
    'Lumière du jour (pas de néon, pas de flash)',
    'Sans filtre ni retouche',
    'Fond neutre derrière moi',
    'Pas de lunettes teintées ni maquillage',
  ];

  const PRECISIONS = [
    { id: 'yeux', q: 'La couleur de tes yeux', opts: ['Marron très foncé', 'Noisette / vert doré', 'Vert', 'Bleu', 'Gris'] },
    { id: 'cheveux', q: 'Ta couleur de cheveux naturelle', opts: ['Noir profond', 'Brun froid / cendré', 'Brun chaud / châtain', 'Roux / auburn', 'Blond doré', 'Blond cendré', 'Gris / blanc'] },
    { id: 'soleil', q: 'Ta réaction au soleil', opts: ['Bronze vite, dorée', 'Prend des coups de soleil', 'Rougit puis bronze'] },
    { id: 'veines', q: 'Tes veines au poignet (lumière du jour)', opts: ['Plutôt vertes', 'Plutôt bleues / violettes', 'Un mélange des deux'] },
    { id: 'bijoux', q: 'Le métal qui te va le mieux', opts: ["L'or (doré)", "L'argent", 'Les deux se valent'] },
  ];

  const SILHOUETTES = ['Épaules larges / carrure athlétique', 'Carrure moyenne', 'Fine / étroite'];
  const COMPLEXES = ['Ventre', 'Jambes courtes', 'Grande taille', 'Petite taille', 'Bras fins', 'Aucun'];
  const CONTEXTES = ['Bureau formel', 'Casual pro', 'Télétravail', 'Terrain / manuel'];
  const SORTIES = ['Rarement', 'Quelques fois par mois', 'Chaque semaine'];

  const etat = {
    photo: null,          // dataURL JPEG (jamais envoyé au localStorage)
    precisions: {},
    taille: '', silhouette: '', complexes: [],
    vibesAimees: [], vibesPassees: [], icones: [],
    contexte: '', sorties: '', budget: 250,
  };
  let etape = 0;
  const NB_ETAPES = 8;
  let fluxCamera = null;

  function maj(html) {
    arreterCamera();
    wizard.innerHTML = html;
    barre.style.width = `${(etape / (NB_ETAPES - 1)) * 100}%`;
    window.scrollTo({ top: 0 });
  }
  function arreterCamera() {
    if (fluxCamera) { fluxCamera.getTracks().forEach(t => t.stop()); fluxCamera = null; }
  }

  /* ── Étape 0 : intro ── */
  function ecranIntro() {
    etape = 0;
    const profil = profilSauve();
    maj(`
      <h1>Créer ton profil</h1>
      <p class="lead">Le parcours complet du personal shopper : ton selfie, tes couleurs, ta silhouette, ton style — et à la fin, ta palette et ta garde-robe capsule.</p>
      ${profil ? `<div class="hint">👤 Un profil <strong>${profil.resultat.saison.nom}</strong> est déjà enregistré sur cet appareil. <button class="chip" id="voir-profil">Le revoir</button></div>` : ''}
      <div class="carte-etapes">
        <p>① <strong>Ton selfie</strong> — guidé, lumière du jour</p>
        <p>② <strong>Précisions</strong> — yeux, cheveux, réaction au soleil</p>
        <p>③ <strong>Ta silhouette</strong> — taille, carrure, complexes</p>
        <p>④ <strong>Ta vibe</strong> — le quiz de style, tes icônes, ton quotidien</p>
        <p>⑤ <strong>L'analyse</strong> — ta saison, ta palette, ta capsule</p>
      </div>
      ${API ? '' : '<p class="hint">🧪 Backend d\'analyse non branché : le parcours tourne en <strong>mode démo</strong> (estimation locale) — parfait pour tester.</p>'}
      <button class="btn" id="commencer">C'est parti →</button>
    `);
    document.getElementById('commencer').addEventListener('click', ecranPhoto);
    const vp = document.getElementById('voir-profil');
    if (vp) vp.addEventListener('click', () => ecranResultat(profil.resultat, profil.entrees));
  }

  /* ── Étape 1 : capture visuelle (US 1.1) ── */
  function ecranPhoto() {
    etape = 1;
    maj(`
      <p class="muted">Ton selfie — étape 1/${NB_ETAPES - 1}</p>
      <h2 class="wizard-q">La photo qui dit tes vraies couleurs</h2>
      <p>Place ton visage dans l'ovale, en lumière du jour, et vérifie la checklist avant de valider.</p>
      <div class="cadre-camera" id="cadre">
        <video id="video" autoplay playsinline muted hidden></video>
        <img id="apercu" alt="Aperçu du selfie" hidden>
        <div class="masque-ovale" id="masque"></div>
        <p class="muted" id="cam-message">La caméra s'affichera ici.</p>
      </div>
      <div class="rack-actions">
        <button class="btn" id="ouvrir-camera">📷 Ouvrir la caméra</button>
        <button class="btn btn-ghost" id="capturer" hidden>⭕ Capturer</button>
        <label class="btn btn-ghost" for="fichier">🖼 Uploader une photo</label>
        <input type="file" id="fichier" accept="image/jpeg,image/png,image/webp" hidden>
        <button class="btn btn-ghost" id="reprendre" hidden>↺ Reprendre</button>
      </div>
      <div class="checklist" id="checklist">
        ${CHECKLIST.map((c, i) => `<label><input type="checkbox" data-check="${i}"> ${c}</label>`).join('')}
      </div>
      <button class="btn" id="valider-photo" disabled>Continuer →</button>
      <p class="muted">La photo reste sur ton appareil${API ? " jusqu'à l'analyse" : ' (mode démo : elle ne part nulle part)'}.</p>
    `);

    const video = document.getElementById('video');
    const apercu = document.getElementById('apercu');
    const masque = document.getElementById('masque');
    const message = document.getElementById('cam-message');
    const btnCam = document.getElementById('ouvrir-camera');
    const btnCap = document.getElementById('capturer');
    const btnRe = document.getElementById('reprendre');
    const valider = document.getElementById('valider-photo');

    const verifier = () => {
      const cochees = [...document.querySelectorAll('#checklist input')].every(c => c.checked);
      valider.disabled = !(etat.photo && cochees);
    };
    document.getElementById('checklist').addEventListener('change', verifier);

    const montrerPhoto = (dataUrl) => {
      etat.photo = dataUrl;
      arreterCamera();
      video.hidden = true; btnCap.hidden = true;
      apercu.src = dataUrl; apercu.hidden = false;
      masque.classList.add('masque-ok');
      message.hidden = true; btnRe.hidden = false; btnCam.hidden = true;
      verifier();
    };

    btnCam.addEventListener('click', async () => {
      try {
        fluxCamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1024 } } });
        video.srcObject = fluxCamera;
        video.hidden = false; message.hidden = true; btnCam.hidden = true;
        // Attendre les dimensions réelles : capturer avant donnerait un canvas 0×0.
        const pret = () => { btnCap.hidden = false; };
        video.readyState >= 1 ? pret() : video.addEventListener('loadedmetadata', pret, { once: true });
      } catch (e) {
        message.textContent = 'Caméra indisponible — utilise « Uploader une photo ».';
      }
    });

    btnCap.addEventListener('click', () => {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh) { message.hidden = false; message.textContent = 'La caméra n\'est pas encore prête — réessaie.'; return; }
      // Recadrage 3:4 centré, toujours contenu dans la source (portrait comme paysage).
      const sw = Math.min(vw, vh * 3 / 4), sh = sw * 4 / 3;
      const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
      const c = document.createElement('canvas');
      c.width = Math.round(Math.min(sw, 900));
      c.height = Math.round(c.width * 4 / 3);
      const ctx = c.getContext('2d');
      // La vidéo est affichée en miroir : capturer à l'identique pour que la
      // photo corresponde au cadrage fait dans l'ovale.
      ctx.translate(c.width, 0); ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height);
      montrerPhoto(c.toDataURL('image/jpeg', 0.85));
    });

    document.getElementById('fichier').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const echec = () => {
        message.hidden = false;
        message.textContent = 'Image illisible — essaie un autre fichier (JPG, PNG ou WEBP).';
      };
      const lecteur = new FileReader();
      lecteur.onerror = echec;
      lecteur.onload = () => {
        const img = new Image();
        img.onerror = echec;
        img.onload = () => {
          const c = document.createElement('canvas');
          const echelle = Math.min(1, 900 / Math.max(img.width, img.height));
          c.width = Math.round(img.width * echelle); c.height = Math.round(img.height * echelle);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          montrerPhoto(c.toDataURL('image/jpeg', 0.85));
        };
        img.src = lecteur.result;
      };
      lecteur.readAsDataURL(f);
    });

    btnRe.addEventListener('click', () => { etat.photo = null; ecranPhoto(); });
    valider.addEventListener('click', () => ecranPrecisions(0));
  }

  /* ── Étape 2 : précisions manuelles optionnelles (US 1.2) ── */
  function ecranPrecisions(i) {
    etape = 2;
    const q = PRECISIONS[i];
    maj(`
      <p class="muted">Précisions — étape 2/${NB_ETAPES - 1} · question ${i + 1}/${PRECISIONS.length}</p>
      <h2 class="wizard-q">${q.q}</h2>
      <p class="muted">Optionnel — ça lève les ambiguïtés si la lumière de ta photo est imparfaite.</p>
      <div class="choix" id="choix"></div>
      <button class="btn btn-ghost" id="passer">Je ne sais pas →</button>
    `);
    const suivant = () => (i + 1 < PRECISIONS.length ? ecranPrecisions(i + 1) : ecranMorpho());
    const box = document.getElementById('choix');
    q.opts.forEach(label => {
      const b = document.createElement('button');
      b.className = 'choix-carte';
      b.textContent = label;
      b.addEventListener('click', () => { etat.precisions[q.id] = label; suivant(); });
      box.appendChild(b);
    });
    document.getElementById('passer').addEventListener('click', suivant);
  }

  /* ── Étape 3 : morphologie (US 2.2) ── */
  function ecranMorpho() {
    etape = 3;
    maj(`
      <p class="muted">Ta silhouette — étape 3/${NB_ETAPES - 1}</p>
      <h2 class="wizard-q">Ta taille</h2>
      <input type="number" class="champ" id="taille" placeholder="en cm (ex. 178)" min="120" max="230">
      <h2 class="wizard-q">Ta silhouette</h2>
      <div class="choix" id="silhouettes"></div>
      <h2 class="wizard-q">Tes complexes éventuels <span class="muted">(plusieurs choix possibles)</span></h2>
      <div class="choix choix-grille" id="complexes"></div>
      <button class="btn" id="valider" disabled>Continuer →</button>
    `);
    const valider = document.getElementById('valider');
    const verifier = () => { valider.disabled = !etat.silhouette; };

    const sil = document.getElementById('silhouettes');
    SILHOUETTES.forEach(s => {
      const b = document.createElement('button');
      b.className = 'choix-carte'; b.textContent = s;
      b.addEventListener('click', () => {
        etat.silhouette = s;
        sil.querySelectorAll('.choix-carte').forEach(c => c.classList.remove('is-active'));
        b.classList.add('is-active'); verifier();
      });
      sil.appendChild(b);
    });

    const cx = document.getElementById('complexes');
    COMPLEXES.forEach(c => {
      const b = document.createElement('button');
      b.className = 'choix-carte'; b.textContent = c;
      b.addEventListener('click', () => {
        if (c === 'Aucun') { etat.complexes = ['Aucun']; }
        else {
          etat.complexes = etat.complexes.filter(x => x !== 'Aucun');
          const i = etat.complexes.indexOf(c);
          i >= 0 ? etat.complexes.splice(i, 1) : etat.complexes.push(c);
        }
        cx.querySelectorAll('.choix-carte').forEach(x => x.classList.toggle('is-active', etat.complexes.includes(x.textContent)));
      });
      cx.appendChild(b);
    });

    valider.addEventListener('click', () => {
      etat.taille = document.getElementById('taille').value;
      ecranVibeQuiz(0);
    });
  }

  /* ── Étape 4 : quiz visuel d'affinités, le « Tinder du style » (US 3.1) ── */
  function ecranVibeQuiz(i) {
    etape = 4;
    const v = DATA.vibes[i];
    if (!v) return ecranIcones();
    maj(`
      <p class="muted">Ta vibe — carte ${i + 1}/${DATA.vibes.length}</p>
      <div class="tinder-carte">
        <div class="tinder-emoji">${v.emoji}</div>
        <h2>${v.nom}</h2>
        <p>${v.description}</p>
        <p class="muted">${v.signatures.join(' · ')}</p>
      </div>
      <div class="tinder-actions">
        <button class="btn btn-ghost" id="passe">✖️ Pas pour moi</button>
        <button class="btn" id="aime">❤️ Ça me parle</button>
      </div>
    `);
    document.getElementById('aime').addEventListener('click', () => { etat.vibesAimees.push(v.id); ecranVibeQuiz(i + 1); });
    document.getElementById('passe').addEventListener('click', () => { etat.vibesPassees.push(v.id); ecranVibeQuiz(i + 1); });
  }

  /* ── Étape 5 : icônes & références (US 3.2) ── */
  function ecranIcones() {
    etape = 5;
    maj(`
      <p class="muted">Tes références — étape 5/${NB_ETAPES - 1}</p>
      ${etat.vibesAimees.length ? '' : '<p class="hint">Aucun univers ne t\'a parlé — tes références ci-dessous guideront alors le style à elles seules.</p>'}
      <h2 class="wizard-q">Qui incarne l'allure que tu vises ? <span class="muted">(optionnel, plusieurs choix)</span></h2>
      <div class="choix choix-grille" id="icones"></div>
      <button class="btn" id="valider">Continuer →</button>
    `);
    const box = document.getElementById('icones');
    DATA.icones.forEach(p => {
      const b = document.createElement('button');
      b.className = 'choix-carte'; b.textContent = p.nom;
      b.addEventListener('click', () => {
        const i = etat.icones.indexOf(p.nom);
        i >= 0 ? etat.icones.splice(i, 1) : etat.icones.push(p.nom);
        b.classList.toggle('is-active', etat.icones.includes(p.nom));
      });
      box.appendChild(b);
    });
    document.getElementById('valider').addEventListener('click', ecranContexte);
  }

  /* ── Étape 6 : contexte de vie & budget (US 3.3) ── */
  function ecranContexte() {
    etape = 6;
    maj(`
      <p class="muted">Ton quotidien — étape 6/${NB_ETAPES - 1}</p>
      <h2 class="wizard-q">Ton environnement principal</h2>
      <div class="choix" id="contextes"></div>
      <h2 class="wizard-q">Tes sorties</h2>
      <div class="choix" id="sorties"></div>
      <h2 class="wizard-q">Ton rythme d'achat cible</h2>
      <p><input type="range" id="budget" min="50" max="600" step="25" value="${etat.budget}" style="width:100%">
      <strong id="budget-val">~${etat.budget} €/mois</strong></p>
      <button class="btn" id="valider" disabled>Lancer l'analyse →</button>
    `);
    const valider = document.getElementById('valider');
    const verifier = () => { valider.disabled = !(etat.contexte && etat.sorties); };
    const mono = (elId, valeurs, cle) => {
      const box = document.getElementById(elId);
      valeurs.forEach(v => {
        const b = document.createElement('button');
        b.className = 'choix-carte'; b.textContent = v;
        b.addEventListener('click', () => {
          etat[cle] = v;
          box.querySelectorAll('.choix-carte').forEach(c => c.classList.remove('is-active'));
          b.classList.add('is-active'); verifier();
        });
        box.appendChild(b);
      });
    };
    mono('contextes', CONTEXTES, 'contexte');
    mono('sorties', SORTIES, 'sorties');
    const slider = document.getElementById('budget');
    slider.addEventListener('input', () => {
      etat.budget = Number(slider.value);
      document.getElementById('budget-val').textContent = `~${etat.budget} €/mois`;
    });
    valider.addEventListener('click', ecranAnalyse);
  }

  /* ── Étape 7 : traitement LLM (US 2.1) ── */
  function payload() {
    return {
      photo_base64: etat.photo,
      precisions: etat.precisions,
      morphologie: { taille_cm: etat.taille || null, silhouette: etat.silhouette, complexes: etat.complexes },
      vibes: { aimees: etat.vibesAimees, passees: etat.vibesPassees },
      icones: etat.icones,
      contexte: etat.contexte,
      sorties: etat.sorties,
      budget_mensuel: etat.budget,
    };
  }

  async function analyser() {
    if (API) {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      });
      if (!res.ok) throw new Error(`Le serveur d'analyse a répondu ${res.status}`);
      return await res.json();
    }
    // MODE DÉMO : estimation locale depuis les précisions manuelles, même format
    // de réponse que le backend (contrat dans REPRISE-LOCALE.md).
    await new Promise(r => setTimeout(r, 1400));
    return estimationDemo();
  }

  function ecranAnalyse() {
    etape = 7;
    maj(`
      <p class="muted">L'analyse — étape 7/${NB_ETAPES - 1}</p>
      <div class="analyse-attente">
        <div class="analyse-rond"></div>
        <h2>${API ? 'Ton personal shopper analyse ta photo…' : 'Analyse en mode démo…'}</h2>
        <p class="muted">Colorimétrie, morphologie, style — quelques secondes.</p>
      </div>
    `);
    analyser()
      .then(resultat => {
        const entrees = payload(); delete entrees.photo_base64;
        sauver({ resultat, entrees, date: new Date().toISOString().slice(0, 10) });
        ecranResultat(resultat, entrees);
      })
      .catch(err => {
        maj(`
          <h2>L'analyse n'a pas abouti</h2>
          <p class="hint">⚠️ ${err.message}</p>
          <div class="rack-actions">
            <button class="btn" id="reessayer">↺ Réessayer</button>
          </div>
        `);
        document.getElementById('reessayer').addEventListener('click', ecranAnalyse);
      });
  }

  /* L'estimation locale du mode démo : scoring chaleur/profondeur sur les
     précisions manuelles → un des 9 profils de data/onboarding.yaml. */
  function estimationDemo() {
    const SCORES = {
      yeux: { 'Marron très foncé': [0, 2], 'Noisette / vert doré': [1, 1], 'Vert': [1, 0], 'Bleu': [-1, -1], 'Gris': [-1, 0] },
      cheveux: { 'Noir profond': [-1, 2], 'Brun froid / cendré': [-1, 1], 'Brun chaud / châtain': [1, 1], 'Roux / auburn': [2, 0], 'Blond doré': [1, -1], 'Blond cendré': [-1, -1], 'Gris / blanc': [0, -1] },
      soleil: { 'Bronze vite, dorée': [1, 0], 'Prend des coups de soleil': [-1, 0], 'Rougit puis bronze': [0, 0] },
      veines: { 'Plutôt vertes': [2, 0], 'Plutôt bleues / violettes': [-2, 0], 'Un mélange des deux': [0, 0] },
      bijoux: { "L'or (doré)": [2, 0], "L'argent": [-2, 0], 'Les deux se valent': [0, 0] },
    };
    let W = 0, D = 0;
    Object.entries(etat.precisions).forEach(([k, v]) => {
      const s = (SCORES[k] || {})[v]; if (s) { W += s[0]; D += s[1]; }
    });
    let cle;
    if (W >= 1) cle = D >= 1 ? (W >= 3 ? 'automne-chaud' : (D >= 3 ? 'automne-profond' : 'automne-doux')) : (D <= -2 ? 'printemps-clair' : 'printemps-chaud');
    else cle = D >= 1 ? (D >= 3 ? 'hiver-profond' : 'hiver-froid') : (D <= -2 ? 'ete-clair' : 'ete-doux');
    const s = DATA.saisons[cle];

    const regles = [];
    if (etat.silhouette.startsWith('Épaules larges')) regles.push('Coupes amples et fluides pour équilibrer la carrure — éviter le très cintré.');
    if (etat.silhouette.startsWith('Fine')) regles.push('Structurer le haut : superpositions, matières texturées, épaules légèrement construites.');
    if (etat.complexes.includes('Ventre') || etat.complexes.includes('Jambes courtes')) regles.push('Taille haute portée au nombril : elle allonge la jambe et structure le buste.');
    else regles.push('Taille haute recommandée : c\'est elle qui donne la silhouette héritage.');
    if (etat.complexes.includes('Petite taille')) regles.push('Tout au même ton (colonne de couleur) et pantalons sans casse pour allonger.');
    if (etat.complexes.includes('Grande taille')) regles.push('Casser la verticalité : superpositions, revers, contrastes haut/bas.');

    // Aucune vibe likée : on déduit depuis les icônes choisies, sinon on n'invente rien.
    let idsVibes = etat.vibesAimees;
    if (!idsVibes.length && etat.icones.length) {
      idsVibes = [...new Set(DATA.icones.filter(i => etat.icones.includes(i.nom)).map(i => i.vibe))];
    }
    const vibesAimees = DATA.vibes.filter(v => idsVibes.includes(v.id));
    const capsule = DATA.capsule.map(item => {
      const roles = Array.isArray(item.role) ? item.role : [item.role];
      return {
        nom: item.nom, categorie: item.categorie, saison_portee: item.saison_portee,
        couleur: roles.map(r => s.roles[r] || r).join(', '),
        matiere: item.matiere, marques: item.marques, budget: item.budget,
      };
    });
    const signatures = vibesAimees.flatMap(v => v.signatures.map(sg => `${v.emoji} ${sg}`));

    return {
      mode: 'demo',
      saison: { nom: s.nom, description: s.description, palette: s.palette, interdits: s.interdits.slice(0, 3), metaux: s.metaux },
      regles_morpho: regles,
      vibes: vibesAimees.map(v => v.nom),
      pieces_signature: signatures,
      capsule,
      accessoires: null,
      commentaire: 'Estimation locale (mode démo) : la photo n\'a pas été analysée. Branche le backend pour l\'analyse complète par IA.',
    };
  }

  /* ── Étape 8 : restitution (US 2.1 + 4.1) ── */
  function ecranResultat(r, entrees) {
    etape = NB_ETAPES - 1;
    const pastilles = r.saison.palette.map(c =>
      `<button class="pastille" data-hex="${c.hex}" title="Copier ${c.hex}">
        <span class="pastille-rond" style="background:${c.hex}"></span>
        <span class="pastille-nom">${c.nom}</span>
      </button>`).join('');

    const parCat = {};
    r.capsule.forEach(i => (parCat[i.categorie] = parCat[i.categorie] || []).push(i));
    const capsuleHtml = Object.entries(parCat).map(([cat, items]) => `
      <h3>${cat}</h3>
      <div class="cards">${items.map(i => `
        <div class="card">
          <span class="badge">${i.saison_portee}</span>
          <h3>${i.nom}</h3>
          <p><strong>${i.couleur}</strong> · ${i.matiere}</p>
          <p class="muted">${(i.marques || []).map(m => `<a href="${m.url}" target="_blank" rel="noopener">${m.nom} ↗</a>`).join(' · ')}</p>
          <p class="muted">${i.budget}</p>
        </div>`).join('')}
      </div>`).join('');

    maj(`
      ${r.mode === 'demo' ? '<p class="hint">🧪 <strong>Mode démo</strong> — estimation locale sans analyse de la photo. Le résultat définitif viendra du backend IA.</p>' : ''}
      <h1>${r.saison.nom}</h1>
      <p class="lead">${r.saison.description}</p>

      <h2>Ta palette</h2>
      <div class="pastilles">${pastilles}</div>
      <p class="hint">🚫 <strong>À bannir :</strong> ${r.saison.interdits.join(' · ')}<br>⌚ <strong>Métaux :</strong> ${r.saison.metaux}</p>

      <h2>Tes règles de coupe</h2>
      <ul>${r.regles_morpho.map(x => `<li>${x}</li>`).join('')}</ul>

      <h2>Ta vibe</h2>
      <p>${r.vibes.join(' · ') || '—'}${entrees && entrees.icones && entrees.icones.length ? ` — dans l'esprit de ${entrees.icones.join(', ')}` : ''}</p>
      ${r.pieces_signature && r.pieces_signature.length ? `<h3>Tes pièces signature</h3><ul>${r.pieces_signature.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}

      <h2>Ta garde-robe capsule</h2>
      <p class="muted">${r.capsule.length} pièces polyvalentes, classées par saison et catégorie, dans ta palette.</p>
      ${capsuleHtml}

      ${r.accessoires ? `<h2>Tes accessoires</h2><div class="prose">${r.accessoires}</div>` : ''}
      ${r.commentaire ? `<p class="muted">${r.commentaire}</p>` : ''}

      <div class="rack-actions">
        <button class="btn" id="studio-btn">🧥 Tester des associations au Studio</button>
        <button class="btn btn-ghost" id="refaire">↺ Refaire le parcours</button>
      </div>
      <p id="copie-ok" class="muted" hidden>✅ Code couleur copié !</p>
    `);

    document.querySelectorAll('.pastille').forEach(p =>
      p.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(p.dataset.hex);
          const ok = document.getElementById('copie-ok');
          ok.hidden = false; setTimeout(() => { ok.hidden = true; }, 2000);
        } catch (e) {}
      }));
    document.getElementById('studio-btn').addEventListener('click', () => {
      window.location.href = document.querySelector('a[href*="studio"]').href;
    });
    document.getElementById('refaire').addEventListener('click', () => {
      Object.assign(etat, { photo: null, precisions: {}, taille: '', silhouette: '', complexes: [], vibesAimees: [], vibesPassees: [], icones: [], contexte: '', sorties: '', budget: 250 });
      ecranIntro();
    });
  }

  function sauver(profil) {
    try { localStorage.setItem(LS_PROFIL, JSON.stringify(profil)); } catch (e) {}
  }
  function profilSauve() {
    try {
      const p = JSON.parse(localStorage.getItem(LS_PROFIL));
      return p && p.resultat ? p : null;
    } catch (e) { return null; }
  }

  ecranIntro();
})();
