// ===================================================================
//  MySaphir — CHARGEUR auto-actualisant (pour l'app SCRIPTABLE, iOS)
//  ------------------------------------------------------------------
//  À coller UNE SEULE FOIS dans Scriptable. Ensuite, à chaque
//  exécution, il télécharge la DERNIÈRE version du widget depuis le
//  site : plus besoin de recoller quand le widget évolue.
//  - Garde une copie locale -> fonctionne même hors-ligne.
//  - Le paramètre du widget (style : jazz, chanson…) marche pareil.
// ===================================================================

const SRC = "https://mayeullecomte.github.io/sillon/sillon-widget.js";

const fm = FileManager.local();
const copie = fm.joinPath(fm.cacheDirectory(), "sillon-widget.js");

let code = null;
try {
  // Dernière version en ligne (le ?t= évite tout cache)
  code = await new Request(`${SRC}?t=${Date.now()}`).loadString();
  fm.writeString(copie, code);                 // sauvegarde pour le hors-ligne
} catch (e) {
  if (fm.fileExists(copie)) code = fm.readString(copie);   // repli sur la copie
}

if (!code) {
  // Jamais téléchargé + hors-ligne : petit message
  const w = new ListWidget();
  w.setPadding(16, 16, 16, 16);
  const t = w.addText("MySaphir");
  t.font = Font.heavySystemFont(16);
  t.textColor = new Color("#ffffff");
  w.addSpacer(6);
  const s = w.addText("Connexion requise au premier lancement.");
  s.font = Font.systemFont(13);
  s.textColor = new Color("#a79fb4");
  Script.setWidget(w);
  Script.complete();
} else {
  // Exécute le code téléchargé (args/config transmis au widget)
  await new Function("args", "config", `return (async () => {\n${code}\n})();`)(args, config);
}
