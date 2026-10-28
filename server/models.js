import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

export const User = model('User', new Schema({
  name: String, email: { type: String, unique: true, lowercase: true }, password: String,
  role: { type: String, enum: ['citizen', 'admin'], default: 'citizen' },
  org: { type: String, default: '' },        // school / community name
  district: { type: String, default: '' },
  points: { type: Number, default: 0 },
  badges: [String], quizDone: [ref('Quiz')],
}, { timestamps: true }));

export const Challenge = model('Challenge', new Schema({
  title: String, description: String, points: { type: Number, default: 10 },
  type: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  active: { type: Boolean, default: true },
}, { timestamps: true }));

export const Submission = model('Submission', new Schema({
  user: ref('User'), challenge: ref('Challenge'),
  note: String, proof: String,               // proof = image URL
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true }));

export const Quiz = model('Quiz', new Schema({
  question: String, options: [String], answer: Number, explain: String,
  points: { type: Number, default: 5 },
}));

export const Alert = model('Alert', new Schema({
  message: String, district: { type: String, default: 'ALL' },
  severity: { type: String, enum: ['info', 'warn', 'critical'], default: 'info' },
}, { timestamps: true }));

export const Groundwater = model('Groundwater', new Schema({
  district: String, depth: Number,           // metres below ground level
  change: Number,                            // vs last year (+ = deeper = worse)
  x: Number, y: Number,                      // tile-map position
}));
