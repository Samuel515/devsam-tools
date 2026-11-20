import type { Topic } from "@devsam/ui/components/TopicSection.astro";

export type Variant = {
  slug: string;
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  topic: Topic;
  faqs: { q: string; a: string }[];
};

export const mainTopic: { label: string; topic: Topic } = {
  "label": "Password generator",
  "topic": {
    "heading": "What makes a password strong",
    "paragraphs": [
      "Attackers don't guess passwords one by one: they use lists of leaked passwords, common words with predictable changes, and fast hardware that tries billions of combinations per second. A strong password is long and random, so none of those shortcuts work."
    ],
    "list": [
      {
        "title": "Length beats complexity:",
        "body": "each extra character multiplies the possibilities."
      },
      {
        "title": "Randomness:",
        "body": "human-chosen passwords follow patterns; generated ones don't."
      },
      {
        "title": "Uniqueness:",
        "body": "a different password for every site, so one leak can't unlock the rest."
      }
    ],
    "outro": "A password manager remembers them for you, so you only need one strong passphrase to unlock it."
  }
};

export const variants: Variant[] = [
  {
    "slug": "passphrase-generator",
    "label": "Passphrase generator",
    "title": "Passphrase Generator — Strong, Memorable Diceware Passwords | devsam",
    "description": "Generate random, memorable passphrases from the EFF word list, like Tulip-Volatile-Upswing7. Strong, easy to type, and made on your device.",
    "h1": "Generate a memorable passphrase",
    "intro": "Random words are easier to remember and type than random characters, and just as hard to guess. Made on your device with cryptographic randomness.",
    "topic": {
      "heading": "Why passphrases work",
      "paragraphs": [
        "A passphrase is a few random words strung together. Each word is picked at random from the EFF's list of 7,776 common, easy-to-spell words, so a 6-word passphrase has about 77 bits of entropy, more than most attackers can ever search.",
        "The key is that the words are chosen randomly, not by you. A phrase you make up yourself, like a song lyric, is far easier to guess."
      ],
      "list": [
        {
          "title": "Master passwords:",
          "body": "for your password manager or computer login, which you type often."
        },
        {
          "title": "Wi-Fi passwords:",
          "body": "easy to read out to guests and type on a phone."
        }
      ]
    },
    "faqs": [
      {
        "q": "How many words should a passphrase have?",
        "a": "Six words gives about 77 bits of entropy, strong enough for almost anything. Five words is fine for less important accounts; seven or more for maximum security."
      },
      {
        "q": "Is a passphrase better than a random password?",
        "a": "They can be equally strong. Passphrases are much easier to remember and type, so they're best for the few passwords you must type yourself."
      }
    ]
  }
];
