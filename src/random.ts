export function randomInt(min: number, max: number): number {
  const low = Math.ceil(Math.min(min, max)),
    high = Math.floor(Math.max(min, max));
  if (
    !Number.isSafeInteger(low) ||
    !Number.isSafeInteger(high) ||
    high < low ||
    high - low > 1000000
  )
    throw new Error("Choose a valid range of up to 1,000,001 whole numbers.");
  const range = high - low + 1,
    limit = Math.floor(4294967296 / range) * range;
  let value: number;
  do {
    value = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (value >= limit);
  return low + (value % range);
}
export function pick<T>(items: T[]): T {
  if (!items.length) throw new Error("No items available.");
  return items[randomInt(0, items.length - 1)];
}
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export const letters = (easy: boolean) =>
  (easy ? "ABCDEFGHIJKLMNOPRSTUVWY" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ").split("");
export type Card = { rank: number; suit: string };
export const newDeck = (): Card[] =>
  shuffle(
    ["♠", "♥", "♦", "♣"].flatMap((suit) =>
      Array.from({ length: 13 }, (_, i) => ({ rank: i + 1, suit })),
    ),
  );
export const cardLabel = (card: Card) =>
  `${["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"][card.rank]}${card.suit}`;
export function nextUnused<T>(items: T[], used: T[]): T {
  return pick(
    items.filter((item) => !used.includes(item)).length
      ? items.filter((item) => !used.includes(item))
      : items,
  );
}
