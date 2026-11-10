# How to build a chapter

Learn Electrics is a course about UK domestic electrics, told as a journey from the street to the appliances (see [curriculum.md](curriculum.md)). Each chapter is one self-contained module. This guide is the contract for building one.

## Reference implementations

- `src/chapters/basics.ts` + `src/data/basics-lesson.ts`: chapter 1. The quality bar and structure to copy: a big live SVG picture on the stage, a side panel with a **Play** tab (sliders, presets, a challenge, a calculator) and a **Quiz** tab.
- `src/chapters/socket.ts` + `src/scene/socket.ts`: chapter 7, a 3D (three.js) chapter with "wire it yourself" interaction and instant fault feedback. Use three.js only if the chapter truly needs 3D; most chapters are best as SVG/canvas/DOM.
- `src/ui/quiz.ts` (`mountQuiz`): the shared quiz. `src/chapters/types.ts`: the contract below.

## The contract

A chapter is `src/chapters/<id>.ts` exporting `mount: ChapterMount` (see `types.ts`):

```ts
export const mount: ChapterMount = ({ stage, panel, complete }) => {
  // build the DOM inside stage and panel (once), wire up events
  return { activate() { /* start animation loop */ }, deactivate() { /* stop it */ } };
};
```

- `stage` is the big left area (`.stage-pane`, `position: absolute; inset: 0`). Fill it with an SVG/canvas/DOM picture that scales (use an SVG `viewBox`, `preserveAspectRatio` default `meet`).
- `panel` is the side panel (`.panel-pane`, a flex column). Use the same structure as `basics.ts`: a `.tabs` bar with `role="tab"` buttons, and `role="tabpanel"` sections (these already scroll and pad correctly).
- Call `complete()` when the learner has finished (normally: quiz score ≥ 75%, or the main challenge done). It ticks the chapter off on the strip.
- Animation loops must run only between `activate()` and `deactivate()`. Respect `prefers-reduced-motion` (no endless loops; show a static state).

## Files you may touch

Only your own: `src/chapters/<id>.ts` (replace the placeholder), `src/chapters/<id>.css` (import it from your `.ts`), `src/data/<id>-lesson.ts` (text, presets, quiz), and any helper files named `src/chapters/<id>-*.ts` or `src/data/<id>-*.ts`. Do **not** edit `style.css`, `main.ts`, `index.html`, `chapters.ts`, `registry.ts`, `package.json`, or another chapter's files. If you need a shared change, say so in your report instead.

## Lesson recipe (non-negotiable)

Nothing is read-only. Every chapter mixes:

1. **Try**: a challenge or goal first ("make a 3 kW kettle", "place the bonding clamps").
2. **Reveal**: the explanation appears as the learner tries, with **instant feedback** (no "check" button where it can be avoided).
3. **Check**: a 4-5 question quiz with `mountQuiz` (questions with a `why` explanation each).
4. **Tool**: a calculator, simulator or virtual meter they can keep playing with.

Plain English for a keen beginner. Short sentences. Original wording only.

## Look and feel ("cable colours" palette, light theme)

Tokens (CSS variables, set in `style.css`): `--paper #f4f3ef`, `--paper-2`, `--ink #1d232b`, `--ink-soft #505a66`, `--line #d9d5cb`, `--card #fbfaf7`, `--accent #1f5fbf` (neutral blue), `--brown #6b3f1d` (line brown), `--good`, `--bad`, `--good-bg`, `--bad-bg`, `--font` (Barlow Semi Condensed). The UK core colours are the accents: brown line, blue neutral, green-and-yellow earth (`repeating-linear-gradient(90deg,#2f9e4f 0 5px,#f2c40f 5px 10px)`).

Shared classes you can reuse: `.detail`, `.tabs`, `[role=tabpanel]`, `.pane-body`, `.primary`, `.ghost`, `.chip`, `.badge`, `.slider-card`, `.readouts`/`.readout`, `.presets`, `.challenge` (+ `.ok`), `.wire-label`, `.uk` (the "UK standards" call-out), `.wire-results`/`.wire-summary` (feedback rows: `.ok`, `.warn`, `.bad`).

Your own classes must be prefixed with your chapter prefix (for example `nw-`, `er-`) and live in your own `.css` file.

**Make it beautiful.** The stage should be a large, clean, polished illustration, in the same rounded, soft-shadow, line-art style as chapters 1 and 7: confident layout, smooth transitions and animation, readable labels (at least 12 px), colour used with intent (colour-code the three conductors consistently), good contrast (text at least 4.5:1). It must work at stage sizes from about 360 x 300 up to 900 x 500, and on touch screens (pointer events; nothing important behind hover only). Controls are real `<button>`/`<input>` elements with labels, operable by keyboard. Drag interactions use pointer events and also have a click alternative.

## Content rules

- UK only: BS 7671:2018+A4:2026 (the 18th Edition), BS 1363, UK cable colours (brown line, blue neutral, green-and-yellow earth). Mention EU practice only in passing.
- Say **line** (not "live") for the line conductor; the neutral is a live conductor too.
- The course is educational and "practical, not perfect". Where you are not sure of a figure, leave it out or phrase it as "typically", and tell me in your report.
- Facts we have checked: bathroom sockets must be at least 3 m horizontally from the edge of zone 1; there are zones 0, 1 and 2 plus outside the zones (there is no zone 3); insulation resistance minimum is 1.0 MΩ for circuits up to 500 V (tested at 500 V DC); Part F is ventilation, Part G is sanitation/hot water/water efficiency, Part P is electrical safety; the UK nominal supply is 230 V (about 216-253 V allowed).
- Facts to leave out: any fixed "50 m" spur length limit, and a table of flex (appliance lead) current ratings.
- `private/` holds the learner's personal course notes (`private/transcript.md`). You may read it to understand scope, but never copy its wording, numbers tables or anything else into code, never mention the course provider in the UI, and never commit anything from `private/`.

## Building and checking your work

- Put calculations and simulations in **pure exported functions** (no DOM) and sanity-check them with a throwaway script. Typecheck with `npx tsc --noEmit` and build with `npm run build`; both must pass.
- Do a visual check: run your own dev server on the port you were given (`npm run dev -- --port <N> --strictPort`, in the background), open `http://localhost:<N>/#/<id>` in **your own** browser tab (create it with the tabs tool; pass your `tabId` to every browser call; never touch other tabs; close yours at the end), and look at it at roughly 1280 x 800 and 390 x 800 (`resize_window` only affects your tab). Background tabs pause `requestAnimationFrame`, so briefly foreground your tab (`tabs_select`) when checking animation.
- Commit on your branch with a clear message ending with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push or merge.
