import type { QuizQuestion } from './socket-lesson';
import { maxLength, type Result, type Setup } from '../chapters/fault-loop-model';

// Chapter 6: the earth fault loop. Original wording.

export const lesson = {
  title: 'The earth fault loop',
  intro:
    'Change the supply, cable and breaker, and watch the loop. Then try the challenges.',
  meterTitle: 'Test it with a meter',
  meterIntro:
    'An earth fault loop tester measures Zs at a socket by briefly sending a small current round the loop. It also works out the prospective fault current: 230 V ÷ Zs.',
};

/** Ze presets. TN figures are the usual maximums quoted by network operators; TT depends on the earth electrode. */
export const supplies: { id: string; label: string; note: string; ze: number }[] = [
  { id: 'tns', label: 'TN-S', note: 'cable sheath earth', ze: 0.8 },
  { id: 'tncs', label: 'TN-C-S', note: 'PME, combined N and E', ze: 0.35 },
  { id: 'tt', label: 'TT', note: 'own earth rod (example)', ze: 21 },
];

export const startSetup: Setup = { ze: 0.35, cable: '2.5/1.5', length: 30, ring: false, type: 'B', rating: 32 };

export interface ChallengeCheck {
  done: boolean;
  /** Instant feedback for the current settings. */
  msg: string;
}

export interface Challenge {
  id: string;
  title: string;
  ask: string;
  setup: Setup;
  check: (s: Setup, r: Result) => ChallengeCheck;
  /** Shown once solved. */
  reveal: string;
  /** An answer button for "is it even possible?" challenges. */
  answer?: { label: string; reveal: string };
}

const fmt = (n: number) => n.toFixed(2);

const ringMax = maxLength({ ze: 0.3, cable: '2.5/1.5', ring: true, type: 'B', rating: 32 });

export const challenges: Challenge[] = [
  {
    id: 'size',
    title: 'Fix it with a fatter cable',
    ask: 'A 32 A type B radial runs 55 m in 2.5/1.5 on a TN-C-S supply, and it fails. Change <b>only the cable size</b> until it passes.',
    setup: { ze: 0.35, cable: '2.5/1.5', length: 55, ring: false, type: 'B', rating: 32 },
    check: (s, r) => {
      const same = Math.abs(s.ze - 0.35) < 0.005 && s.length === 55 && !s.ring && s.type === 'B' && s.rating === 32;
      if (!same) return { done: false, msg: 'Keep Ze, length, radial and the B32 breaker as they were. Press “Set it up” to start again.' };
      if (r.status === 'pass') return { done: true, msg: '' };
      if (s.cable === '4/1.5')
        return { done: false, msg: `Closer: Zs is ${fmt(r.zs)} Ω. The fatter line helped, but the thin 1.5 mm² CPC is still holding it back.` };
      return { done: false, msg: `Zs is ${fmt(r.zs)} Ω, over the ${fmt(r.limit80)} Ω limit. Try a bigger size.` };
    },
    reveal:
      'Thicker copper has less resistance, so R1 + R2 falls. Notice that 4/1.5 is not quite enough: the CPC is half the loop, so it matters as much as the line.',
  },
  {
    id: 'ring',
    title: 'How long can the ring be?',
    ask: 'A new 32 A type B <b>ring</b> on TN-C-S with Ze 0.30 Ω, wired in 2.5/1.5. Drag the length to the <b>longest ring that still passes</b>.',
    setup: { ze: 0.3, cable: '2.5/1.5', length: 60, ring: true, type: 'B', rating: 32 },
    check: (s, r) => {
      const same = Math.abs(s.ze - 0.3) < 0.005 && s.cable === '2.5/1.5' && s.ring && s.type === 'B' && s.rating === 32;
      if (!same) return { done: false, msg: 'Only move the length. Press “Set it up” to put the rest back.' };
      if (r.status !== 'pass') return { done: false, msg: `Too long: Zs ${fmt(r.zs)} Ω is over the 80% limit of ${fmt(r.limit80)} Ω. Come back a little.` };
      if (s.length < ringMax - 8) return { done: false, msg: `Passes with Zs ${fmt(r.zs)} Ω. There is still room: how much longer can it go?` };
      return { done: true, msg: '' };
    },
    reveal: `About ${Math.floor(ringMax)} m. The limit is 0.8 × 1.37 = 1.10 Ω, so R1 + R2 can use 1.10 − 0.30 = 0.80 Ω. On a ring the worst point is the middle, where the two halves share the current, so R1 + R2 there is a quarter of the end-to-end value. In practice other checks, such as voltage drop, usually stop a ring well before this.`,
  },
  {
    id: 'type',
    title: 'Swap the breaker',
    ask: 'A garage radial: TN-S, 20 m of 2.5/1.5, protected by a 32 A <b>type C</b>. It fails badly. Choose a breaker of <b>at least 20 A</b> that passes, without touching the cable.',
    setup: { ze: 0.8, cable: '2.5/1.5', length: 20, ring: false, type: 'C', rating: 32 },
    check: (s, r) => {
      const same = Math.abs(s.ze - 0.8) < 0.005 && s.cable === '2.5/1.5' && s.length === 20 && !s.ring;
      if (!same) return { done: false, msg: 'Leave the supply and the cable alone: only change the breaker.' };
      if (s.rating < 20) return { done: false, msg: 'That passes, but it is too small for the garage. Keep it at 20 A or more.' };
      if (r.status === 'pass') return { done: true, msg: '' };
      if (s.type === 'C') return { done: false, msg: `A type C ${s.rating} A needs Zs under ${fmt(r.limit80)} Ω. It has ${fmt(r.zs)} Ω. Try the other type.` };
      return { done: false, msg: `Getting there: ${fmt(r.zs)} Ω against a limit of ${fmt(r.limit80)} Ω. Try a lower rating.` };
    },
    reveal:
      'A type B 20 A or 25 A works. Type C breakers need about 10 times their rating to trip instantly (type B about 5), so their maximum Zs is half as big. They suit motors and other big start-up surges, not ordinary sockets.',
  },
  {
    id: 'tt',
    title: 'The TT puzzle',
    ask: 'Now the supply is <b>TT</b> (its own earth rod, Ze 21 Ω here). Try any breaker you like. Can any of them pass?',
    setup: { ze: 21, cable: '2.5/1.5', length: 20, ring: false, type: 'B', rating: 6 },
    check: (s, r) =>
      s.ze < 5
        ? { done: false, msg: 'Keep the TT supply: press “Set it up” to put it back.' }
        : {
            done: false,
            msg: `Zs is ${fmt(r.zs)} Ω, so only about ${r.fault.toFixed(1)} A flows. Even a 6 A type B needs Zs under ${fmt(7.28 * 0.8)} Ω.`,
          },
    reveal: '',
    answer: {
      label: 'None of them can',
      reveal:
        'Right. With an earth rod the loop is far too high for any breaker to trip in time. That is why TT installations rely on RCDs, which trip on a tiny leak of 30 mA instead of a big fault current. On TT the required time is also shorter than on TN.',
    },
  },
];

export const quiz: QuizQuestion[] = [
  {
    q: 'What makes up the earth fault loop impedance, Zs?',
    options: ['Ze + (R1 + R2)', 'R1 + R2 only', 'Ze − (R1 + R2)'],
    answer: 0,
    why: 'Zs is the whole loop: the supply side (Ze) plus your line conductor (R1) and your CPC (R2).',
  },
  {
    q: 'A circuit’s Zs doubles. What happens to the fault current?',
    options: ['It doubles', 'It halves', 'It stays the same'],
    answer: 1,
    why: 'Fault current is 230 V ÷ Zs. Twice the impedance lets half the current flow, so the breaker is slower.',
  },
  {
    q: 'A 32 A type B circuit has a maximum Zs of 1.37 Ω. You measure 1.30 Ω. Is that acceptable?',
    options: ['Yes, it is under 1.37 Ω', 'No, it is over 80% of 1.37 Ω (about 1.10 Ω)', 'Only if the cable is a ring'],
    answer: 1,
    why: 'Readings are taken with the cable cool. In use it warms up and its resistance rises, so a measured Zs is compared with about 80% of the maximum.',
  },
  {
    q: 'Same rating, type C instead of type B. What happens to the maximum Zs?',
    options: ['It doubles', 'It stays the same', 'It halves'],
    answer: 2,
    why: 'A type C needs about 10 × its rating to trip instantly, twice what a type B needs, so the loop must be half the impedance.',
  },
  {
    q: 'Why must the breaker disconnect within 0.4 s?',
    options: [
      'To protect the cable from overheating',
      'So metalwork does not stay at a dangerous voltage long enough to hurt someone touching it',
      'So the lights do not flicker',
    ],
    answer: 1,
    why: 'During a fault the metal case rises in voltage. Cutting the supply quickly limits how long anyone touching it is exposed.',
  },
];
