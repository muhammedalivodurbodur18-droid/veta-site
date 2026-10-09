# Veta knowledge cards

These cards are short, general game-production guidance that Veta's AI can pull in when a question or GDD matches their tags. This is phase 1 of RAG: simple keyword matching, no database.

## How to write a card

```json
{
  "id": "short-kebab-id",
  "title": "One sentence a producer would say",
  "type": "pattern | genre | checklist | estimate",
  "tags": ["english keywords", "türkçe anahtar kelimeler"],
  "summary": "One or two sentences: what happens and why.",
  "guidance": ["Concrete advice 1", "Concrete advice 2", "Concrete advice 3"],
  "source": "heuristic | https://link-to-source",
  "updated": "YYYY-MM-DD"
}
```

## Rules

- **No invented numbers.** If you write a figure, it needs a `source` link. Otherwise keep it qualitative and set `source` to `heuristic`.
- **Summarize, don't copy.** For postmortems or articles, write the lesson in your own words and link the source.
- **Tags decide when a card is used.** Add the words people actually type, in English and Turkish.
- **Keep it short.** 3-4 guidance lines. The AI sees at most 3 cards per answer.
- One idea per card. If a card needs "and also", split it.
