// The contract every chapter follows. A chapter is a module `src/chapters/<id>.ts` that exports
// `mount`. The shell creates the stage and panel panes, calls mount once (the first time the chapter
// is opened), then calls activate()/deactivate() as the learner moves between chapters.

export interface ChapterContext {
  /** The big area on the left. A `.stage-pane` (position: absolute; inset: 0). Fill it with SVG / canvas / DOM. */
  stage: HTMLElement;
  /** The side panel on the right. A `.panel-pane` (flex column). Put tabs and sections in it. */
  panel: HTMLElement;
  /** Call when the learner has finished the chapter (ticks it off on the strip). Safe to call repeatedly. */
  complete: () => void;
}

export interface ChapterInstance {
  /** The chapter is now visible: start animation loops. */
  activate(): void;
  /** The chapter is now hidden: stop animation loops and timers. */
  deactivate(): void;
}

export type ChapterMount = (ctx: ChapterContext) => ChapterInstance;
