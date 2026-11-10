// Lesson 1: the 13 A socket outlet (UK, BS 1363).
// All wording here is original. Content lives in data so new lessons are
// "add a file", not "write an engine".

export type PartId =
  | 'faceplate'
  | 'screws'
  | 'line'
  | 'neutral'
  | 'earth'
  | 'sheath'
  | 'backbox'
  | 'knockout'
  | 'tail';

export interface PartInfo {
  id: PartId;
  n: number;
  title: string;
  short: string;
  points: string[];
  /** Optional "UK standards" call-out. */
  uk?: string;
}

export const lesson = {
  title: 'The socket outlet',
  number: 1,
  intro:
    'A 13 A socket pulled out of its back box and turned round, so you can see what is behind the faceplate. Drag to orbit, scroll to zoom, and tap a numbered marker.',
};

export const parts: PartInfo[] = [
  {
    id: 'faceplate',
    n: 1,
    title: 'Faceplate and socket body',
    short:
      'The faceplate is the part you see from the room. The moulded body behind it holds the three terminals.',
    points: [
      'Shown here from the rear. From the front, earth is at the top, line is bottom right and neutral is bottom left, so the view is mirrored.',
      'The terminals are marked L, N and E. Always check the markings rather than trusting colour alone.',
      'The slots in the front are shuttered, so nothing can touch line or neutral unless the longer earth pin of a plug opens them.',
    ],
    uk: 'UK sockets are 13 A outlets to BS 1363, designed to be used with fused BS 1363 plugs.',
  },
  {
    id: 'screws',
    n: 2,
    title: 'Fixing screws',
    short:
      'Two screws hold the faceplate to the lugs in the back box, one at the top and one at the bottom.',
    points: [
      'The fixing centres are standardised at 60.3 mm, so a single-gang plate fits a single-gang box.',
      'Tighten until the plate sits flat. Over-tightening can crack the plate or strip the lug.',
    ],
  },
  {
    id: 'line',
    n: 3,
    title: 'Line terminal (L)',
    short:
      'The line conductor carries current from the supply to whatever is plugged in. It is brown in current UK colours.',
    points: [
      'Brown replaced red as the line colour in the UK. You will still find red on older installations.',
      'Many people say "live", but the neutral is a live conductor too, so we say line.',
      'Strip only enough insulation so the bare copper sits fully in the clamp, with no copper showing outside.',
      'On a ring final circuit, two brown cores (one from each side of the ring) normally share this terminal.',
    ],
    uk: 'Harmonised UK core colours (brown, blue, green and yellow) were introduced in 2004.',
  },
  {
    id: 'neutral',
    n: 4,
    title: 'Neutral terminal (N)',
    short:
      'The neutral conductor completes the circuit back to the supply. It is blue in current UK colours.',
    points: [
      'It sits near earth potential in normal use, but it carries the full load current, so never assume it is safe to touch.',
      'Older installations used black for neutral. That is why identifying conductors properly matters when you find mixed colours.',
    ],
  },
  {
    id: 'earth',
    n: 5,
    title: 'Earth terminal (E)',
    short:
      'The earth conductor, called the circuit protective conductor (CPC), gives fault current a low-resistance path back to the source.',
    points: [
      'In twin and earth cable the CPC is bare copper. Wherever the sheath is stripped it must be covered with green and yellow sleeving.',
      'A fast, low-resistance path is what lets the protective device (MCB or RCD) disconnect quickly in a fault.',
      'Two conductors share this terminal here: the cable CPC and the earth tail from the metal back box.',
    ],
  },
  {
    id: 'sheath',
    n: 6,
    title: 'Cable sheath (twin and earth)',
    short:
      'The grey PVC outer sheath holds the line, neutral and bare earth conductors together and protects them.',
    points: [
      '2.5 mm² twin and earth is the usual cable for socket circuits.',
      'Strip back only as much sheath as you need, and keep the sheath inside the back box so no cores are left exposed.',
      'This drawing shows one cable for clarity. On a ring final circuit most sockets have two cables entering.',
    ],
  },
  {
    id: 'backbox',
    n: 7,
    title: 'Metal back box',
    short:
      'The back box is fixed to the wall (or sunk into it) and supports the faceplate and protects the connections.',
    points: [
      'A metal box is conductive, so it must be connected to earth. That is the job of the earth tail.',
      'Box depth (35 mm here) decides how much room you have for stiff conductors. Deeper boxes make life easier.',
      'Plastic boxes do not need an earth tail.',
    ],
  },
  {
    id: 'knockout',
    n: 8,
    title: 'Knockouts and grommet',
    short:
      'Knockouts are pre-weakened discs in the box that you remove to let a cable in. The grommet protects the cable at the hole.',
    points: [
      'Remove only the knockouts you need. Unused ones keep the box closed up.',
      'A metal edge can cut into cable sheathing over time, so a grommet (rubber or plastic ring) goes in the hole.',
    ],
  },
  {
    id: 'tail',
    n: 9,
    title: 'Earth tail to the back box',
    short:
      'A short green and yellow conductor links the earth screw in the metal box to the socket earth terminal.',
    points: [
      'Without it, a fault that touched the box could leave the box live with no path for fault current.',
      'It is sized to suit the circuit protective conductor, and it shares the earth terminal with the cable CPC.',
    ],
  },
];

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export const quiz: QuizQuestion[] = [
  {
    q: 'In current UK colours, which conductor connects to the L terminal?',
    options: ['Blue', 'Brown', 'Green and yellow'],
    answer: 1,
    why: 'Line is brown. Blue is neutral and green and yellow is earth. Older installations may use red for line.',
  },
  {
    q: 'What must cover the bare earth conductor of twin and earth cable where the sheath is stripped?',
    options: [
      'Brown sleeving',
      'Nothing, bare copper is fine',
      'Green and yellow sleeving',
    ],
    answer: 2,
    why: 'The CPC is sleeved green and yellow wherever it is exposed, so it is clearly identified as earth.',
  },
  {
    q: 'Looking at the front of a UK socket, where is the earth terminal?',
    options: ['Top', 'Bottom left', 'Bottom right'],
    answer: 0,
    why: 'Earth is at the top, line is bottom right and neutral is bottom left. From behind the plate it looks mirrored.',
  },
  {
    q: 'Why does a metal back box need an earth tail?',
    options: [
      'To make the faceplate fit flat',
      'So a fault touching the box has a safe path to earth',
      'To hold the cable in place',
    ],
    answer: 1,
    why: 'A conductive box has to be connected to earth, otherwise a fault could make it live with no path for fault current.',
  },
];
