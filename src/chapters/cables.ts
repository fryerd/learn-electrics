import { chapterById } from '../data/chapters';
import { renderSoon } from './soon';
import type { ChapterMount } from './types';

// Placeholder: replaced when this chapter is built.
export const mount: ChapterMount = (ctx) => {
  renderSoon(ctx, chapterById('cables')!);
  return { activate() {}, deactivate() {} };
};
