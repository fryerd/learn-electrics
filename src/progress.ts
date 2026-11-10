// Which chapters you have finished. Saved in this browser only (localStorage), and the app
// works fine without it (private windows, blocked storage).

const KEY = 'learn-electrics-progress-v1';
const listeners = new Set<() => void>();

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

let done = read();

export function isDone(id: string) {
  return done.has(id);
}

export function doneCount() {
  return done.size;
}

export function markDone(id: string) {
  if (done.has(id)) return;
  done.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...done]));
  } catch {
    /* storage unavailable: progress lasts for this visit only */
  }
  listeners.forEach((fn) => fn());
}

export function onProgress(fn: () => void) {
  listeners.add(fn);
}
