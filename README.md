# AquaQuest - Gamified Water Conservation & Groundwater Awareness Portal
MERN stack, retro pixel-art UI. Play. Save. Sustain.

## Run locally
1. `npm i` (root, installs concurrently) then `npm run install:all`
2. `npm run dev` -> client http://localhost:5173, API http://localhost:5000
   With MONGO_URI empty in server/.env, an in-memory MongoDB is used and auto-seeded (data resets on restart; first run downloads a MongoDB binary).
   Admin login: admin@aqua.dev / admin123
3. Persistent data: set MONGO_URI (local MongoDB or Atlas), run `npm run seed` once.

## Modules (match the PPT)
- Quests: daily/weekly challenges, proof submission (photo link + note)
- Points, badges, levels: level = points/100; badges First Drop, Drop Hunter, Aqua Knight, Quiz Wizard
- Water table map: pixel tile map of districts (sample data in server/seed.js - replace with CGWB data)
- Learn: myth-buster quizzes, points once per question
- Ranks: player and school/community leaderboards
- Admin: verify proofs, publish quests, send regional alerts

## Deploy (Render + MongoDB Atlas, single service)
Build: `npm run build`   Start: `npm start`
Env vars: MONGO_URI (Atlas, ending /aquaquest), JWT_SECRET (long random), NODE_VERSION=20
Seed Atlas once from your laptop: set MONGO_URI and ADMIN_PASSWORD, then `npm run seed`. Seeding wipes data; never re-run after launch.
# aqua-quest
# aqua-quest
