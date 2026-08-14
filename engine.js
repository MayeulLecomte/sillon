/* ==================================================================
   Sillon — engine.js
   Moteur PARTAGÉ entre l'appli (app.js) et le widget (widget.js) :
   - requêtes iTunes Search
   - composition de la sélection
   - liens critiques (Télérama, Le Monde, Rolling Stone, Rock & Folk)
   - fabrication d'une carte + lecteur d'extraits
================================================================== */

const API = "https://itunes.apple.com/search";
export const PAYS = "FR";           // marché iTunes
const NB_ARTISTES = 6;              // artistes piochés par génération
const NB_MORCEAUX = 12;             // morceaux affichés (par défaut)
const SEUIL_RECENT_ANS = 3;         // "récent" = sorti il y a moins de N ans

/* ---- Sources critiques -------------------------------------------
   Par défaut : lien de RECHERCHE de l'artiste (URL réelle, jamais inventée).
   Un artiste peut fournir un article précis via data.js :
     critique: { telerama: "...", lemonde: "...", rollingstone: "...", rockfolk: "..." }
------------------------------------------------------------------- */
export const SOURCES = [
  { id: "telerama",     label: "Télérama",      url: (q) => `https://www.telerama.fr/recherche?q=${q}` },
  { id: "lemonde",      label: "Le Monde",      url: (q) => `https://www.lemonde.fr/recherche/?search_keywords=${q}&search_sort=relevance_desc` },
  { id: "rollingstone", label: "Rolling Stone", url: (q) => `https://www.rollingstone.com/results/?q=${q}` },
  { id: "rockfolk",     label: "Rock & Folk",   url: (q) => `https://www.rockandfolk.com/?s=${q}` },
];

export function lienCritique(m, sourceId) {
  const src = SOURCES.find((s) => s.id === sourceId);
  if (!src) return "#";
  if (m.critique && m.critique[sourceId]) return m.critique[sourceId];   // article précis
  return src.url(encodeURIComponent(m.artisteRef || m.artiste));         // sinon recherche
}

/* ---- Requête + composition --------------------------------------- */
async function chercherArtiste(nom, styleObj) {
  const url = `${API}?term=${encodeURIComponent(nom)}`
    + `&media=music&entity=song&attribute=artistTerm&country=${PAYS}&limit=12`;
  const rep = await fetch(url);
  if (!rep.ok) throw new Error("HTTP " + rep.status);
  const data = await rep.json();

  const fiche = (styleObj?.artistes || []).find(
    (a) => a.nom.toLowerCase() === nom.toLowerCase()
  );

  return (data.results || [])
    .filter((r) => r.previewUrl && r.artworkUrl100)
    .map((r) => ({
      trackId: r.trackId,
      titre: r.trackName,
      artiste: r.artistName,
      artisteRef: nom,
      album: r.collectionName,
      genre: r.primaryGenreName,
      annee: (r.releaseDate || "").slice(0, 4),
      preview: r.previewUrl,
      pochette: (r.artworkUrl100 || "").replace("100x100", "300x300"),
      lien: r.trackViewUrl || r.collectionViewUrl || "",
      critique: fiche?.critique || null,
    }));
}

export async function genererMorceaux(styleObj, filtre = "tout", opts = {}) {
  const nbArtistes = opts.nbArtistes ?? NB_ARTISTES;
  const nbMorceaux = opts.nbMorceaux ?? NB_MORCEAUX;

  let pool = [...styleObj.artistes];
  if (filtre === "recent")    pool = trierParEre(pool, "recent");
  if (filtre === "classique") pool = trierParEre(pool, "classique");
  const choisis = melanger(pool).slice(0, nbArtistes);

  const lots = await Promise.all(choisis.map((a) => chercherArtiste(a.nom, styleObj)));
  let morceaux = filtrerParDate(lots.flat(), filtre);
  morceaux = dedoublonner(morceaux, "trackId");
  return melanger(morceaux).slice(0, nbMorceaux);
}

/* ---- Filtres date ------------------------------------------------- */
function anneeCourante() { return new Date().getFullYear(); }

export function estMorceauRecent(m) {
  const a = parseInt(m.annee, 10);
  return a && (anneeCourante() - a) <= SEUIL_RECENT_ANS;
}

function filtrerParDate(morceaux, filtre) {
  if (filtre === "recent")    return morceaux.filter((m) => estMorceauRecent(m));
  if (filtre === "classique") return morceaux.filter((m) => {
    const a = parseInt(m.annee, 10);
    return a && (anneeCourante() - a) > SEUIL_RECENT_ANS;
  });
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
   opts.sources : tableau d'ids de sources à afficher (ex. ["telerama","lemonde"]).
                  Absent -> toutes les sources.
------------------------------------------------------------------- */
export function creerCarte(m, i, lecteur, opts = {}) {
  const carte = document.createElement("article");
  carte.className = "carte";
  carte.style.animationDelay = `${i * 40}ms`;

  const badge = estMorceauRecent(m)
    ? `<span class="badge recent">Récent · ${m.annee}</span>`
    : (m.annee ? `<span class="badge">${m.annee}</span>` : "");

  const liensCritiques = resoudreSources(opts.sources).map((s) =>
    `<a class="lien lien-critique" href="${lienCritique(m, s.id)}" target="_blank" rel="noopener">${s.label} ↗</a>`
  ).join("");

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
        ${m.genre ? `<span class="genre">${escapeHtml(m.genre)}</span>` : ""}
      </div>
      <div class="liens">
        ${liensCritiques}
        ${m.lien ? `<a class="lien lien-ecoute" href="${m.lien}" target="_blank" rel="noopener">Écouter ↗</a>` : ""}
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
