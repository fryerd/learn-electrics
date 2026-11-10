import type { ChapterMount } from './types';

type Loader = () => Promise<{ mount: ChapterMount }>;

// One entry per chapter id (see src/data/chapters.ts). Each chapter is its own lazily-loaded chunk.
export const loaders: Record<string, Loader> = {
  basics: () => import('./basics'),
  network: () => import('./network'),
  earthing: () => import('./earthing'),
  'consumer-unit': () => import('./consumer-unit'),
  cables: () => import('./cables'),
  'fault-loop': () => import('./fault-loop'),
  sockets: () => import('./socket').then((m) => ({ mount: (ctx) => m.mountSocket(ctx.complete) })),
  lighting: () => import('./lighting'),
  'special-locations': () => import('./special-locations'),
  'safety-law': () => import('./safety-law'),
  certification: () => import('./certification'),
};
