#!/usr/bin/env python3
"""Génère les icônes PNG de Sillon (motif vinyle) pour l'écran d'accueil iOS/PWA."""
from PIL import Image, ImageDraw, ImageFilter
import os

SS = 2048  # super-échantillonnage pour un rendu net
CX = CY = SS // 2

# --- Palette (identique à l'app) ---
FOND   = (20, 17, 26)     # violet très sombre
DISQUE = (14, 12, 17)     # noir du vinyle
GROOVE = (44, 39, 53)     # sillons
ACCENT = (229, 83, 60)    # rouge-brique
AMBRE  = (240, 166, 60)   # ambre (halo)

img = Image.new("RGB", (SS, SS), FOND)

# --- Halo chaud en haut-gauche (glow flouté) ---
glow = Image.new("L", (SS, SS), 0)
gd = ImageDraw.Draw(glow)
gd.ellipse([-SS*0.15, -SS*0.15, SS*0.55, SS*0.55], fill=255)
glow = glow.filter(ImageFilter.GaussianBlur(SS // 12))
halo = Image.new("RGB", (SS, SS), ACCENT)
img = Image.composite(halo, img, glow.point(lambda p: int(p * 0.28)))

d = ImageDraw.Draw(img)

# --- Disque vinyle ---
R = int(SS * 0.40)
d.ellipse([CX-R, CY-R, CX+R, CY+R], fill=DISQUE)

# --- Sillons (anneaux concentriques) ---
r = int(SS * 0.135)
pas = int(SS * 0.016)
ep  = max(2, SS // 500)
while r < R - pas:
    d.ellipse([CX-r, CY-r, CX+r, CY+r], outline=GROOVE, width=ep)
    r += pas

# --- Reflet diagonal (lumière) ---
refl = Image.new("L", (SS, SS), 0)
rd = ImageDraw.Draw(refl)
rd.polygon([(CX-R, CY-R), (CX-R+SS*0.10, CY-R), (CX+R, CY+R-SS*0.10), (CX+R, CY+R)], fill=40)
mask_disc = Image.new("L", (SS, SS), 0)
ImageDraw.Draw(mask_disc).ellipse([CX-R, CY-R, CX+R, CY+R], fill=255)
refl = Image.composite(refl, Image.new("L", (SS, SS), 0), mask_disc)
img = Image.composite(Image.new("RGB", (SS, SS), (255, 255, 255)), img,
                      refl.filter(ImageFilter.GaussianBlur(SS // 300)))

d = ImageDraw.Draw(img)

# --- Label central (dégradé accent -> ambre, approximé par 2 cercles) ---
rl = int(SS * 0.135)
d.ellipse([CX-rl, CY-rl, CX+rl, CY+rl], fill=ACCENT)
d.ellipse([CX-rl, CY-rl, CX+int(rl*0.35), CY+int(rl*0.55)], fill=AMBRE)  # touche chaude
# anneau fin entre grooves et label
d.ellipse([CX-rl, CY-rl, CX+rl, CY+rl], outline=(0, 0, 0), width=max(2, SS//360))

# --- Trou central ---
rh = int(SS * 0.018)
d.ellipse([CX-rh, CY-rh, CX+rh, CY+rh], fill=FOND)

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
