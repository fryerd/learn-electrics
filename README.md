# Learn Electrics

Interactive 3D explainers for UK electrical installation basics, built as a personal learning project after the BTC *Introduction to Electrics* course.

The course follows electricity from the street to the appliances, as 11 chapters (see [docs/curriculum.md](docs/curriculum.md)). Chapters live on a strip along the bottom of the page, and each has its own link (`#/basics`, `#/sockets`, ...).

All 11 chapters are built:

1. **Electricity basics:** a water-pipe animation with voltage and resistance sliders, an Ohm's law triangle.
2. **The power network:** an animated journey from power station to consumer unit, why the grid uses high voltage, and a "will my supply cope?" load gauge.
3. **Supply and earthing:** TN-S, TN-C-S and TT, a "cause a fault" animation, and a bonding-clamp game.
4. **The consumer unit:** build one, a trip-curve tool and a virtual RCD tester.
5. **Cables and circuit design:** a cable that heats up, Ib ≤ In ≤ Iz checks and volt drop.
6. **The earth fault loop:** an animated Zs loop with sliders and a virtual loop meter.
7. **Socket circuits:** a 3D 13 A socket you can explore, wire (with instant fault feedback) and fit the faceplate onto.
8. **Lighting and switches:** a switch builder and a wire-it circuit simulator (one-way, two-way, intermediate).
9. **Special locations and IP codes:** fit out a bathroom by zone, an IP code decoder and a fan circuit.
10. **Safety and the law:** a safe-isolation challenge and "is it notifiable?" cards.
11. **Certification and fault-finding:** a virtual test rig with planted faults, and a certificate to fill in.

Every chapter has a quiz. Progress is saved in your browser only. See [docs/chapter-guide.md](docs/chapter-guide.md) for how a chapter is put together.

> **For personal interest only.** This is an educational project, not a substitute for qualified training or a guide to carrying out electrical work. Electrical work must be done by a competent person, and much domestic work in England and Wales is notifiable under Part P of the Building Regulations. Content follows UK practice (BS 7671:2018+A4:2026, the 18th Edition, and BS 1363) and may be out of date, so always check the current regulations.

## Stack

- [Vite](https://vite.dev) + TypeScript
- [three.js](https://threejs.org) for the 3D scenes (no UI framework)
- Lessons are plain data in `src/data/`, so a new lesson is a new data file plus a scene

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

## Project layout

```
src/
  main.ts                 the shell: chapter strip, links, showing the right chapter
  chapters/               one module per chapter (basics, socket, "coming soon")
  data/                   chapter list and each lesson's text, parts and quiz questions
  scene/socket.ts         the three.js socket scene
  ui/                     strip, side panels, wire-it panel, shared quiz
  progress.ts             saved progress (localStorage)
  style.css
```

## Content and copyright

Code is MIT licensed (see `LICENSE`). Lesson text and quiz content in `src/data/` are shared under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).

All text, diagrams and 3D models here are original. Course slides and photos are used only as study references and are **not** committed to the repository (see `.gitignore`).
