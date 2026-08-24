# 💎 MySaphir

Une appli web qui **conseille des morceaux selon un style choisi**, en mêlant
**incontournables**, **classiques** et **nouveautés de la semaine**. Le résultat s'affiche
sous forme de **widget** : pochette, titre, artiste, extrait de 30 s jouable, et liens
d'écoute (Deezer, Apple Music).

Aucune installation, aucune clé API, aucun serveur : une simple page web qui
interroge l'**API Deezer** (gratuite, via JSONP — Deezer bloque le `fetch` navigateur)
directement depuis le navigateur.

🌍 **En ligne :** https://mayeullecomte.github.io/sillon/
· Widget : https://mayeullecomte.github.io/sillon/widget.html?style=jazz

> Le projet s'appelait **Sillon** ; il a été rebaptisé **MySaphir**. Le nom du dépôt,
> les URLs et les noms de fichiers sont restés inchangés.

📱 **Sur iPhone (icône écran d'accueil) :** Safari → ouvrir le site → bouton **Partager**
→ **« Sur l'écran d'accueil »**. MySaphir s'installe comme une app (icône vinyle, plein écran).

🧩 **Grand widget d'écran d'accueil :** via l'app gratuite **Scriptable**.
Copiez le contenu de [`sillon-widget-loader.js`](sillon-widget-loader.js) dans un nouveau
script Scriptable (une seule fois : le chargeur récupère ensuite la dernière version du
widget depuis le site à chaque exécution, et garde une copie locale pour le hors-ligne),
puis ajoutez un widget **Large** relié à ce script. Deux modes selon le **paramètre du widget** :

- **vide** → 3 styles différents, un morceau chacun ;
- **un style** (`jazz`, `chanson`, `electro`…) → 3 morceaux de ce style.

Chaque ligne ouvre **son** morceau dans Deezer.
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
| `index.html` | Page principale (choix du style, filtres, sélection, bouton « Intégrer ») |
| `style.css`  | Habillage « magazine musical » (direction *Loomere* : ivoire, pine, sage, accent rouge — Cabinet Grotesk + Inter Tight) |
| `engine.js`  | **Moteur partagé** : requêtes Deezer, filtres, nouveautés, cache, liens critiques, carte, lecteur |
| `app.js`     | Couche UI de l'appli principale (s'appuie sur `engine.js`) |
| `widget.js`  | Couche UI du **widget embarquable** (s'appuie sur `engine.js`) |
| `widget.html`| Page autonome du widget, pilotée par l'URL (à mettre dans une `<iframe>`) |
| `data.js`    | **Base éditoriale** : styles + artistes de référence + critiques vérifiées (à enrichir) |
| `fallback.js`| Jeu de secours embarqué : évite tout écran d'erreur si l'API ne répond pas |
| `sillon-widget.js` | Widget iOS **Scriptable** (autonome, appelle Deezer directement) |
| `sillon-widget-loader.js` | Chargeur Scriptable auto-actualisant (à coller une seule fois) |
| `manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png` | PWA / icône écran d'accueil |
| `build-icon.py`, `build-fallback.py` | Scripts utilitaires (génération de l'icône, du jeu de secours) |
| `exemple-integration.html` | Démo : le widget embarqué dans une page « site tiers » |

---

## 🧩 Le widget embarquable

Le widget vit dans `widget.html`, piloté par l'URL :

```
widget.html?style=<id>&filtre=<tout|nouveautes|recent|classique>&n=<1..24>&sources=<id,id>&ecoute=<id,id>
```

- `sources` : quelles **sources critiques** afficher sur les cartes du widget.
  **1 ou 2 maximum** (défaut : `telerama,lemonde`). Ids possibles :
  `telerama`, `lemonde`, `rollingstone`, `rockfolk`, `nme`, `pitchfork`, `guardian`, `inrocks`.
- `ecoute` : quelles **plateformes d'écoute** afficher (défaut : `apple,deezer`).
  Ids possibles : `apple`, `deezer`. Ex. `ecoute=deezer` pour n'afficher que Deezer.

> ⚠️ **Aujourd'hui, seules `rollingstone` (32 articles) et `nme` (10) ont des critiques
> vérifiées dans `data.js`.** Les autres ids sont déclarés mais encore vides : avec le
> défaut `sources=telerama,lemonde`, aucun lien presse ne s'affiche. Pour en voir,
> utilisez `sources=rollingstone,nme` en attendant que la base s'enrichisse.

Dans l'appli, le bouton **`</> Intégrer`** ouvre une fenêtre où l'on **coche les
sources** (2 max) et les **plateformes d'écoute** avant de copier le code. Exemple :

```html
<iframe src="https://mayeullecomte.github.io/sillon/widget.html?style=jazz&filtre=tout&n=6&sources=rollingstone,nme&ecoute=apple,deezer"
        width="100%" height="520" frameborder="0"
        style="border:0;border-radius:16px;max-width:720px"
        loading="lazy" title="MySaphir — Jazz"></iframe>
```

> À noter : l'appli principale affiche **toutes** les sources (c'est le tableau de bord) ;
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
   et interroge l'**API Deezer** pour récupérer leurs morceaux.
3. Un **filtre** affine la sélection :
   - **Tout** — tous les artistes du style ;
   - **Incontournables** / **Classiques** — basé sur l'étiquette `ere` de l'artiste
     dans `data.js` (la recherche Deezer ne donne pas la date de sortie, la récence
     est donc *par artiste*, pas par morceau) ;
   - **Nouveautés** — voir ci-dessous, seul filtre basé sur une **vraie date de sortie**.
4. Le **widget** affiche la sélection. « ↻ Régénérer » propose une nouvelle fournée.

### 🆕 L'onglet Nouveautés

Il ne passe pas par `data.js` : il lit les **playlists éditoriales Deezer** dédiées à
chaque genre, puis vérifie la **date de sortie réelle** de chaque album (`/album/{id}`)
et ne garde que les sorties **de 7 jours ou moins**, les plus récentes d'abord.
Résultat mis en cache 6 h. Certains styles (le jazz notamment) n'ont pas de playlist
nouveautés bien alimentée : l'onglet peut donc être vide — c'est normal.

### 🛟 Robustesse

- **Cache local 7 jours** (`localStorage`) par artiste : les relances suivantes ne
  refont aucune requête, et si l'API bloque on se rabat sur la dernière version en cache.
- Un échec isolé n'annule plus la sélection, et une **nouvelle tentative** est automatique.
- En dernier recours, `fallback.js` fournit un jeu de morceaux embarqué : jamais d'écran d'erreur.

`data.js` est le **cœur du projet** : c'est là que vit la sélection éditoriale,
dans l'esprit d'une rédaction musicale. C'est ce fichier qu'on enrichit dans le temps.

---

## 🛣️ Feuille de route (vers la vision complète)

### 1. Enrichir la base éditoriale (`data.js`)
Ajouter des artistes/albums, affiner par sous-genres, et surtout **compléter le champ
`critique`** — aujourd'hui 42 artistes en ont un (Rolling Stone et NME uniquement).
Priorité : les sources françaises (Télérama, Le Monde, Rock & Folk, Les Inrockuptibles),
déclarées mais encore sans aucun article.

### 2. Liens presse — **articles vérifiés UNIQUEMENT**
> ⚠️ Règle stricte contre la **fausse attribution** : on n'affiche jamais le nom
> d'un média à côté d'un album qu'il n'a pas chroniqué.

Une source ne s'affiche **que** si `data.js` fournit un **lien d'article réel et
vérifié** pour l'artiste, via le champ `critique`. Aucun lien de recherche n'est
généré (une page de recherche prouve zéro critique, et celle du Monde renvoyait
même un 410). Tant qu'un artiste n'a pas de `critique`, **aucune source n'apparaît**.

```js
{ nom: "Kendrick Lamar", ere: "recent", critique: {
    rollingstone: "https://www.rollingstone.com/music/...",   // article RÉEL, vérifié 200
    nme:          "https://www.nme.com/reviews/..."
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

### 4. Nouveautés — **fait ✅**
Sorties Deezer ≤ 7 jours par style, avec filtrage sur la vraie date de sortie.
Amélioration possible : compléter les styles dont la playlist nouveautés est pauvre.

### 5. Écoute complète (optionnel)
Brancher **Spotify** ou **Deezer connecté** (nécessite un compte développeur + connexion
de l'utilisateur) pour lire les morceaux entiers au lieu des extraits de 30 s.

---

*Extraits & pochettes fournis par l'API Deezer. Sélection éditoriale « MySaphir »,
dans l'esprit de Télérama, Le Monde, Rolling Stone & Les Inrockuptibles.
Les liens presse ne s'affichent que vers des articles réels et vérifiés.*

*app by Mayeul Lecomte*
