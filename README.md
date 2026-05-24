# 🔥 DSA Tracker — Striver's A2Z

A full-featured, offline-first DSA practice tracker built for Striver's A2Z sheet.  
**All data lives in your browser's localStorage — zero servers, zero accounts needed.**

## Features

- 📋 **106 problems** across all 18 Striver A2Z steps — pre-loaded with descriptions, examples, boilerplate, and hints
- 💻 **Monaco editor** (VS Code in the browser) with C++ syntax highlighting
- ▶️ **Real code execution** via Judge0 — run against example + hidden test cases, get Accepted / Wrong Answer / TLE verdicts
- ⏱️ **Session timer** — tracks time spent per problem, by day, time of day
- 💡 **Hints system** — click to reveal, records exactly which minute you used each hint
- 📊 **Submission history** — verdict, TC, SC, approach, hints used — all tracked per submission
- 🧠 **Approach tracker** — AHA moment input, best approach, concepts to study, personal notes
- 🔁 **Spaced repetition** — solved problems auto-schedule 3-day, 7-day, 14-day reviews
- 📈 **Dashboard** — daily time chart, difficulty breakdown, per-step progress rings, weakpoints
- 📝 **Concept notes** — tagged to NeetCode patterns, linkable to problems
- 📤 **Export** — JSON backup (full), CSV stats, per-problem `.cpp` download
- 📥 **Import** — restore from JSON backup
- ✅ **Theory divisions** — mark theory as complete to unlock practice problem suggestions

## Setup

### Run locally
```bash
git clone https://github.com/bhumikahipparagi/dsa-tracker.git
cd dsa-tracker
npm install
npm run dev
```
Open `http://localhost:5173`

### Code execution (Judge0)
1. Go to [RapidAPI Judge0](https://rapidapi.com/judge0-official/api/judge0-ce) and subscribe to the free tier (50 req/day)
2. Copy your API key
3. Open the app → Settings → paste key → Save

### Deploy to GitHub Pages
The repo includes a GitHub Actions workflow that auto-deploys on every push to `main`.  
Enable it: **Repo → Settings → Pages → Source: GitHub Actions**

Your app will be live at: `https://bhumikahipparagi.github.io/dsa-tracker/`

## Data persistence

All data (code, submissions, notes, timer sessions, review dates) is stored in `localStorage` under key `dsa-tracker-v1`.  
Export a JSON backup regularly from **Settings → Export All** to avoid losing data on browser clear.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS (dark theme)
- Zustand + localStorage persist
- Monaco Editor
- Recharts
- Judge0 CE via RapidAPI
- date-fns
