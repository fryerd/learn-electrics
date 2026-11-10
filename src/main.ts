import '@fontsource/barlow-semi-condensed/500.css';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';
import './style.css';

import { DEFAULT_CHAPTER, chapterById } from './data/chapters';
import { markDone } from './progress';
import { mountBasics } from './chapters/basics';
import { mountSocket } from './chapters/socket';
import { mountSoon } from './chapters/soon';
import { initStrip } from './ui/strip';

// Each chapter mounts lazily the first time it is opened, and is paused while hidden.
interface Mounted {
  activate(): void;
  deactivate(): void;
}

type Pane = 'socket' | 'basics' | 'soon';
const PANES: Pane[] = ['socket', 'basics', 'soon'];

const paneFor = (id: string): Pane => (id === 'sockets' ? 'socket' : id === 'basics' ? 'basics' : 'soon');

const mounted = new Map<Pane, Mounted>();
const soon = mountSoon();
let activePane: Pane | null = null;

function mount(pane: Pane): Mounted {
  let m = mounted.get(pane);
  if (!m) {
    if (pane === 'socket') m = mountSocket(() => markDone('sockets'));
    else if (pane === 'basics') m = mountBasics(() => markDone('basics'));
    else m = { activate() {}, deactivate() {} };
    mounted.set(pane, m);
  }
  return m;
}

const strip = initStrip((id) => {
  location.hash = `#/${id}`;
});

function show(id: string) {
  const chapter = chapterById(id) ?? chapterById(DEFAULT_CHAPTER)!;
  const pane = paneFor(chapter.id);

  if (activePane && activePane !== pane) mounted.get(activePane)?.deactivate();
  for (const p of PANES) {
    document.getElementById(`stage-${p}`)!.hidden = p !== pane;
    document.getElementById(`panel-${p}`)!.hidden = p !== pane;
  }
  if (pane === 'soon') soon.show(chapter);
  mount(pane).activate();
  activePane = pane;

  strip.setCurrent(chapter.id);
  document.title = `${chapter.n}. ${chapter.title} · Learn Electrics`;
}

const fromHash = () => location.hash.replace(/^#\/?/, '') || DEFAULT_CHAPTER;
window.addEventListener('hashchange', () => show(fromHash()));
show(fromHash());
