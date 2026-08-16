// ===================================================================
//  Sillon — widget d'écran d'accueil (pour l'app SCRIPTABLE, iOS)
//  ------------------------------------------------------------------
//  Grand widget : 3 morceaux EN DIRECT via l'API Deezer (pochette + lien).
//  Deux modes selon le PARAMÈTRE du widget :
//   • vide  → 3 STYLES différents, un morceau chacun (étiqueté par style)
//   • style → 3 morceaux d'un seul style (ex. jazz, rock, chanson…)
//  Chaque ligne ouvre SON morceau dans Deezer (grands widgets).
// ===================================================================

// Artistes de référence par style.
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
const EMOJIS = {
  jazz:"🎷", rock:"🎸", hiphop:"🎤", "rap-fr":"🇫🇷", electro:"🎛️", chanson:"🎙️",
  soul:"🕺", rnb:"💫", classique:"🎻", folk:"🪕", afro:"🌍", metal:"🤘",
};

const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { a = [...a]; for (let i = a.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };

// ---- Mode selon le paramètre --------------------------------------
const param = (args.widgetParameter || "").trim().toLowerCase();
const styleIds = Object.keys(STYLES);
const modeMono = !!STYLES[param];   // un style précis fourni ?

// On prépare 3 "cases" { styleId, nom } à remplir
let cases;
if (modeMono) {
  cases = shuffle(STYLES[param]).slice(0, 3).map((nom) => ({ styleId: param, nom }));
} else {
  cases = shuffle(styleIds).slice(0, 3).map((sid) => ({ styleId: sid, nom: rnd(STYLES[sid]) }));
}

// ---- Requête Deezer pour un artiste -------------------------------
async function chercher(nom) {
  const q = encodeURIComponent(`artist:"${nom}"`);
  const url = `https://api.deezer.com/search?q=${q}&limit=25`;
  try {
    const data = await new Request(url).loadJSON();
    const res = (data.data || []).filter((t) => t.album && t.album.cover_big);
    if (!res.length) return null;
    const t = rnd(res);
    return { titre: t.title_short || t.title, artiste: t.artist ? t.artist.name : nom, art: t.album.cover_big, lien: t.link };
  } catch (e) { return null; }
}

// Remplit chaque case (en gardant le style associé)
const suggestions = [];
for (const c of cases) {
  const s = await chercher(c.nom);
  if (s) suggestions.push({ ...s, styleId: c.styleId });
}

// ===================== Construction du widget =====================
const w = new ListWidget();
const grad = new LinearGradient();
grad.locations = [0, 1];
grad.colors = [new Color("#1c1826"), new Color("#0e0c11")];
w.backgroundGradient = grad;
w.setPadding(16, 16, 16, 16);

// En-tête : ◉ Sillon .......... (style unique | "3 styles")
const head = w.addStack();
head.centerAlignContent();
const marque = head.addText("◉ Sillon");
marque.font = Font.heavySystemFont(17);
marque.textColor = new Color("#ffffff");
head.addSpacer();
const badge = head.addText(modeMono ? `${EMOJIS[param]} ${LABELS[param]}` : "3 styles");
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
    w.addSpacer();   // répartit les lignes

    const row = w.addStack();
    row.centerAlignContent();
    if (s.lien) row.url = s.lien;   // chaque ligne ouvre son morceau dans Deezer

    // Pochette
    try {
      const img = await new Request(s.art).loadImage();
      const wi = row.addImage(img);
      wi.imageSize = new Size(58, 58);
      wi.cornerRadius = 9;
    } catch (e) { /* pochette indisponible */ }

    row.addSpacer(12);

    // Colonne texte : [style] / titre / artiste
    const col = row.addStack();
    col.layoutVertically();

    // En mode "3 styles", on étiquette chaque ligne par son style
    if (!modeMono) {
      const st = col.addText(`${EMOJIS[s.styleId]} ${LABELS[s.styleId]}`);
      st.font = Font.semiboldSystemFont(11);
      st.textColor = new Color("#f0a63c");
      col.addSpacer(2);
    }

    const titre = col.addText(s.titre);
    titre.font = Font.boldSystemFont(15);
    titre.textColor = new Color("#f2eef7");
    titre.lineLimit = 1;
    col.addSpacer(1);
    const art = col.addText(s.artiste);
    art.font = Font.systemFont(11.5);
    art.textColor = new Color("#a79fb4");
    art.lineLimit = 1;

    row.addSpacer();
  }

  w.addSpacer();
  const foot = w.addText("Touchez un morceau pour l'ouvrir dans Deezer →");
  foot.font = Font.mediumSystemFont(11);
  foot.textColor = new Color("#e5533c");
}

// Toucher une zone vide : ouvre le 1er morceau dans Deezer
w.url = suggestions[0] ? suggestions[0].lien : "https://www.deezer.com/";
w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  await w.presentLarge();
}
Script.complete();
