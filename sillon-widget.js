// ===================================================================
//  Sillon — widget d'écran d'accueil (pour l'app SCRIPTABLE, iOS)
//  Grand widget : 3 suggestions musicales EN DIRECT (pochette, titre, artiste).
//  Source : API Deezer (pochette + lien direct vers le morceau sur Deezer).
//  -> N'utilise PAS iTunes : plus de blocage, pochettes fiables.
//  Au toucher → ouvre le 1er morceau directement dans Deezer.
//
//  Paramètre du widget (optionnel) = un style : jazz, chanson, electro,
//  rock, hiphop, rap-fr, soul, rnb, classique, folk, afro, metal.
//  Vide → un style au hasard à chaque rafraîchissement.
// ===================================================================

// Artistes de référence (classiques + récents), par style.
const STYLES = {
  jazz:      ["Miles Davis","John Coltrane","Bill Evans","Kamasi Washington","GoGo Penguin","Nubya Garcia","Robert Glasper"],
  rock:      ["The Velvet Underground","David Bowie","Radiohead","Fontaines D.C.","IDLES","Big Thief"],
  hiphop:    ["A Tribe Called Quest","Nas","Kendrick Lamar","Little Simz","Tyler, The Creator","MF DOOM"],
  "rap-fr":  ["IAM","Oxmo Puccino","MC Solaar","Nekfeu","Lomepal","Laylow","Alpha Wann"],
  electro:   ["Daft Punk","Aphex Twin","Boards of Canada","Jon Hopkins","Floating Points","Bonobo","Four Tet"],
  chanson:   ["Serge Gainsbourg","Barbara","Jacques Brel","Juliette Armanet","Clara Luciani","Pomme"],
  soul:      ["Marvin Gaye","Stevie Wonder","Curtis Mayfield","Michael Kiwanuka","Leon Bridges","Anderson .Paak"],
  rnb:       ["D'Angelo","Erykah Badu","Frank Ocean","SZA","Solange","Cleo Sol"],
  classique: ["Claude Debussy","Erik Satie","Ludovico Einaudi","Max Richter","Nils Frahm","Hania Rani"],
  folk:      ["Bob Dylan","Leonard Cohen","Joni Mitchell","Fleet Foxes","Bon Iver","Phoebe Bridgers"],
  afro:      ["Fela Kuti","Ali Farka Touré","Tinariwen","Burna Boy","Angélique Kidjo","Ibrahim Maalouf"],
  metal:     ["Black Sabbath","Tool","Mogwai","Gojira","Deafheaven","Explosions in the Sky"],
};
const LABELS = {
  jazz:"Jazz", rock:"Rock", hiphop:"Hip-Hop", "rap-fr":"Rap FR", electro:"Électro",
  chanson:"Chanson FR", soul:"Soul / Funk", rnb:"R&B", classique:"Classique",
  folk:"Folk", afro:"Afro / World", metal:"Métal",
};

const NB = 3;   // nombre de suggestions
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { a = [...a]; for (let i = a.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };

// Style choisi (paramètre) ou aléatoire
let styleId = (args.widgetParameter || "").trim().toLowerCase();
if (!STYLES[styleId]) styleId = rnd(Object.keys(STYLES));
const artistes = shuffle(STYLES[styleId]);

// Interroge l'API Deezer pour un artiste et renvoie un morceau au hasard
async function chercher(nom) {
  const q = encodeURIComponent(`artist:"${nom}"`);
  const url = `https://api.deezer.com/search?q=${q}&limit=25`;
  try {
    const data = await new Request(url).loadJSON();
    const res = (data.data || []).filter((t) => t.album && t.album.cover_big);
    if (!res.length) return null;
    const t = rnd(res);
    return {
      titre: t.title_short || t.title,
      artiste: t.artist ? t.artist.name : nom,
      art: t.album.cover_big,        // pochette 500x500 (CDN Deezer)
      lien: t.link,                  // lien direct vers le morceau sur Deezer
    };
  } catch (e) { return null; }
}

// Récupère NB suggestions d'artistes DIFFÉRENTS
async function desSuggestions() {
  const out = [];
  for (const nom of artistes) {
    if (out.length >= NB) break;
    const s = await chercher(nom);
    if (s) out.push(s);
  }
  return out;
}

const suggestions = await desSuggestions();

// ===================== Construction du widget =====================
const w = new ListWidget();
const grad = new LinearGradient();
grad.locations = [0, 1];
grad.colors = [new Color("#1c1826"), new Color("#0e0c11")];
w.backgroundGradient = grad;
w.setPadding(16, 16, 16, 16);

// En-tête : ◉ Sillon .......... Style
const head = w.addStack();
head.centerAlignContent();
const marque = head.addText("◉ Sillon");
marque.font = Font.heavySystemFont(17);
marque.textColor = new Color("#ffffff");
head.addSpacer();
const badge = head.addText(LABELS[styleId] || styleId);
badge.font = Font.semiboldSystemFont(13);
badge.textColor = new Color("#f0a63c");

w.addSpacer(10);

if (!suggestions.length) {
  const err = w.addText("Pas de connexion — réessayez plus tard.");
  err.font = Font.systemFont(14);
  err.textColor = new Color("#a79fb4");
} else {
  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i];
    w.addSpacer();   // répartit les lignes pour remplir le widget

    const row = w.addStack();
    row.centerAlignContent();
    // Chaque ligne ouvre SON propre morceau dans Deezer (grands widgets uniquement)
    if (s.lien) row.url = s.lien;

    // Pochette (Deezer)
    try {
      const img = await new Request(s.art).loadImage();
      const wi = row.addImage(img);
      wi.imageSize = new Size(62, 62);
      wi.cornerRadius = 9;
    } catch (e) { /* pochette indisponible */ }

    row.addSpacer(13);

    // Titre / artiste
    const col = row.addStack();
    col.layoutVertically();
    const titre = col.addText(s.titre);
    titre.font = Font.boldSystemFont(16);
    titre.textColor = new Color("#f2eef7");
    titre.lineLimit = 1;
    col.addSpacer(2);
    const art = col.addText(s.artiste);
    art.font = Font.systemFont(12);
    art.textColor = new Color("#a79fb4");
    art.lineLimit = 1;

    row.addSpacer();
  }

  w.addSpacer();   // espace flexible avant le pied
  const foot = w.addText("Touchez un morceau pour l'ouvrir dans Deezer →");
  foot.font = Font.mediumSystemFont(12);
  foot.textColor = new Color("#e5533c");
}

// Au toucher : ouvre le 1er morceau DIRECTEMENT dans Deezer (aucun iTunes)
w.url = suggestions[0]
  ? suggestions[0].lien
  : `https://www.deezer.com/search/${encodeURIComponent(LABELS[styleId] || styleId)}`;

// Rafraîchissement ~ toutes les 30 min (iOS décide du moment exact)
w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  await w.presentLarge();   // aperçu quand on lance le script dans l'app
}
Script.complete();
