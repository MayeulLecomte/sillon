import { STYLES } from "./data.js";
import { genererMorceaux, creerCarte, creerLecteur } from "./engine.js";

/* ------------------------------------------------------------------
   MySaphir — widget embarquable (autonome, piloté par l'URL)
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

// Plateformes d'écoute : ?ecoute=apple,deezer  (défaut : les deux)
const ecoute = (params.get("ecoute") || "apple,deezer")
  .split(",").map((s) => s.trim()).filter(Boolean);

const lecteur = creerLecteur();
const grille  = document.getElementById("w-grille");
const statut  = document.getElementById("w-statut");

document.getElementById("w-titre").textContent = `${style.emoji} ${style.label}`;
document.title = `MySaphir — ${style.label}`;

async function charger(essai = 0) {
  lecteur.stop();
  grille.innerHTML = "";
  statut.textContent = essai === 0 ? "Chargement…" : "Nouvelle tentative…";
  statut.hidden = false;
  try {
    // Peu d'artistes = peu de requêtes (on ménage la limite de l'API iTunes)
    const nbArtistes = Math.max(2, Math.ceil(n / 2));
    const morceaux = await genererMorceaux(style, filtre, { nbMorceaux: n, nbArtistes });
    if (!morceaux.length) { statut.textContent = "Aucun extrait pour ce choix."; return; }
    statut.hidden = true;
    morceaux.forEach((m, i) => grille.appendChild(creerCarte(m, i, lecteur, { sources, ecoute })));
  } catch (e) {
    console.error(e);
    if (essai < 2) { setTimeout(() => charger(essai + 1), 1500); return; }
    statut.textContent = "Catalogue injoignable (limite temporaire d'iTunes ?). Touchez ↻ pour réessayer.";
  }
}

document.getElementById("w-regen").addEventListener("click", () => charger());
charger();
