#!/usr/bin/env python3
"""Précharge quelques morceaux par style depuis iTunes et écrit fallback.js
   (jeu de secours embarqué dans le site, affiché si l'API iTunes bugue/bloque)."""
import json, time, urllib.parse, urllib.request

PAYS = "fr"
PAR_STYLE = 6          # morceaux gardés par style
API = "https://itunes.apple.com/search"

# Quelques artistes de référence par style (assez pour remplir le secours)
SEEDS = {
    "jazz":      ["Miles Davis", "John Coltrane", "Kamasi Washington"],
    "rock":      ["Radiohead", "David Bowie", "Fontaines D.C."],
    "hiphop":    ["A Tribe Called Quest", "Kendrick Lamar", "Nas"],
    "rap-fr":    ["IAM", "Nekfeu", "Oxmo Puccino"],
    "electro":   ["Daft Punk", "Bonobo", "Jon Hopkins"],
    "chanson":   ["Serge Gainsbourg", "Juliette Armanet", "Barbara"],
    "soul":      ["Marvin Gaye", "Michael Kiwanuka", "Stevie Wonder"],
    "rnb":       ["D'Angelo", "Frank Ocean", "Erykah Badu"],
    "classique": ["Claude Debussy", "Max Richter", "Erik Satie"],
    "folk":      ["Bob Dylan", "Fleet Foxes", "Nick Drake"],
    "afro":      ["Fela Kuti", "Amadou & Mariam", "Tinariwen"],
    "metal":     ["Tool", "Gojira", "Mogwai"],
}

def cherche(nom):
    q = urllib.parse.urlencode({
        "term": nom, "media": "music", "entity": "song",
        "attribute": "artistTerm", "country": PAYS, "limit": 8,
    })
    req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read().decode())
    out = []
    for x in data.get("results", []):
        if not (x.get("previewUrl") and x.get("artworkUrl100")):
            continue
        out.append({
            "trackId": x.get("trackId"),
            "titre": x.get("trackName"),
            "artiste": x.get("artistName"),
            "artisteRef": nom,
            "album": x.get("collectionName"),
            "genre": x.get("primaryGenreName"),
            "annee": (x.get("releaseDate") or "")[:4],
            "preview": x.get("previewUrl"),
            "pochette": (x.get("artworkUrl100") or "").replace("100x100", "300x300"),
            "lien": x.get("trackViewUrl") or x.get("collectionViewUrl") or "",
        })
    return out

fallback = {}
for style, artistes in SEEDS.items():
    vus, morceaux = set(), []
    for a in artistes:
        for m in cherche(a):
            if m["trackId"] in vus:
                continue
            vus.add(m["trackId"])
            morceaux.append(m)
        time.sleep(0.4)  # on ménage l'API
    fallback[style] = morceaux[:PAR_STYLE]
    print(f"{style:10s} -> {len(fallback[style])} morceaux")

with open("fallback.js", "w", encoding="utf-8") as f:
    f.write("// Jeu de secours embarqué — préchargé depuis iTunes (build-fallback.py).\n")
    f.write("// Affiché quand l'API iTunes est injoignable/limitée, pour ne jamais montrer d'erreur.\n")
    f.write("export const FALLBACK = ")
    json.dump(fallback, f, ensure_ascii=False, indent=1)
    f.write(";\n")
print("\nfallback.js écrit —", sum(len(v) for v in fallback.values()), "morceaux au total")
