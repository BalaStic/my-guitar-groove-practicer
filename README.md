# 🎸 My Guitar Groove Practicer

Egy interaktív webalkalmazás gitárosoknak, amely végtelen groove loop-okat generál gyakorláshoz.

## ✨ Funkciók

- **3 különböző stílus**: Rock 4/4, Blues Shuffle, Funk 16th
- **Interaktív step sequencer vizualizáció**: Láthatod, melyik lépésnél jár a groove
- **Alaphang választás**: E, A, D, G (gitárosoknak ismerős hangnemek)
- **Állítható tempó**: 60-180 BPM
- **Valós idejű audio szintézis**: Tone.js-sel generált dob és basszus hangok

## 🚀 Használat

### Fejlesztői mód
```bash
npm install
npm run dev
```

Majd nyisd meg a böngészőben: `http://localhost:5173`

### Production build
```bash
npm run build
npm run preview
```

## 🎵 Használati útmutató

1. Válaszd ki a **stílust** (Rock, Blues, Funk)
2. Állítsd be az **alaphangot** a basszushoz
3. Válaszd ki a kívánt **tempót** (BPM)
4. Nyomd meg a **PLAY** gombot
5. Játssz rá a groove-ra a gitároddal!

## 🌐 Deployment

Az alkalmazás statikus weboldal, így könnyen hostolható:

- **GitHub Pages**
- **Netlify** 
- **Vercel**
- **Cloudflare Pages**

Egyszerűen futtasd a `npm run build` parancsot, és a `dist/` mappa tartalma hostolható bárhova.

## 🔮 Jövőbeli fejlesztések (TODO)

- [ ] Algoritmikus groove generálás (Euclidean rhythm, Markov-lánc)
- [ ] Akkordmenet-követés (I-IV-V, ii-V-I progressions)
- [ ] Fill-ek beszúrása 4/8 ütem után
- [ ] Saját groove felvétele/mentése
- [ ] Humanize funkció (timing/velocity variáció)
- [ ] MIDI export DAW-hoz
- [ ] További stílusok hozzáadása

## 🛠️ Technológiák

- **Vite**: Modern build tool
- **Tone.js**: Web Audio szintézis és ütemezés
- **Vanilla JavaScript**: Tiszta, dependency-mentes frontend

## 📝 Licenc

MIT License - szabadon használható és módosítható!

---

**Built with ❤️ for guitarists who love to practice!**
