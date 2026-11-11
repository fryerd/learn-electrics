import type { QuizQuestion } from './socket-lesson';
import type { LevelId, SwitchSpec } from '../chapters/lighting-sim';

// Chapter 8: lighting and switches. Original wording.

export const intro = {
  title: 'Gangs, poles and ways',
  text: 'Build a switch from <b>gangs</b>, <b>poles</b> and <b>ways</b>, and watch the contacts inside.',
};

export interface ExplorerTarget {
  id: string;
  label: string;
  spec: SwitchSpec;
}

/** "Try" goals for the switch builder. Ticked as soon as the learner makes one. */
export const targets: ExplorerTarget[] = [
  { id: 'two-way', label: 'A switch for the bottom of the stairs (one of a pair)', spec: { gangs: 1, poles: 1, ways: 2 } },
  { id: 'dp', label: 'A switch that cuts off a cooker completely', spec: { gangs: 1, poles: 2, ways: 1 } },
  { id: 'fan', label: 'An isolator for a bathroom fan with an overrun timer', spec: { gangs: 1, poles: 3, ways: 1 } },
  { id: 'int', label: 'The middle switch of three on a long landing', spec: { gangs: 1, poles: 2, ways: 'int' } },
  { id: 'hall', label: 'Hall and landing lights, both two-way, on one plate', spec: { gangs: 2, poles: 1, ways: 2 } },
];

export interface LevelCopy {
  tab: string;
  title: string;
  goal: string;
  hints: string[];
  solved: string;
}

export const levels: Record<LevelId, LevelCopy> = {
  'one-way': {
    tab: 'One-way',
    title: 'One light, one switch',
    goal: 'Wire the supply into the 3-plate ceiling rose, hang the lamp from it, and run a switch drop down to the switch. Click a terminal, then another, to run a core (or drag between them). Click a wire to remove it.',
    hints: [
      'Start at the supply: line to the rose’s L bank, neutral to N, earth to E. That is the “loop in”.',
      'The lamp flex: the lamp’s N goes to the rose’s N bank. The lamp’s L goes to the SW bank, the switched side.',
      'The switch drop: the rose’s L bank feeds the switch’s COM. The switch’s L1 sends the switched line back to SW. Do not forget the earth to the switch.',
    ],
    solved: 'Lovely. The brown core takes permanent line down to the switch; the blue one brings it back switched, so it wears brown sleeves.',
  },
  'two-way': {
    tab: 'Two-way',
    title: 'One light, two switches',
    goal: 'The rose and lamp are in. Now make the light work from both ends of the stairs: either switch must turn it on or off, whatever the other one is doing.',
    hints: [
      'Line goes from the rose’s L bank to COM on switch 1. The switched line comes back to SW from COM on switch 2.',
      'Join the two switches with two strappers: L1 to L1 and L2 to L2.',
      'Earth: rose to switch 1, then switch 1 to switch 2.',
    ],
    solved: 'That is two-way switching. Each switch picks which strapper carries the line, and the lamp only lights when both pick the same one.',
  },
  intermediate: {
    tab: 'Intermediate',
    title: 'One light, three switches',
    goal: 'Put an intermediate switch in the middle of the two strappers so any of the three switches works the light.',
    hints: [
      'Start as two-way: rose L to COM on switch 1, COM on switch 3 back to the rose’s SW.',
      'Switch 1’s strappers go into one side of the intermediate (L1 and L2 on the left).',
      'The other side of the intermediate carries the strappers on to L1 and L2 of switch 3. Earth all three.',
    ],
    solved: 'Three-way control. The intermediate either passes the strappers straight through or swaps them over, and you can add as many as you like in a row.',
  },
};

export const coreNotes: Record<string, string> = {
  brown: '<b>Brown core.</b> Line. On a switch drop it is the switch feed: permanent line going down to the switch.',
  blue: '<b>Blue core.</b> Neutral. It goes back to the neutral bank, never through a switch.',
  earth: '<b>Green-and-yellow.</b> The CPC (earth). In twin-and-earth it is bare, so it gets green-and-yellow sleeving wherever it is exposed.',
  'blue-sleeved':
    '<b>Blue core, sleeved brown.</b> This is the switch return. It carries switched line, not neutral, so it is marked with brown sleeving at both ends.',
  grey: '<b>Grey core (3-core cable).</b> A strapper between switches. Strappers use the colours of the 3-core cable they run in.',
  black: '<b>Black core (3-core cable).</b> The other strapper. Black and grey are both used as line colours, so they stay as they are.',
};

export const reveals = {
  neutral: {
    title: 'Why smart switches want a neutral',
    body: `<p>An ordinary switch drop has only two cores: line down, switched line back. A plain switch needs nothing else, because it is just a gap that opens and closes.</p>
      <p>A smart or dimmer switch has electronics inside, and electronics need a complete circuit to stay powered, even when the light is off. With no neutral at the switch, the only way back is through the lamp itself, so a “no-neutral” smart switch leaks a tiny current through it. LED lamps can glow faintly or flicker as a result.</p>
      <p>Run a neutral to the switch (for example a 3-core-and-earth drop) and the smart switch powers itself properly. With an ordinary switch, that neutral is simply terminated in a connector in the box, ready for later. Whichever core carries it is identified blue at both ends.</p>`,
  },
  testing: {
    title: 'Testing a lighting circuit',
    body: `<p><b>Polarity.</b> With the circuit dead, a continuity test proves every switch is in the line conductor, and that the centre contact of any screw (ES) lampholder is on line. That is exactly the fault the simulator calls “switch in the neutral”.</p>
      <p><b>Insulation resistance.</b> Lamps are removed (or the test is arranged so they are not damaged), the switches are put on so the switch returns are included, and two-way switches are tried in both positions so both strappers get tested. The minimum is 1.0 MΩ at 500 V DC.</p>`,
  },
  loopIn: {
    title: 'Loop-in and the 3-plate rose',
    body: `<p>A lighting circuit is a radial: one cable from the consumer unit (typically on a 6 A breaker) runs to the first ceiling rose, then loops out to the next, and so on. Each rose also has a switch drop to its switch. This is the loop-in method.</p>
      <p>Inside, a 3-plate rose has three banks of terminals: the middle bank for permanent line (in, out and the switch feed), one for neutral (in, out and the lamp flex), and one for the switch return and the lamp flex’s brown core. The CPCs go on the earth terminal.</p>`,
  },
};

export const quiz: QuizQuestion[] = [
  {
    q: 'What does “2-gang” mean on a light switch?',
    options: ['Two switches on one faceplate', 'Two arms switched together', 'Two positions per arm'],
    answer: 0,
    why: 'Gangs count the switches on the plate. Poles count the arms that move together, and ways count the positions each arm can connect to.',
  },
  {
    q: 'Why must a light switch be in the line conductor, not the neutral?',
    options: ['A switch in the neutral would not turn the lamp off', 'So the lampholder is dead when the switch is off', 'Neutral cores are too thin to switch'],
    answer: 1,
    why: 'A switch in the neutral still turns the lamp off, but the lampholder stays connected to line. Change the bulb and you could get a shock.',
  },
  {
    q: 'On a loop-in switch drop, why is the blue core sleeved brown?',
    options: ['It is the earth', 'It carries the switched line back to the rose', 'It is the neutral for a smart switch'],
    answer: 1,
    why: 'In the switch drop the blue core is the switch return: it carries line, switched. Brown sleeving at both ends tells the next person.',
  },
  {
    q: 'A landing light is controlled from three places. What is the middle switch?',
    options: ['A two-way switch', 'A double-pole switch', 'An intermediate switch'],
    answer: 2,
    why: 'Two two-way switches go at the ends, and an intermediate goes between them on the strappers. Add more intermediates for more switches.',
  },
  {
    q: 'What does a double-pole switch, like a cooker switch, do?',
    options: ['Switches line and neutral at the same time', 'Switches two lights from one place', 'Switches one light from two places'],
    answer: 0,
    why: 'Two poles means two arms moving together, here breaking both line and neutral so the appliance is fully disconnected.',
  },
];

/** The quiz score needed (out of 5) to count as passed: 4 / 5 = 80%, so at least 75%. */
export const QUIZ_PASS = 4;
