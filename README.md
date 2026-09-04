# GCSE Flashcards — React

A dark, focused flashcards app for seven GCSE subjects, built with **React + Vite** and
**Framer Motion** animations. Same content and features as before (1,617 cards, per-subject
progress, know / still-learning tracking, filters, shuffle, keyboard shortcuts) with a new
dark, bold, animated design.

## Subjects
Biology (AQA 8461) · Chemistry (AQA 8462) · Physics (AQA 8463) · Computer Science (OCR J277) ·
Media Studies (Eduqas) · History (Edexcel 1HI0) · English Literature (AQA 8702).

## Run locally
```bash
npm install
npm run dev
```
Then open the URL Vite prints (usually http://localhost:5173).

## Build for production
```bash
npm install
npm run build
```
This creates a `dist/` folder — the deployable static site.

## Deploy to Netlify
Because this is a React/Vite app it needs a build step, so you have two options:

**A. Drag-and-drop the build**
1. Run `npm run build`.
2. Drag the **`dist`** folder onto <https://app.netlify.com/drop>.

**B. Connect a Git repo (auto-builds)**
- Build command: `npm run build`
- Publish directory: `dist`

## Project structure
- `index.html` — Vite entry (loads the Space Grotesk font)
- `src/main.jsx` — React entry
- `src/App.jsx` — app state and logic (progress, sessions, keyboard)
- `src/components/` — Header, TopicsView, StudyView, Flashcard, Toast
- `src/index.css` — the dark theme and animations
- `src/subjects.js` — registers the subjects and flattens cards
- `src/data/*.js` — the flashcards for each subject (edit these to add/change cards)

## Editing cards
Open `src/data/<subject>.js`. Each topic has a `cards` array of `[question, answer, tier]`.
`tier`: `""` = all · `"HT"` = Higher Tier only · `"CO"/"BO"/"PO"` = separate-science only · `"NA"` = untiered.
Save and the dev server hot-reloads.

## Design notes
- Always dark; each subject has its own accent colour (set on `<html data-subject>` and read by CSS).
- Animations use Framer Motion: staggered topic cards, an animated subject-tab pill, card slide
  transitions and the 3D flip. Respects `prefers-reduced-motion`.
