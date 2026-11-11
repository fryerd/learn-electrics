import type { QuizQuestion } from './socket-lesson';
import type { InfoId, SlipId, StepId } from './safety-law-isolation';

// Chapter 10: safety and the law. Original wording.

export const intro = {
  title: 'Safe isolation',
  text: 'Make the socket on circuit 4 safe to work on: click the things on the bench in the right order.',
};

/** The seven safe-isolation steps, revealed one by one as the learner gets them right. */
export const steps: Record<StepId, { name: string; why: string; action: string }> = {
  plan: {
    name: 'Identify the circuit and plan',
    why: 'The circuit chart says the socket is on circuit 4. Know what you will switch off before you touch anything.',
    action: 'Read the circuit chart',
  },
  isolate: {
    name: 'Switch off and isolate',
    why: 'Breaker 4 is off at the consumer unit.',
    action: 'Switch off a breaker',
  },
  lock: {
    name: 'Lock it off and label it',
    why: 'A lock stops anyone switching it back on, and the tag says why. The key stays in your pocket.',
    action: 'Fit the lock and tag',
  },
  prove1: {
    name: 'Prove the tester works',
    why: 'The voltage indicator lights up on the proving unit, so you know it can see a voltage.',
    action: 'Use the proving unit',
  },
  test: {
    name: 'Test that it is dead',
    why: 'Line to neutral, line to earth and neutral to earth all read 0 V.',
    action: 'Test the socket',
  },
  prove2: {
    name: 'Prove the tester again',
    why: 'It still works, so those 0 V readings were real and not a tester that died halfway.',
    action: 'Use the proving unit',
  },
  work: {
    name: 'Start work',
    why: 'Now, and only now, it is safe to start.',
    action: 'Start work',
  },
};

/** What happens when the learner gets the order wrong. `{n}` and `{name}` are the breaker clicked. */
export const slips: Record<SlipId, { title: string; text: string }> = {
  guess: {
    title: 'You guessed',
    text: 'You flicked off breaker {n} ({name}) without checking which circuit the socket is on. A guess is not a plan, and guessing wrong leaves the socket live. Read the circuit chart first.',
  },
  wrongBreaker: {
    title: 'Wrong breaker',
    text: 'Breaker {n} is {name}. The chart says the socket is on circuit 4, so it is still live.',
  },
  lockOn: {
    title: 'Locking it live',
    text: 'Breaker 4 is still on. Locking it now would lock the circuit ON. Switch it off first, then lock it off.',
  },
  proveEarly: {
    title: 'Too soon',
    text: 'Proving the tester is right, but do it just before you test: once the circuit is switched off and locked off.',
  },
  live: {
    title: 'It is live: 230 V',
    text: 'Good thing you tested. Nothing has been switched off yet. Find the circuit and isolate it first.',
  },
  colleague: {
    title: 'Someone switched it back on',
    text: 'A colleague saw a breaker off and switched it back on. The circuit is live again while you are about to work on it. Lock it off and label it, so only you can turn it back on.',
  },
  falseDead: {
    title: 'Dead, or a dud tester?',
    text: 'The tester shows nothing, so the socket looks dead. But you never proved the tester works. A flat battery or a broken lead shows nothing on a live circuit too. Prove it on the proving unit first.',
  },
  liveWork: {
    title: 'Stop: it is live',
    text: 'You were about to work on a live socket. Electric shock can kill. Isolate the circuit first.',
  },
  assume: {
    title: 'Never assume it is dead',
    text: 'It is off and locked, but you have not proved it is dead. Charts can be wrong and breakers can be mislabelled. Prove your tester, then test.',
  },
  noProve2: {
    title: 'Prove it again',
    text: 'Your tester could have failed during the test. Prove it once more on the proving unit, so you know the 0 V readings were real.',
  },
};

export const infos: Record<InfoId, string> = {
  chartAgain: 'Circuit 4: sockets downstairs. You have already checked.',
  alreadyOff: 'Breaker 4 is already off. Now make sure it stays off.',
  lockedAlready: 'Locked off and labelled. Leave it alone until the job is done.',
  provedAlready: 'Already proved. Now test the circuit.',
  testedAlready: 'Already done. Keep going.',
  otherBreaker: 'That is not part of this job. Leave it on.',
};

/* ------------------------------ is this job notifiable? ------------------------------ */

export type JobIcon = 'faceplate' | 'shower' | 'cu' | 'light' | 'shed' | 'switch' | 'spur' | 'bathroom';

export interface Job {
  id: string;
  icon: JobIcon;
  title: string;
  where: string;
  notifiable: boolean;
  why: string;
  /** Edge cases get a "check" note. */
  check?: boolean;
}

export const jobs: Job[] = [
  {
    id: 'faceplate',
    icon: 'faceplate',
    title: 'Replace a cracked socket faceplate',
    where: 'Living room, same type of socket',
    notifiable: false,
    why: 'Swapping an accessory like for like is replacement, not new work.',
  },
  {
    id: 'shower',
    icon: 'shower',
    title: 'Fit a new circuit for an electric shower',
    where: 'Bathroom, new cable from the consumer unit',
    notifiable: true,
    why: 'Any new circuit is notifiable, and a shower needs one of its own.',
  },
  {
    id: 'cu',
    icon: 'cu',
    title: 'Replace the consumer unit',
    where: 'Hallway cupboard',
    notifiable: true,
    why: 'Replacing a consumer unit is always notifiable: it affects every circuit in the home.',
  },
  {
    id: 'light',
    icon: 'light',
    title: 'Swap a ceiling light fitting',
    where: 'Bedroom, like for like on the same circuit',
    notifiable: false,
    why: 'Replacing a fitting like for like on an existing circuit is not notifiable.',
  },
  {
    id: 'shed',
    icon: 'shed',
    title: 'Run a new circuit to a garden shed',
    where: 'Garden, new cable from the house',
    notifiable: true,
    why: 'It is a new circuit, so it is notifiable, wherever it goes.',
  },
  {
    id: 'switch',
    icon: 'switch',
    title: 'Repair a broken light switch',
    where: 'Landing, replaced with the same kind',
    notifiable: false,
    why: 'Repairs and like-for-like replacements are maintenance, not notifiable work.',
  },
  {
    id: 'spur',
    icon: 'spur',
    title: 'Add a socket to an existing circuit',
    where: 'Bedroom, extending the sockets circuit',
    notifiable: false,
    why: 'In England, adding to an existing circuit is not normally notifiable. It must still meet BS 7671 and be tested, and the rules are different in Wales, so check Approved Document P or ask building control.',
    check: true,
  },
  {
    id: 'bathroom',
    icon: 'bathroom',
    title: 'Add a light to the bathroom lighting circuit',
    where: 'Room with a bath, existing circuit',
    notifiable: false,
    why: 'In England, adding a light to an existing bathroom circuit is not normally notifiable (only new circuits and consumer units are), but it must be done and tested to BS 7671. Wales has wider rules and the details change, so check Approved Document P or ask building control.',
    check: true,
  },
];

/* ------------------------------ law, standard, guidance ------------------------------ */

export type LayerId = 'law' | 'standard' | 'guidance';

export const layers: Record<
  LayerId,
  { name: string; tag: string; summary: string; docs: { title: string; note: string }[]; more: string }
> = {
  law: {
    name: 'Law',
    tag: 'You must',
    summary: 'Acts of Parliament and regulations. Breaking them is an offence.',
    docs: [
      {
        title: 'Electricity at Work Regulations 1989',
        note: 'Work dead wherever you can. Never assume a circuit is dead: confirm it is isolated before you start.',
      },
      {
        title: 'Building Regulations, Part P',
        note: 'England and Wales: electrical work in a home must be safe, and some jobs must be notified.',
      },
    ],
    more: 'The Electricity at Work Regulations apply to anyone working on electrical systems as part of their job. They say you must not work on or near live equipment unless it is unreasonable for it to be dead and suitable precautions are taken. The Building Regulations cover homes: Part P is electrical safety in England and Wales. Scotland and Northern Ireland have their own building rules.',
  },
  standard: {
    name: 'Standard',
    tag: 'How to comply',
    summary: 'The rulebook for how an installation should be designed, built and tested.',
    docs: [
      {
        title: 'BS 7671: the IET Wiring Regulations',
        note: 'The 18th Edition, BS 7671:2018+A4:2026. Compiled by the IET and published with BSI.',
      },
    ],
    more: 'BS 7671 is a British Standard, not an Act of Parliament. But following it is the usual way to show your work meets the law, and building control, certificates and courts all lean on it.',
  },
  guidance: {
    name: 'Guidance',
    tag: 'How to do it',
    summary: 'Practical books and leaflets that explain how to meet the standard and the law.',
    docs: [
      { title: 'IET On-Site Guide', note: 'A pocket version of BS 7671 for everyday installations.' },
      { title: 'IET Guidance Notes', note: 'A series that goes deeper, for example on inspection and testing.' },
      { title: 'HSE GS38', note: 'Guidance on test equipment: shrouded probes, finger guards, sound leads.' },
      { title: 'Approved Document P', note: 'Government guidance on how to meet Part P, including what is notifiable.' },
    ],
    more: 'Guidance is not law in itself, but if something goes wrong, having ignored it is hard to defend. The HSE also publishes guidance on safe isolation and safe working.',
  },
};

/** "Law, standard or guidance?" sorter. */
export const sortItems: { name: string; layer: LayerId; why: string }[] = [
  { name: 'Electricity at Work Regulations 1989', layer: 'law', why: 'Regulations made under an Act: this is law.' },
  { name: 'BS 7671 (18th Edition)', layer: 'standard', why: 'A British Standard. Following it is how you show you met the law.' },
  { name: 'HSE GS38', layer: 'guidance', why: 'HSE guidance on test leads and probes.' },
  { name: 'Building Regulations Part P', layer: 'law', why: 'Part of the Building Regulations, which are law.' },
  { name: 'IET On-Site Guide', layer: 'guidance', why: 'A practical guide to applying BS 7671.' },
  { name: 'Approved Document P', layer: 'guidance', why: 'Official guidance on how to meet Part P. Part P itself is the law.' },
];

export const goldenRules: { head: string; text: string }[] = [
  { head: 'Work dead', text: 'Live working is a last resort, never a shortcut.' },
  { head: 'Never assume', text: 'A switched-off breaker is not proof. Test it.' },
  { head: 'Lock it, label it', text: 'Keep the key on you so nobody can switch it back on.' },
  { head: 'Prove, test, prove', text: 'Tester on a known source, then the circuit, then the known source again.' },
  { head: 'Test every pair', text: 'Line–neutral, line–earth, neutral–earth.' },
  { head: 'Right kit', text: 'A two-pole voltage indicator with GS38-style probes. Not a neon screwdriver.' },
  { head: 'Know the paperwork', text: 'New circuits and consumer units are notifiable.' },
  { head: 'If in doubt, stop', text: 'Ask someone competent. Electric shock can kill.' },
];

export const quiz: QuizQuestion[] = [
  {
    q: 'Which of these is law, rather than a standard or guidance?',
    options: ['BS 7671', 'The Electricity at Work Regulations 1989', 'The IET On-Site Guide'],
    answer: 1,
    why: 'The Electricity at Work Regulations are law. BS 7671 is the standard you follow to show you met it, and the On-Site Guide is guidance.',
  },
  {
    q: 'You have switched the breaker off. What comes next?',
    options: ['Test the socket is dead', 'Lock it off and label it', 'Start work'],
    answer: 1,
    why: 'Secure the isolation first, so nobody can switch it back on while you prove and test.',
  },
  {
    q: 'Why prove the tester on a known source before AND after testing?',
    options: [
      'To charge its battery',
      'So you know a "dead" reading is real and not a faulty tester',
      'Because the law says to test twice',
    ],
    answer: 1,
    why: 'A tester with a flat battery or broken lead shows nothing on a live circuit. Proving it either side of the test shows it worked throughout.',
  },
  {
    q: 'When you test a circuit dead, which pairs do you test?',
    options: ['Line to neutral only', 'Line–neutral, line–earth and neutral–earth', 'Line to earth only'],
    answer: 1,
    why: 'All three pairs. A fault can leave voltage between any two conductors.',
  },
  {
    q: 'In England, which of these jobs must be notified to building control?',
    options: ['Swapping a light fitting like for like', 'Replacing the consumer unit', 'Repairing a broken switch'],
    answer: 1,
    why: 'A new consumer unit is notifiable. Like-for-like swaps and repairs are not.',
  },
];
