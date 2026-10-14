/* ------------------------------------------------------------------
   MySaphir — favoris (stockés uniquement sur l'appareil, localStorage)
   Le plus récent en premier.
------------------------------------------------------------------ */

const CLE = "mysaphir-favoris";

export function lireFavoris() {
  try { return JSON.parse(localStorage.getItem(CLE) || "[]"); } catch (e) { return []; }
}

function ecrire(liste) {
  try { localStorage.setItem(CLE, JSON.stringify(liste)); } catch (e) {}
}

export function estFavori(m) {
  return lireFavoris().some((f) => f.trackId === m.trackId);
}

// Ajoute ou retire le morceau ; renvoie true s'il est désormais en favori.
export function basculerFavori(m) {
  const liste = lireFavoris();
  const i = liste.findIndex((f) => f.trackId === m.trackId);
  if (i >= 0) {
    liste.splice(i, 1);
    ecrire(liste);
    return false;
  }
  liste.unshift({ ...m, ajouteLe: Date.now() });
  ecrire(liste);
  return true;
}
