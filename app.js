import { STYLES } from "./data.js";
import { genererMorceaux, creerCarte, creerLecteur, SOURCES } from "./engine.js";

/* ------------------------------------------------------------------
   Sillon — appli principale (couche UI, s'appuie sur engine.js)
------------------------------------------------------------------ */

const NB_MORCEAUX = 12;

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
    { id: "tout",      label: "Tout" },
    { id: "recent",    label: "Sorties récentes" },
    { id: "classique", label: "Classiques" },
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
  styleActif = STYLES.find((s) => s.id === id);
  document.querySelectorAll(".chip").forEach((b) =>
    b.classList.toggle("actif", b.dataset.id === id));
  elFiltres.hidden = false;
  genererSelection();
}

// ---- Génération ---------------------------------------------------
async function genererSelection() {
  lecteur.stop();
  elTitre.textContent = `${styleActif.emoji} ${styleActif.label}`;
  elActions.hidden = false;
  elWidget.innerHTML = "";
  elStatut.textContent = "Sillon parcourt les bacs à disques…";
  elStatut.hidden = false;

  try {
    const morceaux = await genererMorceaux(styleActif, filtreActif, { nbMorceaux: NB_MORCEAUX });
    if (morceaux.length === 0) {
      elStatut.textContent = "Aucun extrait trouvé pour ce filtre. Essayez « Tout ».";
      return;
    }
    elStatut.hidden = true;
    morceaux.forEach((m, i) => elWidget.appendChild(creerCarte(m, i, lecteur)));
  } catch (e) {
    console.error(e);
    elStatut.textContent = "Oups, impossible de contacter le catalogue. Réessayez.";
  }
}

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
}

function sourcesCochees() {
  return [...document.querySelectorAll('#embed-sources input:checked')].map((c) => c.value);
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
  document.getElementById("embed-code").value =
`<iframe src="${src}"
        width="100%" height="520" frameborder="0"
        style="border:0;border-radius:16px;max-width:720px"
        loading="lazy" title="Sillon — ${styleActif.label}"></iframe>`;
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
