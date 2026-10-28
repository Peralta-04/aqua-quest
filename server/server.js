import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { seed } from './seed.js';
import { User, Challenge, Submission, Quiz, Alert, Groundwater } from './models.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const app = express();
app.use(cors(), express.json());

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const auth = (role) => async (req, res, next) => {
  try {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    req.user = await User.findById(jwt.verify(t, SECRET).id);
    if (!req.user) throw new Error();
  } catch { return res.status(401).json({ error: 'Please log in first.' }); }
  if (role && req.user.role !== role) return res.status(403).json({ error: 'Admins only.' });
  next();
};
const token = (u) => jwt.sign({ id: u._id }, SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, org: u.org,
  district: u.district, points: u.points, badges: u.badges, level: Math.floor(u.points / 100) + 1 });

async function grantBadges(u) {
  const n = await Submission.countDocuments({ user: u._id, status: 'approved' });
  const b = new Set(u.badges);
  if (n >= 1) b.add('First Drop');
  if (n >= 5) b.add('Drop Hunter');
  if (u.points >= 300) b.add('Aqua Knight');
  if (u.quizDone.length >= 5) b.add('Quiz Wizard');
  u.badges = [...b];
  await u.save();
}

// ---- auth
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password, org, district } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (await User.findOne({ email })) return res.status(409).json({ error: 'That email already has a player.' });
  const u = await User.create({ name, email, org, district, password: await bcrypt.hash(password, 10) });
  res.json({ token: token(u), user: pub(u) });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ email: req.body.email });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password)))
    return res.status(401).json({ error: 'Wrong email or password.' });
  res.json({ token: token(u), user: pub(u) });
}));
app.get('/api/me', auth(), (req, res) => res.json(pub(req.user)));

// ---- quests
app.get('/api/challenges', auth(), wrap(async (req, res) => {
  const list = await Challenge.find({ active: true }).sort('type -createdAt').lean();
  const mine = await Submission.find({ user: req.user._id }).sort('-createdAt').lean();
  res.json(list.map((c) => {
    const s = mine.find((m) => String(m.challenge) === String(c._id));
    return { ...c, myStatus: s?.status || null };
  }));
}));
app.post('/api/challenges', auth('admin'), wrap(async (req, res) => res.json(await Challenge.create(req.body))));
app.post('/api/challenges/:id/submit', auth(), wrap(async (req, res) => {
  const c = await Challenge.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'Quest not found.' });
  const windowMs = (c.type === 'weekly' ? 7 : 1) * 864e5;
  const dup = await Submission.findOne({ user: req.user._id, challenge: c._id,
    status: { $ne: 'rejected' }, createdAt: { $gt: new Date(Date.now() - windowMs) } });
  if (dup) return res.status(409).json({ error: 'Already submitted for this period.' });
  res.json(await Submission.create({ user: req.user._id, challenge: c._id, note: req.body.note, proof: req.body.proof }));
}));

// ---- admin review
app.get('/api/admin/submissions', auth('admin'), wrap(async (req, res) =>
  res.json(await Submission.find({ status: 'pending' }).populate('user', 'name org').populate('challenge', 'title points').sort('createdAt'))));
app.post('/api/admin/submissions/:id/review', auth('admin'), wrap(async (req, res) => {
  const s = await Submission.findById(req.params.id).populate('challenge');
  if (!s || s.status !== 'pending') return res.status(400).json({ error: 'Already reviewed.' });
  s.status = req.body.approve ? 'approved' : 'rejected';
  await s.save();
  if (req.body.approve) {
    const u = await User.findById(s.user);
    u.points += s.challenge.points;
    await grantBadges(u);
  }
  res.json(s);
}));

// ---- groundwater + alerts
app.get('/api/groundwater', wrap(async (req, res) => res.json(await Groundwater.find().lean())));
app.get('/api/alerts', wrap(async (req, res) => res.json(await Alert.find().sort('-createdAt').limit(10))));
app.post('/api/alerts', auth('admin'), wrap(async (req, res) => res.json(await Alert.create(req.body))));

// ---- quiz
app.get('/api/quiz', auth(), wrap(async (req, res) => {
  const qs = await Quiz.find().select('-answer -explain').lean();
  res.json(qs.map((q) => ({ ...q, done: req.user.quizDone.some((d) => String(d) === String(q._id)) })));
}));
app.post('/api/quiz/:id/answer', auth(), wrap(async (req, res) => {
  const q = await Quiz.findById(req.params.id);
  const correct = q.answer === req.body.choice;
  const first = !req.user.quizDone.some((d) => String(d) === String(q._id));
  if (correct && first) { req.user.points += q.points; req.user.quizDone.push(q._id); await grantBadges(req.user); }
  res.json({ correct, answer: q.answer, explain: q.explain, user: pub(req.user) });
}));

// ---- leaderboard
app.get('/api/leaderboard', wrap(async (req, res) => {
  if (req.query.by === 'org') {
    return res.json(await User.aggregate([{ $match: { org: { $ne: '' } } },
      { $group: { _id: '$org', points: { $sum: '$points' }, players: { $sum: 1 } } },
      { $sort: { points: -1 } }, { $limit: 20 }, { $project: { _id: 0, name: '$_id', points: 1, players: 1 } }]));
  }
  res.json(await User.find({ role: 'citizen' }).sort('-points').limit(20).select('name org points -_id').lean());
}));

// ---- serve the built React app in production (single deploy)
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server glitch. Try again.' }); });

async function start() {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    // No database configured: run an in-memory MongoDB (data resets on restart)
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    uri = (await MongoMemoryServer.create()).getUri('aquaquest');
    await mongoose.connect(uri);
    await seed();
    console.log('Using in-memory MongoDB. Data resets when the server stops.');
  } else await mongoose.connect(uri);
  app.listen(process.env.PORT || 5000, () => console.log('AquaQuest API on :' + (process.env.PORT || 5000)));
}
start().catch((e) => { console.error('Could not start:', e.message); process.exit(1); });
