import { pick, shuffle } from "./random";
import { eliPacks, expansionPictures, type EliPackId } from "./eli-packs";
export { eliPacks, type EliPackId } from "./eli-packs";
export const eliPalettes = [
  { id: "sage", label: "Sage", color: "#b4c6b3" },
  { id: "sand", label: "Sand", color: "#d8bf96" },
  { id: "rose", label: "Rose", color: "#d7acaf" },
  { id: "sky", label: "Sky", color: "#a8c0d4" },
] as const;
export type EliPalette = (typeof eliPalettes)[number]["id"];
export const eliChoiceCounts = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type EliChoiceCount = (typeof eliChoiceCounts)[number];

export const pictureCategories = [
  "Animals",
  "Food",
  "Things",
  "Shapes",
  "Nature",
  "Letters",
  "Numbers",
  "Colours",
  "My pictures",
] as const;
export type PictureCategory = (typeof pictureCategories)[number];
export type Picture = {
  id: string;
  label: string;
  category: PictureCategory;
  color: string;
  image?: string;
  asset?: string;
  kind?: "letter" | "number" | "colour";
  symbol?: string;
};
export type EliLibrary = {
  key: "main";
  pictures: Picture[];
  hidden: string[];
  choices: EliChoiceCount;
  showWords: boolean;
  palette?: EliPalette;
  enabledPacks?: EliPackId[];
};
export const starterPictures: Picture[] = [
  { id: "cat", label: "Cat", category: "Animals", color: "#d99847" },
  { id: "dog", label: "Dog", category: "Animals", color: "#ad784c" },
  { id: "bird", label: "Bird", category: "Animals", color: "#4197c4" },
  { id: "fish", label: "Fish", category: "Animals", color: "#e78f49" },
  { id: "rabbit", label: "Rabbit", category: "Animals", color: "#b481aa" },
  { id: "turtle", label: "Turtle", category: "Animals", color: "#559968" },
  { id: "apple", label: "Apple", category: "Food", color: "#d96362" },
  { id: "banana", label: "Banana", category: "Food", color: "#c59c26" },
  { id: "cherry", label: "Cherries", category: "Food", color: "#bf5679" },
  { id: "carrot", label: "Carrot", category: "Food", color: "#da873c" },
  { id: "cookie", label: "Biscuit", category: "Food", color: "#b48c5e" },
  { id: "pizza", label: "Pizza", category: "Food", color: "#cf9242" },
  { id: "house", label: "House", category: "Things", color: "#c97c74" },
  { id: "car", label: "Car", category: "Things", color: "#538fc6" },
  { id: "bus", label: "Bus", category: "Things", color: "#c79734" },
  { id: "bike", label: "Bicycle", category: "Things", color: "#609881" },
  { id: "bed", label: "Bed", category: "Things", color: "#9f87c9" },
  { id: "cup", label: "Cup", category: "Things", color: "#bd78a4" },
  { id: "circle", label: "Circle", category: "Shapes", color: "#bd6e5b" },
  { id: "square", label: "Square", category: "Shapes", color: "#6788a5" },
  { id: "triangle", label: "Triangle", category: "Shapes", color: "#bb923a" },
  { id: "star", label: "Star", category: "Shapes", color: "#b79036" },
  { id: "heart", label: "Heart", category: "Shapes", color: "#b76f83" },
  { id: "diamond", label: "Diamond", category: "Shapes", color: "#78875b" },
  { id: "sun", label: "Sun", category: "Nature", color: "#c49c2e" },
  { id: "moon", label: "Moon", category: "Nature", color: "#9c85be" },
  { id: "cloud", label: "Cloud", category: "Nature", color: "#699abc" },
  { id: "tree", label: "Tree", category: "Nature", color: "#559967" },
  { id: "flower", label: "Flower", category: "Nature", color: "#c878a2" },
  { id: "snowflake", label: "Snowflake", category: "Nature", color: "#689dbf" },
].map((p) => ({
  ...p,
  ...(p.category !== "Shapes" ? { asset: `/eli-art/${p.id}.webp` } : {}),
})) as Picture[];
export const bundledPictures = [...starterPictures, ...expansionPictures];
export function packPictures(packId: string): Picture[] {
  const pack = eliPacks.find((p) => p.id === packId);
  return pack
    ? pack.ids.map((id) => bundledPictures.find((p) => p.id === id)!)
    : [];
}
export function setEliPack(
  library: EliLibrary,
  packId: EliPackId,
  enabled: boolean,
) {
  const current = library.enabledPacks ?? [];
  library.enabledPacks = enabled
    ? [...new Set([...current, packId])]
    : current.filter((id) => id !== packId);
}
export function newEliLibrary(): EliLibrary {
  return {
    key: "main",
    pictures: [],
    hidden: [],
    choices: 2,
    showWords: false,
    palette: "sage",
    enabledPacks: [],
  };
}
export function allPictures(library: EliLibrary) {
  const ids = new Set([
    ...starterPictures.map((p) => p.id),
    ...eliPacks
      .filter((p) => library.enabledPacks?.includes(p.id))
      .flatMap((p) => [...p.ids]),
  ]);
  // Personal pictures take precedence when an expansion introduces the same word.
  const personalWords = new Set(
    library.pictures.map((p) => p.label.toLowerCase()),
  );
  return [
    ...bundledPictures.filter(
      (p) => ids.has(p.id) && !personalWords.has(p.label.toLowerCase()),
    ),
    ...library.pictures,
  ];
}
export function practicePictures(
  library: EliLibrary,
  category = "All pictures",
  pack = "all",
) {
  const words =
    pack === "starter"
      ? new Set(starterPictures.map((p) => p.label.toLowerCase()))
      : pack === "all"
        ? null
        : new Set(packPictures(pack).map((p) => p.label.toLowerCase()));
  return allPictures(library).filter(
    (p) =>
      (!words || words.has(p.label.toLowerCase())) &&
      (category === "All pictures" || p.category === category),
  );
}
export function recognitionWord(picture: Picture) {
  if (picture.kind === "letter") return `letter ${picture.symbol}`;
  return picture.label.toLowerCase();
}
export function playablePictures(
  library: EliLibrary,
  category: string = "All pictures",
  pack: string = "all",
) {
  return practicePictures(library, category, pack).filter(
    (p) => !library.hidden.includes(p.id),
  );
}
export function recognitionQuestion(
  pool: Picture[],
  choices: number,
  previous?: string,
) {
  if (!eliChoiceCounts.includes(choices as EliChoiceCount))
    throw new Error("Choose between 2 and 10 tiles for Find it.");
  if (pool.length < 2)
    throw new Error("Choose at least two pictures for Find it.");
  const target = pick(pool.filter((p) => p.id !== previous));
  const others = shuffle(pool.filter((p) => p.id !== target.id)).slice(
    0,
    Math.min(choices, pool.length) - 1,
  );
  return { target, options: shuffle([target, ...others]) };
}
export type MatchingCard = {
  key: string;
  picture: Picture;
};
export function matchingCards(pool: Picture[], pairs = 3): MatchingCard[] {
  if (pool.length < 2)
    throw new Error("Choose at least two pictures for Match Pair.");
  const selected = shuffle(pool).slice(0, Math.min(pairs, pool.length));
  return shuffle(
    selected.flatMap((picture) => [
      { key: `${picture.id}-a`, picture },
      { key: `${picture.id}-b`, picture },
    ]),
  );
}
export function yesNoQuestion(
  pool: Picture[],
  previous?: string,
  random = Math.random,
) {
  if (pool.length < 2)
    throw new Error("Choose at least two pictures for Yes or No.");
  const available = pool.filter((picture) => picture.id !== previous);
  const target = pick(available.length ? available : pool);
  const answer = random() < 0.5;
  const named = answer
    ? target
    : pick(pool.filter((picture) => picture.id !== target.id));
  return { target, word: recognitionWord(named), answer };
}
export function colourQuestion(previous?: string) {
  return recognitionQuestion(packPictures("colours"), 3, previous);
}
export function validateEliBackup(value: unknown): EliLibrary {
  const root = value as {
    format?: string;
    version?: number;
    library?: EliLibrary;
  };
  const l = root?.library;
  if (
    root?.format !== "gamehub-eli" ||
    root.version !== 1 ||
    !l ||
    l.key !== "main" ||
    !Array.isArray(l.pictures) ||
    l.pictures.length > 100 ||
    !Array.isArray(l.hidden) ||
    l.hidden.length > bundledPictures.length + 100 ||
    !eliChoiceCounts.includes(l.choices) ||
    typeof l.showWords !== "boolean" ||
    (l.palette !== undefined && !eliPalettes.some((p) => p.id === l.palette)) ||
    (l.enabledPacks !== undefined &&
      (!Array.isArray(l.enabledPacks) ||
        l.enabledPacks.length > eliPacks.length ||
        new Set(l.enabledPacks).size !== l.enabledPacks.length ||
        l.enabledPacks.some((id) => !eliPacks.some((p) => p.id === id))))
  )
    throw new Error("This is not a valid Eli Zone backup.");
  const safePictures = l.pictures.map((p) => {
    if (
      !p ||
      typeof p.id !== "string" ||
      !/^custom:[a-zA-Z0-9-]{1,80}$/.test(p.id) ||
      typeof p.label !== "string" ||
      !p.label.trim() ||
      p.label.length > 40 ||
      !pictureCategories.includes(p.category) ||
      typeof p.image !== "string" ||
      p.image.length > 500000 ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(p.image)
    )
      throw new Error("The backup contains an invalid picture.");
    return {
      id: p.id,
      label: p.label.trim(),
      category: p.category,
      image: p.image,
      color: "#8b78b4",
    };
  });
  const ids = new Set([...bundledPictures, ...safePictures].map((p) => p.id));
  if (
    new Set(safePictures.map((p) => p.id)).size !== safePictures.length ||
    l.hidden.some((id) => typeof id !== "string" || !ids.has(id)) ||
    new Set(l.hidden).size !== l.hidden.length
  )
    throw new Error("The backup contains invalid or duplicate pictures.");
  return {
    key: "main",
    pictures: safePictures,
    hidden: [...l.hidden],
    choices: l.choices,
    showWords: l.showWords,
    palette: l.palette ?? "sage",
    enabledPacks: [...(l.enabledPacks ?? [])],
  };
}
