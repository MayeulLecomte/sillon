/* ==================================================================
   Sillon — engine.js
   Moteur PARTAGÉ entre l'appli (app.js) et le widget (widget.js) :
   - requêtes Deezer (via JSONP, car Deezer bloque le fetch navigateur)
   - composition de la sélection
   - liens critiques (Télérama, Le Monde, Rolling Stone, Rock & Folk)
   - fabrication d'une carte + lecteur d'extraits
   NB : Deezer ne fournit pas la date de sortie -> la distinction
   "récent / classique" se base sur l'étiquette de l'artiste (data.js).
================================================================== */

import { FALLBACK } from "./fallback.js";   // jeu de secours embarqué (dernier recours)

const API = "https://api.deezer.com/search";   // source : Deezer
const NB_ARTISTES = 6;              // artistes piochés par génération
const NB_MORCEAUX = 12;             // morceaux affichés (par défaut)

// Deezer bloque le fetch navigateur (CORS) -> on passe par JSONP (injection <script>).
function jsonp(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const cb = "sillonCb_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    let fini = false;
    const nettoyer = () => { try { delete window[cb]; } catch (e) { window[cb] = undefined; } script.remove(); };
    window[cb] = (data) => { fini = true; nettoyer(); resolve(data); };
    script.onerror = () => { if (!fini) { nettoyer(); reject(new Error("JSONP erreur")); } };
    setTimeout(() => { if (!fini) { nettoyer(); reject(new Error("JSONP timeout")); } }, timeoutMs);
    script.src = url + (url.includes("?") ? "&" : "?") + "output=jsonp&callback=" + cb;
    document.body.appendChild(script);
  });
}

/* ---- Sources critiques -------------------------------------------
   RÈGLE : on n'affiche une source QUE si data.js fournit un lien
   d'article RÉEL et vérifié pour l'artiste, via le champ `critique` :
     { nom: "…", ere: "…", critique: {
         telerama: "https://www.telerama.fr/musique/….",
         lemonde:  "https://www.lemonde.fr/musiques/article/…."
     }}
   Sinon : AUCUNE source affichée. On ne génère PAS de lien de recherche
   — afficher « Télérama » sans article vérifié serait une fausse
   attribution à un média (et les recherches ne prouvent aucune critique).
------------------------------------------------------------------- */
export const SOURCES = [
  { id: "telerama",     label: "Télérama" },
  { id: "lemonde",      label: "Le Monde" },
  { id: "rollingstone", label: "Rolling Stone" },
  { id: "rockfolk",     label: "Rock & Folk" },
  { id: "nme",          label: "NME" },
  { id: "pitchfork",    label: "Pitchfork" },
  { id: "guardian",     label: "The Guardian" },
];

// URL de l'article VÉRIFIÉ pour cette source, ou null si non renseigné.
export function lienCritique(m, sourceId) {
  return (m.critique && m.critique[sourceId]) || null;
}

/* ---- Plateformes d'écoute ----------------------------------------
   Deezer      : lien DIRECT du morceau (fourni par Deezer).
   Apple Music : recherche "artiste titre" (on n'a pas le lien exact).
------------------------------------------------------------------- */
export const ECOUTES = [
  { id: "deezer", label: "Deezer",      url: (m) => m.lien || `https://www.deezer.com/search/${encodeURIComponent(`${m.artiste} ${m.titre}`)}` },
  { id: "apple",  label: "Apple Music", url: (m) => `https://music.apple.com/search?term=${encodeURIComponent(`${m.artiste} ${m.titre}`)}` },
];

export function resoudreEcoutes(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return ECOUTES;
  const choisies = ECOUTES.filter((e) => ids.includes(e.id));
  return choisies.length ? choisies : ECOUTES;
}

/* ---- Cache local (résiste aux limites de l'API iTunes) -----------
   Une fois un artiste chargé, on le garde ~7 jours dans localStorage :
   - relances suivantes = AUCUNE requête (donc plus de limite atteinte)
   - si l'API bloque, on se rabat sur la dernière version en cache.
------------------------------------------------------------------- */
const CACHE_MS = 7 * 24 * 60 * 60 * 1000;   // 7 jours
const cacheCle = (nom) => "sillon:artv2:" + nom.toLowerCase();   // v2 = données Deezer

function lireCache(nom) {
  try { return JSON.parse(localStorage.getItem(cacheCle(nom)) || "null"); }
  catch (e) { return null; }
}
function ecrireCache(nom, morceaux) {
  try { localStorage.setItem(cacheCle(nom), JSON.stringify({ t: Date.now(), v: morceaux })); }
  catch (e) { /* localStorage indisponible (navigation privée) */ }
}

// Récupère TOUT ce qui est en cache (frais) pour les artistes d'un style — sans requête.
function toutLeCache(styleObj) {
  const out = [];
  for (const a of (styleObj?.artistes || [])) {
    const cache = lireCache(a.nom);
    if (cache && (Date.now() - cache.t) < CACHE_MS) {
      for (const m of cache.v) out.push({ ...m, critique: a.critique || null, ere: a.ere || null });
    }
  }
  return out;
}

/* ---- Requête + composition --------------------------------------- */
async function chercherArtiste(nom, styleObj) {
  const fiche = (styleObj?.artistes || []).find(
    (a) => a.nom.toLowerCase() === nom.toLowerCase()
  );
  // On ajoute critique + étiquette d'ère (récent/classique) au moment de servir.
  const avecMeta = (arr) => arr.map((m) => ({ ...m, critique: fiche?.critique || null, ere: fiche?.ere || null }));

  const transformer = (data) => ((data && data.data) || [])
    .filter((t) => t.preview && t.album && t.album.cover_big)
    .map((t) => ({
      trackId: t.id,
      titre: t.title_short || t.title,
      artiste: t.artist ? t.artist.name : nom,
      artisteRef: nom,
      album: t.album ? t.album.title : "",
      preview: t.preview,                 // extrait 30 s (MP3 Deezer)
      pochette: t.album.cover_big,        // pochette (CDN Deezer)
      lien: t.link,                       // lien DIRECT du morceau sur Deezer
    }));

  // 1) Cache frais -> pas de requête du tout
  const cache = lireCache(nom);
  if (cache && (Date.now() - cache.t) < CACHE_MS) return avecMeta(cache.v);

  // 2) Sinon on interroge Deezer (JSONP)…
  try {
    const q = encodeURIComponent(`artist:"${nom}"`);
    const data = await jsonp(`${API}?q=${q}&limit=25`);
    let morceaux = transformer(data);
    // Privilégie les morceaux réellement de l'artiste demandé (évite les faux positifs)
    const n2 = nom.toLowerCase();
    const exacts = morceaux.filter((m) => {
      const a = (m.artiste || "").toLowerCase();
      return a.includes(n2) || n2.includes(a);
    });
    if (exacts.length) morceaux = exacts;
    if (morceaux.length) ecrireCache(nom, morceaux);
    return avecMeta(morceaux);
  } catch (e) {
    // 3) …et en cas d'échec, on se rabat sur le cache périmé
    if (cache) return avecMeta(cache.v);
    throw e;
  }
}

export async function genererMorceaux(styleObj, filtre = "tout", opts = {}) {
  const nbArtistes = opts.nbArtistes ?? NB_ARTISTES;
  const nbMorceaux = opts.nbMorceaux ?? NB_MORCEAUX;

  let pool = [...styleObj.artistes];
  if (filtre === "recent")    pool = trierParEre(pool, "recent");
  if (filtre === "classique") pool = trierParEre(pool, "classique");
  const choisis = melanger(pool).slice(0, nbArtistes);

  // allSettled : un artiste qui échoue (réseau, limite iTunes…) n'annule pas les autres
  const lots = await Promise.allSettled(choisis.map((a) => chercherArtiste(a.nom, styleObj)));
  const reussis = lots.filter((r) => r.status === "fulfilled");
  let morceauxBruts = reussis.flatMap((r) => r.value);

  // Filet de sécurité 1 : rien de l'API -> tout le cache disponible pour ce style.
  if (morceauxBruts.length === 0) morceauxBruts = toutLeCache(styleObj);

  // Filet de sécurité 2 : toujours rien -> jeu de secours EMBARQUÉ (jamais d'erreur).
  if (morceauxBruts.length === 0) {
    morceauxBruts = (FALLBACK[styleObj.id] || []).map((m) => {
      const fiche = (styleObj.artistes || []).find(
        (a) => a.nom.toLowerCase() === (m.artisteRef || "").toLowerCase()
      );
      return { ...m, critique: fiche?.critique || null };
    });
  }

  let morceaux = filtrerParDate(morceauxBruts, filtre);
  // Si le filtre date vide tout (secours restreint), on montre au moins le secours brut.
  if (morceaux.length === 0 && morceauxBruts.length > 0) morceaux = morceauxBruts;
  morceaux = dedoublonner(morceaux, "trackId");
  return melanger(morceaux).slice(0, nbMorceaux);
}

/* ---- Filtres récent / classique (basés sur l'artiste, pas la date) --- */
export function estMorceauRecent(m) {
  return m.ere === "recent";
}

function filtrerParDate(morceaux, filtre) {
  if (filtre === "recent")    return morceaux.filter((m) => m.ere === "recent");
  if (filtre === "classique") return morceaux.filter((m) => m.ere === "classique");
  return morceaux;
}

/* ---- Lecteur d'extraits (une instance = un <audio> partagé) ------- */
export function creerLecteur() {
  const audio = new Audio();
  let carteEnCours = null;

  function majEtat(carte) {
    if (carteEnCours) carteEnCours.classList.remove("joue");
    carteEnCours = carte;
    if (carte) carte.classList.add("joue");
  }
  function stop() { audio.pause(); majEtat(null); }
  function basculer(m, carte) {
    if (carteEnCours === carte) { stop(); return; }
    audio.src = m.preview;
    audio.play().catch((e) => console.warn("Lecture refusée :", e));
    majEtat(carte);
  }
  audio.addEventListener("ended", () => majEtat(null));
  return { basculer, stop };
}

/* Renvoie la liste de sources à afficher (ids valides), sinon toutes. */
export function resoudreSources(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return SOURCES;
  const choisies = SOURCES.filter((s) => ids.includes(s.id));
  return choisies.length ? choisies : SOURCES;
}

/* ---- Fabrication d'une carte -------------------------------------
   opts.sources : ids de sources critiques à afficher (ex. ["telerama","lemonde"]).
   opts.ecoute  : ids de plateformes d'écoute (ex. ["apple","deezer"]).
                  Absents -> tout est affiché.
------------------------------------------------------------------- */
export function creerCarte(m, i, lecteur, opts = {}) {
  const carte = document.createElement("article");
  carte.className = "carte";
  carte.style.animationDelay = `${i * 40}ms`;

  const badge = m.ere === "recent"
    ? `<span class="badge recent">Découverte</span>`
    : (m.ere === "classique" ? `<span class="badge">Classique</span>` : "");

  // Uniquement les sources avec un article RÉEL et vérifié (sinon : rien affiché).
  const liensCritiques = resoudreSources(opts.sources)
    .map((s) => ({ s, href: lienCritique(m, s.id) }))
    .filter((x) => x.href)
    .map((x) => `<a class="lien lien-critique" href="${escapeHtml(x.href)}" target="_blank" rel="noopener">${x.s.label} ↗</a>`)
    .join("");

  const liensEcoute = resoudreEcoutes(opts.ecoute)
    .map((e) => ({ e, href: e.url(m) }))
    .filter((x) => x.href)   // Apple Music absent si pas de lien fourni
    .map((x) => `<a class="lien lien-ecoute" href="${x.href}" target="_blank" rel="noopener">${x.e.label} ↗</a>`)
    .join("");

  carte.innerHTML = `
    <div class="pochette">
      <img src="${m.pochette}" alt="Pochette de ${escapeHtml(m.album || m.titre)}" loading="lazy">
      <button class="play" aria-label="Écouter un extrait">
        <span class="ico-play">▶</span>
        <span class="egaliseur"><i></i><i></i><i></i><i></i></span>
      </button>
    </div>
    <div class="infos">
      <div class="titre" title="${escapeHtml(m.titre)}">${escapeHtml(m.titre)}</div>
      <div class="artiste">${escapeHtml(m.artiste)}</div>
      <div class="meta">
        ${badge}
        ${m.album ? `<span class="genre">${escapeHtml(m.album)}</span>` : ""}
      </div>
      <div class="liens">
        ${liensCritiques}
        ${liensEcoute}
      </div>
    </div>
  `;

  carte.querySelector(".play").addEventListener("click", () => lecteur.basculer(m, carte));
  return carte;
}

/* ---- Utilitaires -------------------------------------------------- */
export function trierParEre(artistes, ere) {
  return [
    ...artistes.filter((a) => a.ere === ere),
    ...artistes.filter((a) => a.ere !== ere),
  ];
}

export function melanger(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dedoublonner(arr, cle) {
  const vus = new Set();
  return arr.filter((o) => (vus.has(o[cle]) ? false : (vus.add(o[cle]), true)));
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
