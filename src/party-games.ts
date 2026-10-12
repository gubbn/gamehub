export type WouldYouRatherAudience = "kids" | "adults";

export type RpsChoice = "rock" | "paper" | "scissors";
export type RpsResult = "win" | "lose" | "draw";

export const rpsChoices: RpsChoice[] = ["rock", "paper", "scissors"];

export function pickRpsChoice(random: () => number = Math.random): RpsChoice {
  return rpsChoices[Math.floor(random() * rpsChoices.length)];
}

export function resolveRps(player: RpsChoice, computer: RpsChoice): RpsResult {
  if (player === computer) return "draw";
  if (
    (player === "rock" && computer === "scissors") ||
    (player === "paper" && computer === "rock") ||
    (player === "scissors" && computer === "paper")
  ) {
    return "win";
  }
  return "lose";
}

export type WouldYouRatherQuestion = {
  left: string;
  right: string;
};

export const wouldYouRatherQuestions: Record<
  WouldYouRatherAudience,
  WouldYouRatherQuestion[]
> = {
  kids: [
    { left: "Have a pet dragon", right: "Have a pet unicorn" },
    { left: "Fly like a bird", right: "Breathe underwater" },
    { left: "Live in a treehouse", right: "Live in a castle" },
    { left: "Be super strong", right: "Be super fast" },
    { left: "Eat only pizza for a week", right: "Eat only pancakes for a week" },
    { left: "Talk to animals", right: "Speak every language" },
    { left: "Explore outer space", right: "Explore the deep sea" },
    { left: "Have a robot helper", right: "Have a magic wand" },
    { left: "Be the funniest person", right: "Be the cleverest person" },
    { left: "Have a slide instead of stairs", right: "Have a trampoline floor" },
    { left: "Always have to sing", right: "Always have to dance" },
    { left: "Meet a dinosaur", right: "Meet an alien" },
    { left: "Control the weather", right: "Pause time" },
    { left: "Shrink to ant size", right: "Grow as tall as a house" },
    { left: "Have spaghetti for hair", right: "Have popcorn for teeth" },
    { left: "Be invisible for a day", right: "Read minds for a day" },
    { left: "Go to school on the moon", right: "Go to school on a pirate ship" },
    { left: "Win every board game", right: "Win every sports game" },
    { left: "Have a room full of LEGO", right: "Have your own soft-play centre" },
    { left: "Never do homework again", right: "Never tidy your room again" },
    { left: "Only whisper", right: "Only shout" },
    { left: "Wear flippers all day", right: "Wear boxing gloves all day" },
    { left: "Have Christmas twice a year", right: "Have your birthday twice a year" },
    { left: "Ride a giant hamster", right: "Ride a tiny elephant" },
    { left: "Eat breakfast for every meal", right: "Eat dinner for every meal" },
    { left: "Wear shoes on your hands", right: "Wear hats on your feet" },
    { left: "Follow a rainbow road", right: "Sail down a chocolate river" },
    { left: "Have endless stickers", right: "Have endless crayons" },
    { left: "Sneeze bubbles", right: "Hiccup music" },
    { left: "Sleep overnight at a zoo", right: "Sleep overnight at an aquarium" },
    { left: "Have a snow day", right: "Have a water-park day" },
    { left: "Own a rocket", right: "Own a submarine" },
    { left: "Ride a tiny horse", right: "Ride a giant rabbit" },
    { left: "Have a spaceship bedroom", right: "Have a jungle bedroom" },
    { left: "Invent a new ice-cream flavour", right: "Invent a new pizza topping" },
    { left: "Draw anything perfectly", right: "Play any instrument perfectly" },
    { left: "Jump between clouds", right: "Run along walls" },
    { left: "Meet a friendly ghost", right: "Own a talking teddy" },
    { left: "Never have a bedtime", right: "Never have to eat vegetables" },
    { left: "Visit one week in the future", right: "Visit one week in the past" },
    { left: "Find a treasure map", right: "Find a secret doorway" },
    { left: "Have a monkey tail", right: "Have butterfly wings" },
    { left: "Make it rain marshmallows", right: "Make it snow confetti" },
    { left: "Invent a board game", right: "Design a new toy" },
    { left: "Live inside a storybook", right: "Live inside a video game" },
    { left: "Laugh like a bell", right: "Sneeze like a horn" },
    { left: "Grow tiny dinosaurs", right: "Build miniature cities" },
    { left: "Bounce on the moon", right: "Slide down a cloud" },
    { left: "Be an amazing baker", right: "Be an amazing magician" },
    { left: "Ride a golden bicycle", right: "Ride a flying skateboard" },
    { left: "Make toys come alive", right: "Make food talk" },
    { left: "Ride the fastest rollercoaster", right: "Ride the tallest waterslide" },
    { left: "Build a den indoors", right: "Sleep under the stars" },
    { left: "Know every animal’s name", right: "Know what every baby is thinking" },
    { left: "Swap places with your teacher", right: "Swap places with your favourite hero" },
    { left: "Wear fancy dress every day", right: "Wear pyjamas every day" },
    { left: "Only eat sweet snacks", right: "Only eat savoury snacks" },
    { left: "Have summer all year", right: "Have winter all year" },
    { left: "Build the world’s biggest sandcastle", right: "Build the world’s biggest igloo" },
    { left: "Find treasure made of sweets", right: "Find treasure made of toys" },
  ],
  adults: [
    { left: "Give up coffee", right: "Give up your phone" },
    { left: "Host every party", right: "Never host again" },
    { left: "Know your future", right: "Change one thing in your past" },
    { left: "Always be 30 minutes early", right: "Always be 10 minutes late" },
    { left: "Have unlimited holidays", right: "Have a four-day work week" },
    { left: "Share your search history", right: "Share your bank statement" },
    { left: "Be famous but misunderstood", right: "Be unknown but adored" },
    { left: "Relive your best holiday", right: "Take a mystery trip tomorrow" },
    { left: "Cook every meal", right: "Wash every dish" },
    { left: "Lose your keys every week", right: "Lose your phone once a month" },
    { left: "Have no small talk", right: "Have no group chats" },
    { left: "Date someone painfully tidy", right: "Date someone gloriously messy" },
    { left: "Tell your boss the truth", right: "Tell your family the truth" },
    { left: "Never drink again", right: "Never eat dessert again" },
    { left: "Be brilliant at karaoke", right: "Be brilliant on the dance floor" },
    { left: "Always split the bill", right: "Always take turns paying" },
    { left: "Have your dream home", right: "Travel whenever you like" },
    { left: "Give up streaming", right: "Give up social media" },
    { left: "Accidentally text your ex", right: "Accidentally text your boss" },
    { left: "Only have first dates", right: "Never have date night" },
    { left: "Say everything you think", right: "Never complain again" },
    { left: "Be stuck at an airport", right: "Be stuck in motorway traffic" },
    { left: "Win the lottery quietly", right: "Become famous overnight" },
    { left: "Have a personal chef", right: "Have a personal cleaner" },
    { left: "Work four days from home", right: "Work three days in an office" },
    { left: "Plan every detail", right: "Make everything up as you go" },
    { left: "Clear your email inbox forever", right: "Finish every job on your to-do list" },
    { left: "Always remember names", right: "Always remember faces" },
    { left: "Receive completely honest feedback", right: "Receive a guaranteed compliment" },
    { left: "Live in the middle of a city", right: "Live miles into the countryside" },
    { left: "Host a brilliant dinner party", right: "Plan a brilliant weekend away" },
    { left: "Upgrade your kitchen", right: "Transform your garden" },
    { left: "Know how every book ends", right: "Know how every film ends" },
    { left: "Always find a parking space", right: "Never wait in a queue" },
    { left: "Have perfect Wi-Fi everywhere", right: "Have a phone battery that never dies" },
    { left: "Redo your first job", right: "Redo your first holiday alone" },
    { left: "Only communicate by voice note", right: "Only communicate by email" },
    { left: "Give a speech with no warning", right: "Sing karaoke with no practice" },
    { left: "Have a year of free restaurants", right: "Have a year of free concerts" },
    { left: "Keep every photo you take", right: "Keep every message you send" },
    { left: "Always choose the restaurant", right: "Never choose the restaurant" },
    { left: "Take a relaxing beach holiday", right: "Take an action-packed city break" },
    { left: "Master a new language", right: "Master a musical instrument" },
    { left: "Have neighbours who are too friendly", right: "Have neighbours who never speak" },
    { left: "Arrive with no luggage", right: "Arrive with no booking" },
    { left: "Have every weekend fully planned", right: "Have every weekend completely open" },
    { left: "Be the designated driver", right: "Be the designated organiser" },
    { left: "Give up takeaway food", right: "Give up online shopping" },
    { left: "Remember every conversation", right: "Forget every embarrassing moment" },
    { left: "Get an extra hour every morning", right: "Get an extra hour every evening" },
    { left: "Be excellent at DIY", right: "Be excellent with technology" },
    { left: "Have your life narrated", right: "Have your life filmed" },
    { left: "Spend a month without music", right: "Spend a month without television" },
    { left: "Always get the window seat", right: "Always get extra legroom" },
    { left: "Own one perfect outfit", right: "Own endless average outfits" },
    { left: "Have dinner with your childhood self", right: "Have dinner with your future self" },
    { left: "Know exactly what people think", right: "Always know exactly what to say" },
    { left: "Retire ten years earlier", right: "Take a six-month break next year" },
    { left: "Live without a car", right: "Live without air travel" },
    { left: "Be lucky in work", right: "Be lucky in love" },
  ],
};

export type HangmanPack = "animals" | "food" | "places";

export type HangmanEntry = {
  word: string;
  hint: string;
};

export const hangmanPacks: Record<HangmanPack, HangmanEntry[]> = {
  animals: [
    { word: "PENGUIN", hint: "A bird that wears a dinner suit" },
    { word: "BUTTERFLY", hint: "It begins life as a caterpillar" },
    { word: "KANGAROO", hint: "A famous Australian jumper" },
    { word: "OCTOPUS", hint: "Eight arms under the sea" },
    { word: "HEDGEHOG", hint: "A small garden visitor with spines" },
    { word: "FLAMINGO", hint: "A pink bird that stands on one leg" },
    { word: "DOLPHIN", hint: "A clever ocean mammal" },
    { word: "CHAMELEON", hint: "A lizard famous for changing colour" },
    { word: "GIRAFFE", hint: "The tallest animal" },
    { word: "HAMSTER", hint: "A tiny pet that loves a wheel" },
  ],
  food: [
    { word: "STRAWBERRY", hint: "A red fruit with seeds on the outside" },
    { word: "SPAGHETTI", hint: "Long, thin pasta" },
    { word: "POPCORN", hint: "A crunchy cinema snack" },
    { word: "PINEAPPLE", hint: "A tropical fruit with a spiky crown" },
    { word: "PANCAKES", hint: "A stack made for syrup" },
    { word: "CHOCOLATE", hint: "A sweet treat made from cocoa" },
    { word: "BROCCOLI", hint: "A green vegetable shaped like little trees" },
    { word: "SANDWICH", hint: "A filling between two slices" },
    { word: "WATERMELON", hint: "A huge fruit with a green rind" },
    { word: "CROISSANT", hint: "A flaky crescent-shaped pastry" },
  ],
  places: [
    { word: "PLAYGROUND", hint: "A place with swings and slides" },
    { word: "SUPERMARKET", hint: "Where you fill a trolley" },
    { word: "LIGHTHOUSE", hint: "It guides ships from the shore" },
    { word: "TREEHOUSE", hint: "A hideaway built among branches" },
    { word: "WATER PARK", hint: "A place with pools and giant slides" },
    { word: "AIRPORT", hint: "Where journeys take off" },
    { word: "LIBRARY", hint: "A quiet home for lots of books" },
    { word: "BOWLING ALLEY", hint: "Where you try to knock down ten pins" },
    { word: "CAMPSITE", hint: "A place to pitch your tent" },
    { word: "AMUSEMENT PARK", hint: "A place packed with rides" },
  ],
};

export const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const maxHangmanMisses = 6;

export function normaliseHangmanWord(value: string) {
  return value
    .trim()
    .toLocaleUpperCase()
    .replace(/[^A-Z '\-]/g, "")
    .replace(/\s+/g, " ");
}

export function wordLetters(word: string) {
  return new Set(word.match(/[A-Z]/g) ?? []);
}

export function missedLetters(word: string, guessed: Iterable<string>) {
  const answer = wordLetters(word);
  return [...new Set(guessed)].filter((letter) => !answer.has(letter));
}

export function solvedWord(word: string, guessed: Iterable<string>) {
  const picks = new Set(guessed);
  return [...wordLetters(word)].every((letter) => picks.has(letter));
}

export function nextIndex(length: number, current = -1, random = Math.random) {
  if (length <= 1) return 0;
  const candidate = Math.floor(random() * (length - 1));
  return candidate >= current ? candidate + 1 : candidate;
}
