#!/usr/bin/env python3
"""Génère les icônes PNG de MySaphir (diamant saphir à facettes) pour iOS/PWA."""
from PIL import Image, ImageDraw, ImageFilter
import os

SS = 2048  # super-échantillonnage pour un rendu net
CX = CY = SS // 2

# --- Palette ---
FOND_H = (24, 34, 66)     # bleu nuit (haut)
FOND_B = (10, 14, 30)     # presque noir (bas)
SAPHIRS = [               # du plus clair au plus profond
    (198, 226, 255), (140, 190, 250), (88, 150, 240),
    (52, 110, 222), (30, 78, 190), (20, 52, 150), (12, 32, 104),
]

# --- Fond : dégradé vertical ---
img = Image.new("RGB", (SS, SS))
d = ImageDraw.Draw(img)
for y in range(SS):
    t = y / SS
    d.line([(0, y), (SS, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(FOND_H, FOND_B)))

# --- Halo bleu derrière la pierre ---
glow = Image.new("L", (SS, SS), 0)
ImageDraw.Draw(glow).ellipse([CX - SS*0.36, CY - SS*0.30, CX + SS*0.36, CY + SS*0.38], fill=255)
glow = glow.filter(ImageFilter.GaussianBlur(SS // 9))
img = Image.composite(Image.new("RGB", (SS, SS), (60, 120, 255)), img, glow.point(lambda p: int(p * 0.35)))
d = ImageDraw.Draw(img)

# --- Géométrie du diamant (vue de profil, taille brillant) ---
W = SS * 0.66                    # largeur au rondiste
yT = CY - SS * 0.25              # table (haut)
yG = CY - SS * 0.08              # rondiste (ligne la plus large)
yC = CY + SS * 0.32              # colette (pointe basse)
xs_t = [CX + W * f for f in (-0.27, -0.09, 0.09, 0.27)]               # 4 points de table
xs_g = [CX + W * f for f in (-0.5, -0.36, -0.18, 0.0, 0.18, 0.36, 0.5)]  # 7 points du rondiste
T = [(x, yT) for x in xs_t]
G = [(x, yG) for x in xs_g]
C = (CX, yC)

def facette(pts, teinte):
    d.polygon(pts, fill=SAPHIRS[teinte])

# Couronne : trapèzes/triangles entre table et rondiste
facette([G[0], T[0], G[1]], 1)
facette([T[0], G[1], G[2]], 0)
facette([T[0], T[1], G[2]], 2)
facette([T[1], G[2], G[3]], 1)
facette([T[1], T[2], G[3]], 0)
facette([T[2], G[3], G[4]], 2)
facette([T[2], T[3], G[4]], 3)
facette([T[3], G[4], G[5]], 2)
facette([T[3], G[5], G[6]], 4)

# Pavillon : du rondiste à la colette, avec arêtes intermédiaires
M = [(CX + W * f, yG + (yC - yG) * 0.42) for f in (-0.30, -0.10, 0.10, 0.30)]
facette([G[0], G[1], M[0]], 2)
facette([G[0], M[0], C], 3)
facette([G[1], G[2], M[1], M[0]], 1)
facette([M[0], M[1], C], 4)
facette([G[2], G[3], M[1]], 3)
facette([G[3], G[4], M[2], M[1]], 2)
facette([M[1], M[2], C], 5)
facette([G[4], G[5], M[3], M[2]], 4)
facette([M[2], M[3], C], 6)
facette([G[5], G[6], M[3]], 5)
facette([G[6], M[3], C], 6)

# Arêtes fines (lumière)
ep = max(3, SS // 400)
arete = (225, 238, 255)
for a, b in [(T[0], T[3]), (G[0], G[6]), (G[0], T[0]), (G[6], T[3]), (G[0], C), (G[6], C)]:
    d.line([a, b], fill=arete, width=ep)

# --- Éclats (étoiles à 4 branches) ---
def eclat(x, y, r):
    e = Image.new("L", (SS, SS), 0)
    ed = ImageDraw.Draw(e)
    ed.polygon([(x, y - r), (x + r*0.14, y), (x, y + r), (x - r*0.14, y)], fill=255)
    ed.polygon([(x - r, y), (x, y - r*0.14), (x + r, y), (x, y + r*0.14)], fill=255)
    e = e.filter(ImageFilter.GaussianBlur(SS // 700))
    return e

lum = Image.new("L", (SS, SS), 0)
for x, y, r in [(T[0][0] + SS*0.02, yT + SS*0.02, SS*0.075), (CX + W*0.40, CY - SS*0.30, SS*0.05)]:
    lum = Image.composite(Image.new("L", (SS, SS), 255), lum, eclat(x, y, r))
img = Image.composite(Image.new("RGB", (SS, SS), (255, 255, 255)), img, lum)

# --- Export multi-tailles ---
base = os.path.dirname(os.path.abspath(__file__))
sorties = {
    "apple-touch-icon.png": 180,   # iOS "Sur l'écran d'accueil"
    "icon-180.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
    "icon-1024.png": 1024,
}
for nom, taille in sorties.items():
    img.resize((taille, taille), Image.LANCZOS).save(os.path.join(base, nom))
    print("écrit:", nom, f"{taille}x{taille}")
