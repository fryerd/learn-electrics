import type { QuizQuestion } from './socket-lesson';

// Chapter 1: electricity basics. Original wording.

export const basics = {
  title: 'Volts, amps and ohms',
  intro:
    'Think of electricity as water in a pipe. Voltage is the pressure pushing it, resistance is how narrow the pipe is, and current is how much actually flows. Drag the sliders and watch all three change together.',
};

/** Typical appliances at the UK's nominal 230 V: resistance is V² ÷ P. */
export const presets: { id: string; label: string; volts: number; ohms: number }[] = [
  { id: 'lamp', label: '100 W lamp', volts: 230, ohms: 529 },
  { id: 'hairdryer', label: '2 kW hairdryer', volts: 230, ohms: 26 },
  { id: 'kettle', label: '3 kW kettle', volts: 230, ohms: 18 },
];

export const quiz: QuizQuestion[] = [
  {
    q: 'In the water-pipe picture, which one is the pressure?',
    options: ['Voltage', 'Current', 'Resistance'],
    answer: 0,
    why: 'Voltage is the push. Current is the flow it causes, and resistance is what holds the flow back.',
  },
  {
    q: 'A 3 kW kettle runs on 230 V. About how much current does it draw?',
    options: ['3 A', '13 A', '30 A'],
    answer: 1,
    why: '3000 W ÷ 230 V is about 13 A. That is why a kettle needs the full 13 A plug fuse.',
  },
  {
    q: 'The voltage stays the same and you double the resistance. What happens to the current?',
    options: ['It doubles', 'It stays the same', 'It halves'],
    answer: 2,
    why: 'Current is V ÷ R. Twice the resistance means half the current: a narrower pipe lets less through.',
  },
  {
    q: 'Which is the formula for power?',
    options: ['P = V × I', 'P = V ÷ I', 'P = I ÷ V'],
    answer: 0,
    why: 'Power in watts is volts times amps. It is the rate at which an appliance uses energy.',
  },
];
