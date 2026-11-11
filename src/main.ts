import '@fontsource/barlow-semi-condensed/500.css';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';
import './style.css';

import { chapterById } from './data/chapters';
import { markDone } from './progress';
import { loaders } from './chapters/registry';
import { renderSoon } from './chapters/soon';
import type { ChapterContext, ChapterInstance } from './chapters/types';
import { mountHome } from './chapters/home';
import { initPills } from './ui/pills';

// Every chapter gets its own stage pane and panel pane. They are created the first time the chapter is
// opened, then simply shown and hidden. The socket chapter's panes are written in index.html.

interface Slot {
  ctx: ChapterContext;
  instance?: ChapterInstance;
}

const app = document.getElementById('app')!;
const pillsNav = document.getElementById('pills-nav')!;
const stageRoot = document.getElementById('stage')!;
const panelRoot = document.querySelector('.panel')!;
const slots = new Map<string, Slot>();
let activeId: string | null = null;
let navToken = 0;

function slotFor(id: string): Slot {
  let slot = slots.get(id);
  if (slot) return slot;
  let stage: HTMLElement;
  let panel: HTMLElement;
  if (id === 'sockets') {
    stage = document.getElementById('stage-socket')!;
    panel = document.getElementById('panel-socket')!;
  } else {
    stage = document.createElement('div');
    stage.className = 'stage-pane';
    stage.id = `stage-${id}`;
    stage.hidden = true;
    stageRoot.append(stage);
    panel = document.createElement('div');
    panel.className = 'panel-pane';
    panel.id = `panel-${id}`;
    panel.hidden = true;
    panelRoot.append(panel);
  }
  slot = { ctx: { stage, panel, complete: () => markDone(id) } };
  slots.set(id, slot);
  return slot;
}

const pills = initPills((id) => {
  location.hash = `#/${id}`;
});

// The homepage: the 3D socket and the way in. It is its own little "chapter" with no panel.
let home: { activate(): void; deactivate(): void } | undefined;

function showHome() {
  navToken++;
  app.dataset.view = 'home';
  pillsNav.hidden = true;
  for (const s of slots.values()) {
    s.ctx.stage.hidden = true;
    s.ctx.panel.hidden = true;
  }
  document.getElementById('stage-home')!.hidden = false;
  if (activeId) slots.get(activeId)?.instance?.deactivate();
  activeId = null;
  home ??= mountHome();
  home.activate();
  document.title = 'Learn Electrics';
}

async function show(requested: string) {
  const chapter = chapterById(requested);
  if (!chapter) return showHome();
  const token = ++navToken;
  const slot = slotFor(chapter.id);

  home?.deactivate();
  document.getElementById('stage-home')!.hidden = true;
  app.dataset.view = 'chapter';
  pillsNav.hidden = false;

  // Show this chapter's panes straight away (a chapter that is still loading just looks empty for a moment).
  for (const [id, s] of slots) {
    s.ctx.stage.hidden = id !== chapter.id;
    s.ctx.panel.hidden = id !== chapter.id;
  }
  pills.setCurrent(chapter.id);
  document.title = `${chapter.n}. ${chapter.title} · Learn Electrics`;

  if (!slot.instance) {
    const loader = loaders[chapter.id];
    if (loader) {
      try {
        const mod = await loader();
        if (token !== navToken) return; // the learner moved on while this was loading
        slot.instance = mod.mount(slot.ctx);
      } catch (err) {
        console.error(`Could not load chapter "${chapter.id}"`, err);
        renderSoon(slot.ctx, chapter);
        slot.instance = { activate() {}, deactivate() {} };
      }
    } else {
      renderSoon(slot.ctx, chapter);
      slot.instance = { activate() {}, deactivate() {} };
    }
  }

  if (activeId && activeId !== chapter.id) slots.get(activeId)?.instance?.deactivate();
  slot.instance.activate();
  activeId = chapter.id;
}

const fromHash = () => location.hash.replace(/^#\/?/, '');
window.addEventListener('hashchange', () => void show(fromHash()));
void show(fromHash());

// The footer disclaimer is one line inside the course; click it to read it all.
document.getElementById('disclaimer')!.addEventListener('click', (e) => (e.currentTarget as HTMLElement).classList.toggle('expanded'));
