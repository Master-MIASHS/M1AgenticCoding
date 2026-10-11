import { QUESTION_BANK } from './questions.js';

export function draw(core, context = {}) {
  if (context.session !== undefined) return null;
  if (typeof core?.melanger !== 'function') {
    throw new TypeError('quiz: core.melanger must be a function');
  }
  const bank = QUESTION_BANK.map((question) => ({
    ...question,
    options: [...question.options],
  }));
  return core.melanger(bank);
}
