# 🎵 Sillon

Une appli web qui **conseille des morceaux selon un style choisi**, en mêlant
**classiques** et **sorties récentes**. Le résultat s'affiche sous forme de
**widget** : pochette, titre, artiste, extrait de 30 s jouable, et lien vers la fiche.

Aucune installation, aucune clé API, aucun serveur : une simple page web qui
interroge l'**API iTunes Search** (gratuite) directement depuis le navigateur.

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
widget.html?style=<id>&filtre=<tout|recent|classique>&n=<1..24>&sources=<id,id>
```

- `sources` : quelles sources critiques afficher sur les cartes du widget.
  **1 ou 2 maximum** (défaut : `telerama,lemonde`). Ids possibles :
  `telerama`, `lemonde`, `rollingstone`, `rockfolk`.

Dans l'appli, le bouton **`</> Intégrer`** ouvre une fenêtre où l'on **coche les
sources** (2 max) avant de copier le code. Exemple :

```html
<iframe src="https://VOTRE-SITE/sillon/widget.html?style=jazz&filtre=tout&n=6&sources=telerama,rollingstone"
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
3. Un filtre optionnel restreint aux **sorties récentes** (< 3 ans) ou aux **classiques**.
4. Le **widget** affiche la sélection. « ↻ Régénérer » propose une nouvelle fournée.

`data.js` est le **cœur du projet** : c'est là que vit la sélection éditoriale,
dans l'esprit d'une rédaction musicale. C'est ce fichier qu'on enrichit dans le temps.

---

## 🛣️ Feuille de route (vers la vision complète)

### 1. Enrichir la base éditoriale (`data.js`)
Ajouter des artistes/albums, affiner par sous-genres, ajouter un champ `critique`
optionnel par artiste : `{ url, source }` pointant vers l'article d'origine.

### 2. Télérama / Le Monde — **déjà branché ✅ (proprement)**
> ⚠️ Leurs critiques sont protégées (droit d'auteur) et payantes.
> On ne recopie **jamais** le texte des critiques.

Chaque carte affiche **quatre liens critiques** — `Télérama ↗`, `Le Monde ↗`,
`Rolling Stone ↗`, `Rock & Folk ↗` — qui pointent vers une **recherche de l'artiste**
sur le site concerné (URL réelle, jamais inventée). L'utilisateur atterrit sur la
couverture de cet artiste. Les sources sont définies dans `engine.js` (`SOURCES`) :
en ajouter une = une ligne.

Pour pointer vers **un article précis** au lieu de la recherche, renseignez le
champ optionnel `critique` sur l'artiste dans `data.js` :

```js
{ nom: "Kendrick Lamar", ere: "recent", critique: {
    telerama: "https://www.telerama.fr/musique/....",
    lemonde:  "https://www.lemonde.fr/musiques/article/...."
}}
```

Ce qui reste permis (et recommandé) :
- **Lier** vers leurs articles/recherches (jamais recopier le texte).
- **S'inspirer de leurs sélections** pour alimenter `data.js` (le *fait* qu'un
  album a été salué peut nourrir notre curation — pas leur prose).

### 3. Widget embarquable — **fait ✅**
Le widget est disponible via `widget.html` + iframe (voir section « Le widget embarquable »).
Prochaine amélioration possible : une version **web component** (`<sillon-widget style="jazz">`)
pour ceux qui préfèrent un script à une iframe.

### 4. Écoute complète (optionnel)
Brancher **Spotify** ou **Deezer** (nécessite un compte développeur + connexion
de l'utilisateur) pour lire les morceaux entiers au lieu des extraits de 30 s.

---

*Extraits & pochettes fournis par l'API iTunes Search. Sélection éditoriale « Sillon ».*
