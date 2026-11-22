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
  "label": "Word counter",
  "topic": {
    "heading": "When word count matters",
    "paragraphs": [
      "Essays, applications, articles and social posts often have strict limits. Counting as you write saves you from cutting text at the last minute."
    ],
    "list": [
      {
        "title": "Essays and assignments:",
        "body": "usually set in words, often with a 10% margin either way."
      },
      {
        "title": "Scholarship and job applications:",
        "body": "personal statements commonly ask for 500–1000 words."
      },
      {
        "title": "Blog posts:",
        "body": "articles of 1000–2000 words tend to rank well in search when the content is genuinely useful."
      },
      {
        "title": "Speeches:",
        "body": "about 150 words per minute, so a 5-minute talk is around 750 words."
      }
    ]
  }
};

export const variants: Variant[] = [
  {
    "slug": "character-counter",
    "label": "Character counter",
    "title": "Character Counter — Count Characters With and Without Spaces | devsam",
    "description": "Count characters with and without spaces as you type, with live limits for X posts, SMS, meta descriptions and Instagram captions. Free and private.",
    "h1": "Count characters",
    "intro": "Type or paste text to count characters with and without spaces, and see instantly whether it fits X, SMS and SEO limits.",
    "topic": {
      "heading": "Character limits you'll meet",
      "paragraphs": [
        "Character limits are stricter than word limits: one extra character can cut off a tweet, split an SMS in two or truncate a search result. Emoji count as one character here, which matches how people read them."
      ],
      "list": [
        {
          "title": "X (Twitter) post:",
          "body": "280 characters."
        },
        {
          "title": "SMS:",
          "body": "160 characters per message; longer texts are split and may cost more."
        },
        {
          "title": "Meta description:",
          "body": "about 150–160 characters before Google cuts it off."
        },
        {
          "title": "Page title:",
          "body": "about 60 characters."
        },
        {
          "title": "Instagram caption:",
          "body": "2,200 characters, with only the first lines shown before 'more'."
        }
      ]
    },
    "faqs": [
      {
        "q": "Do spaces count as characters?",
        "a": "Usually yes: X, SMS and most forms count spaces. Both totals are shown, with and without spaces."
      },
      {
        "q": "How are emoji counted?",
        "a": "Each emoji counts as one character here. Some platforms count certain emoji as two, so leave a little room near a strict limit."
      }
    ]
  }
];
