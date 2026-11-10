import type { QuizQuestion } from '../data/socket-lesson';

/** A short multiple-choice quiz that fills `root`. Used by every chapter. */
export function mountQuiz(
  root: HTMLElement,
  questions: QuizQuestion[],
  opts: { retryHint?: string; onFinish?: (score: number, total: number) => void } = {},
) {
  let qi = 0;
  let score = 0;
  const hint = opts.retryHint ?? 'Have another look around, then try again.';

  const render = () => {
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'quiz';
    root.append(wrap);

    if (qi >= questions.length) {
      wrap.innerHTML = `
        <div class="quiz-progress">Finished</div>
        <p class="score">${score} / ${questions.length}</p>
        <p>${score === questions.length ? 'Full marks. Nicely done.' : hint}</p>
        <button class="primary" type="button" data-quiz="restart">Try again</button>`;
      wrap.querySelector('[data-quiz="restart"]')!.addEventListener('click', () => {
        qi = 0;
        score = 0;
        render();
      });
      opts.onFinish?.(score, questions.length);
      return;
    }

    const q = questions[qi];
    wrap.innerHTML = `
      <div class="quiz-progress">Question ${qi + 1} of ${questions.length}</div>
      <h2>${q.q}</h2>
      <div class="options"></div>
      <div class="feedback" aria-live="polite"></div>`;
    const opt = wrap.querySelector('.options')!;
    const fb = wrap.querySelector('.feedback')!;
    const btns = q.options.map((text, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.addEventListener('click', () => {
        const right = i === q.answer;
        if (right) score++;
        btns.forEach((x, j) => {
          x.disabled = true;
          if (j === q.answer) x.classList.add('right');
          else if (j === i) x.classList.add('wrong');
        });
        fb.innerHTML = `<div class="why"><b>${right ? 'Correct.' : 'Not quite.'}</b> ${q.why}</div>
          <button class="primary" type="button" data-quiz="next">${qi + 1 < questions.length ? 'Next' : 'See score'}</button>`;
        const next = fb.querySelector<HTMLButtonElement>('[data-quiz="next"]')!;
        next.addEventListener('click', () => {
          qi++;
          render();
        });
        next.focus();
      });
      opt.append(b);
      return b;
    });
  };
  render();
}
