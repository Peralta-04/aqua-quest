import { useEffect, useState } from 'react';
import { api } from './api.js';
import { useMe } from './App.jsx';

// 8x10 pixel droplet sprite
const SPRITE = ['...##...','...##...','..####..','..####..','.######.','.######.','########','########','.######.','..####..'];
export function Drop({ size = 4 }) {
  return (
    <svg width={8 * size} height={10 * size} viewBox="0 0 8 10" shapeRendering="crispEdges" aria-hidden="true">
      {SPRITE.flatMap((row, y) => [...row].map((c, x) => c === '#' && <rect key={x + '-' + y} x={x} y={y} width="1" height="1" fill={x === 2 && y > 4 && y < 8 ? '#bff3ff' : '#2fb8ff'} />))}
    </svg>
  );
}

const useLoad = (path) => {
  const [data, set] = useState(null);
  const [err, setErr] = useState('');
  const reload = () => api(path).then(set).catch((e) => setErr(e.message));
  useEffect(() => { reload(); }, [path]);
  return [data, reload, err];
};
const Err = ({ msg }) => msg ? <p className="msg bad">! {msg}</p> : null;

// ---------- login / register
export function Auth() {
  const { setMe } = useMe();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '', org: '', district: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = async (e) => {
    e.preventDefault();
    try {
      const r = await api(`/auth/${mode}`, { method: 'POST', body: f });
      localStorage.setItem('aq_token', r.token); setMe(r.user);
    } catch (x) { setErr(x.message); }
  };
  return (
    <div className="title-screen">
      <Drop size={10} />
      <h1>AQUAQUEST</h1>
      <p className="sub blink">PLAY. SAVE. SUSTAIN.</p>
      <form className="panel" onSubmit={go}>
        <h2>{mode === 'login' ? 'CONTINUE' : 'NEW PLAYER'}</h2>
        {mode === 'register' && <><input placeholder="Player name" value={f.name} onChange={set('name')} />
          <input placeholder="School or community (optional)" value={f.org} onChange={set('org')} />
          <input placeholder="District (optional)" value={f.district} onChange={set('district')} /></>}
        <input type="email" placeholder="Email" value={f.email} onChange={set('email')} />
        <input type="password" placeholder="Password" value={f.password} onChange={set('password')} />
        <Err msg={err} />
        <button className="btn">{mode === 'login' ? 'PRESS START' : 'CREATE PLAYER'}</button>
        <button type="button" className="link" onClick={() => { setErr(''); setMode(mode === 'login' ? 'register' : 'login'); }}>
          {mode === 'login' ? 'New here? Make a player' : 'Have a player? Log in'}
        </button>
      </form>
    </div>
  );
}

// ---------- quests
export function Quests() {
  const [list, reload] = useLoad('/challenges');
  const [alerts] = useLoad('/alerts');
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({ note: '', proof: '' });
  const [msg, setMsg] = useState('');
  const submit = async (id) => {
    try { await api(`/challenges/${id}/submit`, { method: 'POST', body: form }); setOpen(null); setForm({ note: '', proof: '' }); setMsg('Sent! An admin will check it.'); reload(); }
    catch (e) { setMsg('! ' + e.message); }
  };
  return (
    <>
      {alerts?.slice(0, 2).map((a) => <div key={a._id} className={'alert ' + a.severity}>[{a.district}] {a.message}</div>)}
      <h2>QUEST LOG</h2>
      {msg && <p className="msg">{msg}</p>}
      <div className="grid">
        {list?.map((c) => (
          <div className="card" key={c._id}>
            <span className={'tag ' + c.type}>{c.type}</span>
            <h3>{c.title}</h3><p>{c.description}</p>
            <div className="row"><b className="coins">+{c.points} PTS</b>
              {c.myStatus === 'pending' ? <span className="tag">CHECKING</span>
                : c.myStatus === 'approved' ? <span className="tag ok">DONE</span>
                : <button className="btn small" onClick={() => setOpen(open === c._id ? null : c._id)}>START</button>}
            </div>
            {open === c._id && <div className="submit">
              <input placeholder="Photo link (proof)" value={form.proof} onChange={(e) => setForm({ ...form, proof: e.target.value })} />
              <input placeholder="What did you do?" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <button className="btn small" onClick={() => submit(c._id)}>SUBMIT PROOF</button></div>}
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- groundwater tile map
const stage = (d) => d < 8 ? ['SAFE', 'safe'] : d < 15 ? ['WATCH', 'watch'] : ['CRITICAL', 'crit'];
export function MapPage() {
  const [data] = useLoad('/groundwater');
  const [pick, setPick] = useState(null);
  if (!data) return <p className="loading">LOADING...</p>;
  const sel = pick || data.find((d) => d.district === 'Chennai') || data[0];
  const cols = Math.max(...data.map((d) => d.x)) + 1, rows = Math.max(...data.map((d) => d.y)) + 1;
  return (
    <>
      <h2>WATER TABLE MAP</h2>
      <div className="mapwrap">
        <div className="tilemap" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
          {data.map((d) => (
            <button key={d._id} className={'tile ' + stage(d.depth)[1] + (sel._id === d._id ? ' on' : '')}
              style={{ gridColumn: d.x + 1, gridRow: d.y + 1 }} onClick={() => setPick(d)} aria-label={d.district}>
              <span>{d.district.slice(0, 4)}</span><b>{d.depth}m</b>
            </button>))}
        </div>
        <div className="panel info">
          <h3>{sel.district}</h3>
          <p>Depth to water: <b>{sel.depth} m</b></p>
          <p>Vs last year: <b className={sel.change > 0 ? 'badc' : 'goodc'}>{sel.change > 0 ? '+' : ''}{sel.change} m {sel.change > 0 ? '(falling)' : '(rising)'}</b></p>
          <p>Status: <span className={'tag ' + stage(sel.depth)[1]}>{stage(sel.depth)[0]}</span></p>
          <div className="legend"><i className="safe" /> under 8m <i className="watch" /> 8-15m <i className="crit" /> over 15m</div>
          <small>Sample data. Swap in CGWB readings.</small>
        </div>
      </div>
    </>
  );
}

// ---------- quiz
export function Learn() {
  const { setMe } = useMe();
  const [qs, reload] = useLoad('/quiz');
  const [res, setRes] = useState({});
  const answer = async (q, i) => {
    const r = await api(`/quiz/${q._id}/answer`, { method: 'POST', body: { choice: i } });
    setRes({ ...res, [q._id]: { ...r, picked: i } }); setMe(r.user); reload();
  };
  return (
    <>
      <h2>MYTH BUSTERS</h2>
      {qs?.map((q) => {
        const r = res[q._id];
        return (
          <div className="card wide" key={q._id}>
            <h3>{q.question} {q.done && <span className="tag ok">+{q.points} CLAIMED</span>}</h3>
            <div className="opts">{q.options.map((o, i) => (
              <button key={i} disabled={!!r} onClick={() => answer(q, i)}
                className={'btn opt ' + (r ? (i === r.answer ? 'right' : i === r.picked ? 'wrong' : '') : '')}>{o}</button>))}</div>
            {r && <p className="msg">{r.correct ? 'Correct! ' : 'Not quite. '}{r.explain}</p>}
          </div>);
      })}
    </>
  );
}

// ---------- leaderboard
export function Ranks() {
  const [by, setBy] = useState('user');
  const [rows] = useLoad('/leaderboard?by=' + by);
  return (
    <>
      <h2>HIGH SCORES</h2>
      <div className="switch">{[['user', 'PLAYERS'], ['org', 'SCHOOLS & TEAMS']].map(([k, l]) =>
        <button key={k} className={'btn small' + (by === k ? ' on' : '')} onClick={() => setBy(k)}>{l}</button>)}</div>
      <ol className="scores">
        {rows?.map((r, i) => <li key={i}><span className="rank">{i + 1}</span><span className="nm">{r.name}{r.org ? ` (${r.org})` : ''}{r.players ? ` - ${r.players} players` : ''}</span><b className="coins">{r.points}</b></li>)}
        {rows?.length === 0 && <li>No scores yet. Finish a quest to get on the board.</li>}
      </ol>
    </>
  );
}

// ---------- admin
export function Admin() {
  const [subs, reload] = useLoad('/admin/submissions');
  const [c, setC] = useState({ title: '', description: '', points: 10, type: 'daily' });
  const [a, setA] = useState({ message: '', district: 'ALL', severity: 'warn' });
  const [msg, setMsg] = useState('');
  const review = async (id, approve) => { await api(`/admin/submissions/${id}/review`, { method: 'POST', body: { approve } }); reload(); };
  const post = async (path, body, ok) => { try { await api(path, { method: 'POST', body }); setMsg(ok); } catch (e) { setMsg('! ' + e.message); } };
  return (
    <>
      <h2>CONTROL ROOM</h2>
      {msg && <p className="msg">{msg}</p>}
      <h3>PROOF QUEUE</h3>
      {subs?.length === 0 && <p>Queue empty. Nothing to verify.</p>}
      {subs?.map((s) => (
        <div className="card wide" key={s._id}>
          <b>{s.user?.name}</b> - {s.challenge?.title} (+{s.challenge?.points})
          <p>{s.note}</p>{s.proof && <a href={s.proof} target="_blank" rel="noreferrer">View proof</a>}
          <div className="row"><button className="btn small" onClick={() => review(s._id, true)}>APPROVE</button>
            <button className="btn small danger" onClick={() => review(s._id, false)}>REJECT</button></div>
        </div>))}
      <div className="grid">
        <div className="panel"><h3>NEW QUEST</h3>
          <input placeholder="Title" value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} />
          <input placeholder="Description" value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} />
          <input type="number" placeholder="Points" value={c.points} onChange={(e) => setC({ ...c, points: +e.target.value })} />
          <select value={c.type} onChange={(e) => setC({ ...c, type: e.target.value })}><option>daily</option><option>weekly</option></select>
          <button className="btn small" onClick={() => post('/challenges', c, 'Quest published.')}>PUBLISH</button></div>
        <div className="panel"><h3>WATER ALERT</h3>
          <input placeholder="Message" value={a.message} onChange={(e) => setA({ ...a, message: e.target.value })} />
          <input placeholder="District or ALL" value={a.district} onChange={(e) => setA({ ...a, district: e.target.value })} />
          <select value={a.severity} onChange={(e) => setA({ ...a, severity: e.target.value })}><option>info</option><option>warn</option><option>critical</option></select>
          <button className="btn small" onClick={() => post('/alerts', a, 'Alert sent.')}>SEND ALERT</button></div>
      </div>
    </>
  );
}
