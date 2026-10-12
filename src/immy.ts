export const timesTables = Array.from({ length: 11 }, (_, index) => index + 2);

export type TimesQuestion = {
  table: number;
  multiplier: number;
  answer: number;
};

export function makeTimesQuestion(
  selected: number[],
  previous?: TimesQuestion,
  random: () => number = Math.random,
): TimesQuestion {
  if (!selected.length) throw new Error("Select at least one times table.");

  let question: TimesQuestion;
  let attempts = 0;
  do {
    const table = selected[Math.floor(random() * selected.length)];
    const multiplier = Math.floor(random() * 12) + 1;
    question = { table, multiplier, answer: table * multiplier };
    attempts += 1;
  } while (
    attempts < 8 &&
    previous?.table === question.table &&
    previous.multiplier === question.multiplier
  );

  return question;
}

export function pointsForAnswer(streak: number) {
  return 10 + Math.min(streak, 5) * 2;
}
