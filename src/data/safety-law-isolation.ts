// Chapter 10: the safe-isolation challenge as a pure state machine (no DOM).
// The learner clicks objects on the workbench. Each click is an Action; isolationAct() decides
// whether it was the right next step, a harmless repeat, or a slip with a consequence.

/** The circuit chart in the scene. The socket we are working on is on circuit 4. */
export const CIRCUITS = ['Lights upstairs', 'Lights downstairs', 'Cooker', 'Sockets downstairs', 'Shower', 'Immersion heater'];
export const TARGET = 4;

export type Action =
  | { kind: 'chart' }
  | { kind: 'breaker'; n: number }
  | { kind: 'lock' }
  | { kind: 'prover' }
  | { kind: 'socket' }
  | { kind: 'work' };

/** The seven steps, in order. `done` in the state is how many are complete (0 to 7). */
export const STEP_IDS = ['plan', 'isolate', 'lock', 'prove1', 'test', 'prove2', 'work'] as const;
export type StepId = (typeof STEP_IDS)[number];

export type SlipId =
  | 'guess'
  | 'wrongBreaker'
  | 'lockOn'
  | 'proveEarly'
  | 'live'
  | 'colleague'
  | 'falseDead'
  | 'liveWork'
  | 'assume'
  | 'noProve2';

export type InfoId = 'chartAgain' | 'alreadyOff' | 'lockedAlready' | 'provedAlready' | 'testedAlready' | 'otherBreaker';

export interface IsoState {
  done: number;
  slips: number;
}

export type Outcome =
  | { type: 'step'; step: StepId }
  | { type: 'slip'; slip: SlipId; breaker?: number }
  | { type: 'info'; info: InfoId; breaker?: number };

export const startState = (): IsoState => ({ done: 0, slips: 0 });

/** Apply one click. Returns the new state and what happened. Never mutates `s`. */
export function isolationAct(s: IsoState, a: Action): { state: IsoState; outcome: Outcome } {
  const d = s.done;
  const step = (id: StepId) => ({ state: { ...s, done: d + 1 }, outcome: { type: 'step', step: id } as Outcome });
  const slip = (id: SlipId, extra: Partial<IsoState> = {}, breaker?: number) => ({
    state: { ...s, slips: s.slips + 1, ...extra },
    outcome: { type: 'slip', slip: id, breaker } as Outcome,
  });
  const info = (id: InfoId, breaker?: number) => ({ state: s, outcome: { type: 'info', info: id, breaker } as Outcome });

  if (d >= 7) return info('testedAlready');

  // Off but not locked, and the learner moves on: someone switches it back on (back to "planned").
  const movingOn = a.kind === 'prover' || a.kind === 'socket' || a.kind === 'work';
  if (d === 2 && movingOn) return slip('colleague', { done: 1 });

  switch (a.kind) {
    case 'chart':
      return d === 0 ? step('plan') : info('chartAgain');
    case 'breaker':
      if (d === 0) return slip('guess', {}, a.n);
      if (a.n !== TARGET) return d === 1 ? slip('wrongBreaker', {}, a.n) : info('otherBreaker', a.n);
      if (d === 1) return step('isolate');
      return d === 2 ? info('alreadyOff') : info('lockedAlready');
    case 'lock':
      if (d < 2) return slip('lockOn');
      return d === 2 ? step('lock') : info('lockedAlready');
    case 'prover':
      if (d < 2) return slip('proveEarly');
      if (d === 3) return step('prove1');
      if (d === 5) return step('prove2');
      return info(d === 4 ? 'provedAlready' : 'testedAlready');
    case 'socket':
      if (d < 2) return slip('live');
      if (d === 3) return slip('falseDead');
      if (d === 4) return step('test');
      return info('testedAlready');
    case 'work':
      if (d < 2) return slip('liveWork');
      if (d === 3 || d === 4) return slip('assume');
      if (d === 5) return slip('noProve2');
      return step('work');
  }
}

/** Is breaker 4 on, given the step count? (Other breakers are always on.) */
export const targetOn = (s: IsoState) => s.done < 2;

/* ------------------------------ free play (after the challenge) ------------------------------ */

export interface FreeState {
  breakerOn: boolean;
  locked: boolean;
  testerOk: boolean;
}

/** What the voltage indicator shows when it touches the socket (null = nothing at all). */
export function socketReading(f: FreeState): number | null {
  if (!f.testerOk) return null;
  return f.breakerOn ? 230 : 0;
}

/** What it shows on the proving unit. */
export const proverReading = (f: FreeState): number | null => (f.testerOk ? 230 : null);
