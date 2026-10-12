export type TriviaCategory =
  | "kids"
  | "general"
  | "entertainment"
  | "science";
export type TriviaSelection = TriviaCategory | "mixed";

export type TriviaQuestion = {
  id: string;
  category: TriviaCategory;
  question: string;
  options: [string, string, string, string];
  answer: number;
  detail: string;
};

export const triviaQuestions: TriviaQuestion[] = [
  {
    id: "kids-1",
    category: "kids",
    question: "How many sides does a hexagon have?",
    options: ["Five", "Six", "Seven", "Eight"],
    answer: 1,
    detail: "A hexagon has six straight sides.",
  },
  {
    id: "kids-2",
    category: "kids",
    question: "Which animal is the tallest in the world?",
    options: ["Elephant", "Giraffe", "Camel", "Ostrich"],
    answer: 1,
    detail: "Adult giraffes can grow more than five metres tall.",
  },
  {
    id: "kids-3",
    category: "kids",
    question: "What do caterpillars turn into?",
    options: ["Beetles", "Butterflies", "Spiders", "Ladybirds"],
    answer: 1,
    detail: "A caterpillar becomes a butterfly or moth after its pupa stage.",
  },
  {
    id: "kids-4",
    category: "kids",
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Mercury"],
    answer: 1,
    detail: "Iron minerals in the soil give Mars its rusty red colour.",
  },
  {
    id: "kids-5",
    category: "kids",
    question: "What is a baby frog called?",
    options: ["Cub", "Calf", "Tadpole", "Chick"],
    answer: 2,
    detail: "Tadpoles live in water before growing legs and becoming frogs.",
  },
  {
    id: "kids-6",
    category: "kids",
    question: "How many colours are traditionally named in a rainbow?",
    options: ["Five", "Six", "Seven", "Nine"],
    answer: 2,
    detail: "They are red, orange, yellow, green, blue, indigo and violet.",
  },
  {
    id: "kids-7",
    category: "kids",
    question: "Which instrument has black and white keys?",
    options: ["Trumpet", "Violin", "Piano", "Drum"],
    answer: 2,
    detail: "A standard piano keyboard has 88 black and white keys.",
  },
  {
    id: "kids-8",
    category: "kids",
    question: "Which ocean animal has eight arms?",
    options: ["Dolphin", "Octopus", "Starfish", "Jellyfish"],
    answer: 1,
    detail: "An octopus has eight flexible arms lined with suckers.",
  },
  {
    id: "general-1",
    category: "general",
    question: "What is the capital city of Australia?",
    options: ["Sydney", "Melbourne", "Canberra", "Perth"],
    answer: 2,
    detail: "Canberra was chosen as the national capital in 1908.",
  },
  {
    id: "general-2",
    category: "general",
    question: "Which language has the most native speakers?",
    options: ["English", "Mandarin Chinese", "Spanish", "Hindi"],
    answer: 1,
    detail: "Mandarin Chinese has more native speakers than any other language.",
  },
  {
    id: "general-3",
    category: "general",
    question: "How many rings are on the Olympic flag?",
    options: ["Four", "Five", "Six", "Seven"],
    answer: 1,
    detail: "The Olympic symbol uses five interlocking rings.",
  },
  {
    id: "general-4",
    category: "general",
    question: "Which country gifted the Statue of Liberty to the United States?",
    options: ["France", "Italy", "Spain", "Canada"],
    answer: 0,
    detail: "France presented the statue as a gift in the 19th century.",
  },
  {
    id: "general-5",
    category: "general",
    question: "What is the smallest country in the world?",
    options: ["Monaco", "Malta", "Vatican City", "Liechtenstein"],
    answer: 2,
    detail: "Vatican City is the smallest independent state by area.",
  },
  {
    id: "general-6",
    category: "general",
    question: "In which sport would you perform a slam dunk?",
    options: ["Volleyball", "Basketball", "Tennis", "Baseball"],
    answer: 1,
    detail: "A slam dunk scores by putting the ball directly through the hoop.",
  },
  {
    id: "general-7",
    category: "general",
    question: "Which chess piece moves in an L shape?",
    options: ["Bishop", "Rook", "Knight", "Queen"],
    answer: 2,
    detail: "The knight moves two squares one way and one square sideways.",
  },
  {
    id: "general-8",
    category: "general",
    question: "What is the currency of Japan?",
    options: ["Won", "Yen", "Yuan", "Ringgit"],
    answer: 1,
    detail: "Japan's national currency is the yen.",
  },
  {
    id: "entertainment-1",
    category: "entertainment",
    question: "What is the name of Harry Potter's owl?",
    options: ["Crookshanks", "Hedwig", "Scabbers", "Errol"],
    answer: 1,
    detail: "Hedwig is Harry's snowy owl.",
  },
  {
    id: "entertainment-2",
    category: "entertainment",
    question: "Which toy cowboy appears in Toy Story?",
    options: ["Buzz", "Woody", "Rex", "Slinky"],
    answer: 1,
    detail: "Woody is Andy's pull-string cowboy doll.",
  },
  {
    id: "entertainment-3",
    category: "entertainment",
    question: "Which fictional city is Batman's home?",
    options: ["Metropolis", "Gotham City", "Star City", "Smallville"],
    answer: 1,
    detail: "Batman protects Gotham City.",
  },
  {
    id: "entertainment-4",
    category: "entertainment",
    question: "In Frozen, who is Elsa's sister?",
    options: ["Anna", "Ariel", "Moana", "Mirabel"],
    answer: 0,
    detail: "Anna is the younger princess of Arendelle.",
  },
  {
    id: "entertainment-5",
    category: "entertainment",
    question: "Which band recorded the song Yellow Submarine?",
    options: ["Queen", "ABBA", "The Beatles", "The Rolling Stones"],
    answer: 2,
    detail: "The Beatles released Yellow Submarine in 1966.",
  },
  {
    id: "entertainment-6",
    category: "entertainment",
    question: "What kind of animal is Paddington?",
    options: ["Rabbit", "Bear", "Dog", "Fox"],
    answer: 1,
    detail: "Paddington is a bear who arrives from Peru.",
  },
  {
    id: "entertainment-7",
    category: "entertainment",
    question: "Who lives in a pineapple under the sea?",
    options: ["Nemo", "SpongeBob", "Ariel", "Stitch"],
    answer: 1,
    detail: "SpongeBob SquarePants lives in the pineapple.",
  },
  {
    id: "entertainment-8",
    category: "entertainment",
    question: "Which superhero carries a shield with a star?",
    options: ["Thor", "Iron Man", "Captain America", "Hulk"],
    answer: 2,
    detail: "Captain America's circular shield has a star at its centre.",
  },
  {
    id: "science-1",
    category: "science",
    question: "What is the largest planet in our solar system?",
    options: ["Saturn", "Earth", "Jupiter", "Neptune"],
    answer: 2,
    detail: "Jupiter is more than twice as massive as all the other planets combined.",
  },
  {
    id: "science-2",
    category: "science",
    question: "Which gas do plants absorb from the air?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    answer: 1,
    detail: "Plants use carbon dioxide during photosynthesis.",
  },
  {
    id: "science-3",
    category: "science",
    question: "How many bones are in a typical adult human body?",
    options: ["106", "206", "306", "406"],
    answer: 1,
    detail: "Most adults have 206 bones.",
  },
  {
    id: "science-4",
    category: "science",
    question: "What force keeps us on the ground?",
    options: ["Magnetism", "Friction", "Gravity", "Electricity"],
    answer: 2,
    detail: "Gravity pulls objects with mass towards one another.",
  },
  {
    id: "science-5",
    category: "science",
    question: "What is H2O commonly called?",
    options: ["Salt", "Water", "Oxygen", "Hydrogen"],
    answer: 1,
    detail: "Each water molecule contains two hydrogen atoms and one oxygen atom.",
  },
  {
    id: "science-6",
    category: "science",
    question: "Which part of a plant usually carries out photosynthesis?",
    options: ["Roots", "Flowers", "Leaves", "Seeds"],
    answer: 2,
    detail: "Leaves contain chlorophyll, which captures light energy.",
  },
  {
    id: "science-7",
    category: "science",
    question: "What is the hardest natural substance?",
    options: ["Quartz", "Iron", "Diamond", "Granite"],
    answer: 2,
    detail: "Diamond ranks highest on the Mohs scale of mineral hardness.",
  },
  {
    id: "science-8",
    category: "science",
    question: "Which organ pumps blood around the body?",
    options: ["Lungs", "Heart", "Liver", "Kidneys"],
    answer: 1,
    detail: "The heart pumps blood through the circulatory system.",
  },
];

export function shuffleItems<T>(items: readonly T[], random = Math.random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function triviaPool(selection: TriviaSelection) {
  return selection === "mixed"
    ? triviaQuestions
    : triviaQuestions.filter((question) => question.category === selection);
}

export function buildTriviaRound(
  selection: TriviaSelection,
  length: number,
  random = Math.random,
) {
  const pool = triviaPool(selection);
  return shuffleItems(pool, random).slice(0, Math.min(length, pool.length));
}
