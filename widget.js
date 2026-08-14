import { STYLES } from "./data.js";
import { genererMorceaux, creerCarte, creerLecteur } from "./engine.js";

/* ------------------------------------------------------------------
   Sillon — widget embarquable (autonome, piloté par l'URL)
   Paramètres : ?style=<id>&filtre=<tout|recent|classique>&n=<1..24>
------------------------------------------------------------------ */

const params  = new URLSearchParams(location.search);
const styleId = params.get("style") || STYLES[0].id;
const filtre  = params.get("filtre") || "tout";
const n       = Math.min(Math.max(parseInt(params.get("n"), 10) || 6, 1), 24);
const style   = STYLES.find((s) => s.id === styleId) || STYLES[0];

// Sources critiques à afficher : ?sources=telerama,lemonde  (défaut : ces deux-là)
const sources = (params.get("sources") || "telerama,lemonde")
  .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2);

const lecteur = creerLecteur();
const grille  = document.getElementById("w-grille");
const statut  = document.getElementById("w-statut");

document.getElementById("w-titre").textContent = `${style.emoji} ${style.label}`;
document.title = `Sillon — ${style.label}`;

async function charger() {
  lecteur.stop();
  grille.innerHTML = "";
  statut.textContent = "Chargement…";
  statut.hidden = false;
  try {
    const morceaux = await genererMorceaux(style, filtre, { nbMorceaux: n });
    if (!morceaux.length) { statut.textContent = "Aucun extrait pour ce choix."; return; }
    statut.hidden = true;
    morceaux.forEach((m, i) => grille.appendChild(creerCarte(m, i, lecteur, { sources })));
  } catch (e) {
    console.error(e);
    statut.textContent = "Erreur de chargement.";
  }
}

document.getElementById("w-regen").addEventListener("click", charger);
charger();
