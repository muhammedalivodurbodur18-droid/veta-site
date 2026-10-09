# Veta site

Landing page (`index.html`) and demo app (`app.html`) for Veta, the Game Studio OS.

- Hosted on Netlify, deployed from this repo.
- `netlify/functions/ai.mjs` serves `/api/ai`: a small proxy that lets visitors use the demo AI without their own key.
- Set `GROQ_API_KEY` in Netlify → Site configuration → Environment variables. Optional: `VETA_AI_LIMIT_PER_HOUR` (default 30 requests per visitor per hour).
