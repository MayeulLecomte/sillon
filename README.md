# 🎵 Sillon

Une appli web qui **conseille des morceaux selon un style choisi**, en mêlant
**classiques** et **découvertes**. Le résultat s'affiche sous forme de
**widget** : pochette, titre, artiste, extrait de 30 s jouable, et lien vers la fiche.

Aucune installation, aucune clé API, aucun serveur : une simple page web qui
interroge l'**API Deezer** (gratuite, via JSONP) directement depuis le navigateur.
La distinction *récent / classique* se base sur l'étiquette de l'artiste (`data.js`),
Deezer ne fournissant pas la date de sortie.

🌍 **En ligne :** https://mayeullecomte.github.io/sillon/
· Widget : https://mayeullecomte.github.io/sillon/widget.html?style=jazz

📱 **Sur iPhone (icône écran d'accueil) :** Safari → ouvrir le site → bouton **Partager**
→ **« Sur l'écran d'accueil »**. Sillon s'installe comme une app (icône vinyle, plein écran).

🧩 **Grand widget d'écran d'accueil (2 suggestions) :** via l'app gratuite **Scriptable**.
Copiez le contenu de [`sillon-widget.js`](sillon-widget.js) dans un nouveau script Scriptable,
puis ajoutez un widget **Large** relié à ce script. Paramètre du widget = un style
(`jazz`, `chanson`, `electro`…) ou vide pour un style aléatoire. Au toucher → Deezer.
*(iOS réserve les widgets d'écran **verrouillé** aux apps natives ; ici c'est l'écran d'accueil.)*

---

## ▶️ Lancer l'appli

L'appli utilise des modules JavaScript (`import`), qui nécessitent d'être servis
en `http://` (pas en double-clic `file://`). Depuis ce dossier :

```bash
python3 -m http.server 8765
```

Puis ouvrez **http://127.0.0.1:8765** dans votre navigateur.

---

## 🗂️ Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Page principale (choix du style, sélection, bouton « Intégrer ») |
| `style.css`  | Habillage « magazine musical » (sombre, vinyle) + styles du widget |
| `engine.js`  | **Moteur partagé** : requêtes API, filtres, liens critiques, carte, lecteur |
| `app.js`     | Couche UI de l'appli principale (s'appuie sur `engine.js`) |
| `widget.js`  | Couche UI du **widget embarquable** (s'appuie sur `engine.js`) |
| `widget.html`| Page autonome du widget, pilotée par l'URL (à mettre dans une `<iframe>`) |
| `data.js`    | **Base éditoriale** : styles + artistes de référence (à enrichir) |
| `exemple-integration.html` | Démo : le widget embarqué dans une page « site tiers » |

---

## 🧩 Le widget embarquable

Le widget vit dans `widget.html`, piloté par l'URL :

```
widget.html?style=<id>&filtre=<tout|recent|classique>&n=<1..24>&sources=<id,id>&ecoute=<id,id>
```

- `sources` : quelles **sources critiques** afficher sur les cartes du widget.
  **1 ou 2 maximum** (défaut : `telerama,lemonde`). Ids possibles :
  `telerama`, `lemonde`, `rollingstone`, `rockfolk`.
- `ecoute` : quelles **plateformes d'écoute** afficher (défaut : `apple,deezer`).
  Ids possibles : `apple`, `deezer`. Ex. `ecoute=deezer` pour n'afficher que Deezer.

Dans l'appli, le bouton **`</> Intégrer`** ouvre une fenêtre où l'on **coche les
sources** (2 max) et les **plateformes d'écoute** avant de copier le code. Exemple :

```html
<iframe src="https://mayeullecomte.github.io/sillon/widget.html?style=jazz&filtre=tout&n=6&sources=telerama,lemonde&ecoute=apple,deezer"
        width="100%" height="520" frameborder="0"
        style="border:0;border-radius:16px;max-width:720px"
        loading="lazy" title="Sillon — Jazz"></iframe>
```

> À noter : l'appli principale affiche les 4 sources (c'est le tableau de bord) ;
> seul le **widget** est limité à 1–2 sources, celles que vous choisissez.

> ⚠️ Pour l'intégration sur un vrai site, les fichiers doivent être **hébergés en ligne**
> (l'`src` de l'iframe doit être une URL publique, pas `127.0.0.1`).
> Voir `exemple-integration.html` pour un aperçu du rendu.

Ids de style disponibles : `jazz`, `rock`, `hiphop`, `rap-fr`, `electro`, `chanson`,
`soul`, `rnb`, `classique`, `folk`, `afro`, `metal`.

---

## 🧠 Comment ça marche

1. On choisit un **style** (Jazz, Rock, Électro…).
2. `app.js` pioche quelques **artistes de référence** de ce style (dans `data.js`)
   et interroge l'API iTunes pour récupérer leurs morceaux.
3. Un filtre optionnel restreint aux **Découvertes** (artistes contemporains) ou aux **Classiques** — basé sur l'étiquette `ere` de l'artiste (Deezer ne fournit pas la date de sortie).
4. Le **widget** affiche la sélection. « ↻ Régénérer » propose une nouvelle fournée.

`data.js` est le **cœur du projet** : c'est là que vit la sélection éditoriale,
dans l'esprit d'une rédaction musicale. C'est ce fichier qu'on enrichit dans le temps.

---

## 🛣️ Feuille de route (vers la vision complète)

### 1. Enrichir la base éditoriale (`data.js`)
Ajouter des artistes/albums, affiner par sous-genres, ajouter un champ `critique`
optionnel par artiste : `{ url, source }` pointant vers l'article d'origine.

### 2. Liens presse (Télérama, Le Monde…) — **articles vérifiés UNIQUEMENT**
> ⚠️ Règle stricte contre la **fausse attribution** : on n'affiche jamais le nom
> d'un média à côté d'un album qu'il n'a pas chroniqué.

Une source ne s'affiche **que** si `data.js` fournit un **lien d'article réel et
vérifié** pour l'artiste, via le champ `critique`. Aucun lien de recherche n'est
généré (une page de recherche prouve zéro critique, et celle du Monde renvoyait
même un 410). Tant qu'un artiste n'a pas de `critique`, **aucune source n'apparaît**.

```js
{ nom: "Kendrick Lamar", ere: "recent", critique: {
    telerama: "https://www.telerama.fr/musique/....",   // article RÉEL, vérifié 200
    lemonde:  "https://www.lemonde.fr/musiques/article/...."
}}
```

**Avant d'ajouter un lien** : ouvre-le, vérifie qu'il répond (200) et qu'il parle
bien de cet artiste/album. Ne jamais deviner ni fabriquer une URL. Idéalement,
alimenter ce champ depuis un **flux vérifiable** (RSS de l'éditeur, base curée à la main).

- On ne recopie **jamais** le texte des critiques (droit d'auteur).
- S'inspirer de leurs sélections pour choisir les artistes de `data.js` reste permis.

### 3. Widget embarquable — **fait ✅**
Le widget est disponible via `widget.html` + iframe (voir section « Le widget embarquable »).
Prochaine amélioration possible : une version **web component** (`<sillon-widget style="jazz">`)
pour ceux qui préfèrent un script à une iframe.

### 4. Écoute complète (optionnel)
Brancher **Spotify** ou **Deezer** (nécessite un compte développeur + connexion
de l'utilisateur) pour lire les morceaux entiers au lieu des extraits de 30 s.

---

*Extraits & pochettes fournis par l'API iTunes Search. Sélection éditoriale « Sillon ».*
