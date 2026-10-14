import { STYLES } from "./data.js";
import { genererMorceaux, genererNouveautes, creerCarte, creerLecteur, rafraichirMorceau, SOURCES, ECOUTES } from "./engine.js";
import { lireFavoris, estFavori, basculerFavori } from "./favoris.js";

/* ------------------------------------------------------------------
   MySaphir — appli principale (couche UI, s'appuie sur engine.js)
------------------------------------------------------------------ */

const NB_MORCEAUX = 12;

// Dans l'app iOS (Capacitor), le bouton « Intégrer » (code iframe pour un site) n'a pas de sens.
if (window.Capacitor?.isNativePlatform?.()) document.getElementById("integrer").style.display = "none";

let styleActif = null;
let filtreActif = "tout";
const lecteur = creerLecteur();

const $ = (sel) => document.querySelector(sel);
const elStyles  = $("#styles");
const elFiltres = $("#filtres");
const elWidget  = $("#widget");
const elTitre   = $("#widget-titre");
const elActions = $("#widget-actions");
const elStatut  = $("#statut");
const elBtnFav  = $("#voir-favoris");
const elNbFav   = $("#nb-favoris");

let vueFavoris = false;
const FAVORI = {
  est: estFavori,
  basculer(m) {
    const actif = basculerFavori(m);
    majCompteurFavoris();
    return actif;
  },
};

function majCompteurFavoris() {
  elNbFav.textContent = lireFavoris().length;
}

// ---- Initialisation ----------------------------------------------
function init() {
  STYLES.forEach((s) => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.dataset.id = s.id;
    btn.innerHTML = `<span class="chip-emoji">${s.emoji}</span>${s.label}`;
    btn.addEventListener("click", () => choisirStyle(s.id));
    elStyles.appendChild(btn);
  });

  [
    { id: "tout",       label: "Tout" },
    { id: "nouveautes", label: "Nouveautés" },
    { id: "recent",     label: "Incontournables" },
    { id: "classique",  label: "Classiques" },
  ].forEach((f) => {
    const btn = document.createElement("button");
    btn.className = "filtre" + (f.id === "tout" ? " actif" : "");
    btn.dataset.filtre = f.id;
    btn.textContent = f.label;
    btn.addEventListener("click", () => {
      filtreActif = f.id;
      document.querySelectorAll(".filtre").forEach((b) =>
        b.classList.toggle("actif", b.dataset.filtre === f.id));
      if (styleActif) genererSelection();
    });
    elFiltres.appendChild(btn);
  });
}

function choisirStyle(id) {
  vueFavoris = false;
  elBtnFav.classList.remove("actif");
  styleActif = STYLES.find((s) => s.id === id);
  document.querySelectorAll(".chip").forEach((b) =>
    b.classList.toggle("actif", b.dataset.id === id));
  elFiltres.hidden = false;
  genererSelection();
}

// ---- Génération ---------------------------------------------------
async function genererSelection(essai = 0) {
  lecteur.stop();
  elTitre.textContent = `${styleActif.emoji} ${styleActif.label}`;
  elActions.hidden = false;
  elWidget.innerHTML = "";
  const estNouv = filtreActif === "nouveautes";
  elStatut.textContent = estNouv
    ? "Recherche des sorties des 7 derniers jours…"
    : (essai === 0 ? "MySaphir parcourt les bacs à disques…" : "Le catalogue tarde à répondre… nouvelle tentative.");
  elStatut.hidden = false;

  try {
    const morceaux = estNouv
      ? await genererNouveautes(styleActif, { nbMorceaux: NB_MORCEAUX })
      : await genererMorceaux(styleActif, filtreActif, { nbMorceaux: NB_MORCEAUX });
    if (morceaux.length === 0) {
      elStatut.textContent = estNouv
        ? "Aucune sortie des 7 derniers jours pour ce style. Reviens vendredi 🎵"
        : "Rien trouvé pour ce filtre. Essayez « Tout », ou touchez « Régénérer ».";
      return;
    }
    elStatut.hidden = true;
    morceaux.forEach((m, i) => elWidget.appendChild(creerCarte(m, i, lecteur, { favori: FAVORI })));
  } catch (e) {
    console.error(e);
    // Nouvelle tentative automatique (accrocs réseau souvent passagers)
    if (essai < 2) {
      setTimeout(() => genererSelection(essai + 1), 1500);
      return;
    }
    elStatut.textContent = "Catalogue injoignable pour le moment. Réessayez dans un instant.";
  }
}

// ---- Favoris ------------------------------------------------------
async function afficherFavoris() {
  lecteur.stop();
  vueFavoris = true;
  styleActif = null;
  document.querySelectorAll(".chip").forEach((b) => b.classList.toggle("actif", b === elBtnFav));
  elFiltres.hidden = true;
  elActions.hidden = true;
  elTitre.textContent = "♥ Mes favoris";
  elWidget.innerHTML = "";
  $(".resultats").scrollIntoView({ behavior: "smooth", block: "start" });

  const favoris = lireFavoris();
  if (favoris.length === 0) {
    elStatut.textContent = "Aucun favori pour l'instant. Touchez ♡ sur un morceau pour le retrouver ici.";
    elStatut.hidden = false;
    return;
  }
  elStatut.textContent = "Chargement de vos favoris…";
  elStatut.hidden = false;
  // Les extraits Deezer expirent : on récupère des URL fraîches (sinon on garde l'ancienne).
  const frais = await Promise.all(favoris.map(rafraichirMorceau));
  if (!vueFavoris) return;   // l'utilisateur a choisi un style entre-temps
  elStatut.hidden = true;
  frais.forEach((m, i) => elWidget.appendChild(creerCarte(m, i, lecteur, { favori: FAVORI })));
}

elBtnFav.addEventListener("click", afficherFavoris);

// ---- Actions ------------------------------------------------------
$("#regenerer").addEventListener("click", () => { if (styleActif) genererSelection(); });
$("#integrer").addEventListener("click", ouvrirEmbed);

// ---- Générateur de code d'intégration (iframe) --------------------

// Construit les cases à cocher des sources (2 max, Télérama + Le Monde par défaut)
function initSourcesEmbed() {
  const conteneur = document.getElementById("embed-sources");
  SOURCES.forEach((s, idx) => {
    const label = document.createElement("label");
    label.className = "embed-source";
    const coche = idx < 2 ? "checked" : "";   // les 2 premières par défaut
    label.innerHTML =
      `<input type="checkbox" value="${s.id}" ${coche}> <span>${s.label}</span>`;
    conteneur.appendChild(label);
  });
  conteneur.addEventListener("change", () => {
    limiterA2();
    majCodeEmbed();
  });

  // Plateformes d'écoute (Apple Music + Deezer, cochées par défaut)
  const ecoutes = document.getElementById("embed-ecoutes");
  ECOUTES.forEach((e) => {
    const label = document.createElement("label");
    label.className = "embed-source";
    label.innerHTML = `<input type="checkbox" value="${e.id}" checked> <span>${e.label}</span>`;
    ecoutes.appendChild(label);
  });
  ecoutes.addEventListener("change", majCodeEmbed);
}

function sourcesCochees() {
  return [...document.querySelectorAll('#embed-sources input:checked')].map((c) => c.value);
}

function ecoutesCochees() {
  return [...document.querySelectorAll('#embed-ecoutes input:checked')].map((c) => c.value);
}

// Empêche de cocher plus de 2 sources
function limiterA2() {
  const cases = [...document.querySelectorAll('#embed-sources input')];
  const cochees = cases.filter((c) => c.checked);
  const trop = cochees.length >= 2;
  cases.forEach((c) => { c.disabled = trop && !c.checked; });
}

function majCodeEmbed() {
  if (!styleActif) return;
  const base = location.href.replace(/\/[^/]*$/, "");
  let src = `${base}/widget.html?style=${styleActif.id}&filtre=${filtreActif}&n=6`;
  const src2 = sourcesCochees();
  if (src2.length) src += `&sources=${src2.join(",")}`;
  const ecs = ecoutesCochees();
  if (ecs.length) src += `&ecoute=${ecs.join(",")}`;
  document.getElementById("embed-code").value =
`<iframe src="${src}"
        width="100%" height="520" frameborder="0"
        style="border:0;border-radius:16px;max-width:720px"
        loading="lazy" title="MySaphir — ${styleActif.label}"></iframe>`;
}

function ouvrirEmbed() {
  if (!styleActif) return;
  document.getElementById("embed-titre").textContent =
    `Intégrer « ${styleActif.emoji} ${styleActif.label} »`;
  limiterA2();
  majCodeEmbed();
  document.getElementById("modale").showModal();
}

document.getElementById("embed-copier").addEventListener("click", async () => {
  const zone = document.getElementById("embed-code");
  zone.select();
  try { await navigator.clipboard.writeText(zone.value); }
  catch { document.execCommand("copy"); }
  const btn = document.getElementById("embed-copier");
  btn.textContent = "Copié ✓";
  setTimeout(() => (btn.textContent = "Copier"), 1600);
});
document.getElementById("embed-fermer").addEventListener("click", () =>
  document.getElementById("modale").close());

init();
initSourcesEmbed();
majCompteurFavoris();
