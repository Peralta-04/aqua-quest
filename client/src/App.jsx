import { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { api } from './api.js';
import { Auth, Quests, MapPage, Learn, Ranks, Admin, Drop } from './pages.jsx';

const Ctx = createContext();
export const useMe = () => useContext(Ctx);

export default function App() {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('aq_token')) return setReady(true);
    api('/me').then(setMe).catch(() => localStorage.removeItem('aq_token')).finally(() => setReady(true));
  }, []);
  const logout = () => { localStorage.removeItem('aq_token'); setMe(null); };
  if (!ready) return <p className="loading">LOADING...</p>;
  if (!me) return <Ctx.Provider value={{ me, setMe }}><Auth /></Ctx.Provider>;

  const xp = me.points % 100;
  return (
    <Ctx.Provider value={{ me, setMe }}>
      <header className="hud">
        <div className="logo"><Drop size={5} /><span>AQUAQUEST</span></div>
        <div className="stats">
          <span className="lvl">LV {me.level}</span>
          <div className="xp" title={`${xp}/100 XP`}><i style={{ width: xp + '%' }} /></div>
          <span className="coins">{me.points} PTS</span>
          <button className="btn small" onClick={logout}>EXIT</button>
        </div>
      </header>
      <nav className="tabs">
        <NavLink to="/">QUESTS</NavLink><NavLink to="/map">MAP</NavLink><NavLink to="/learn">LEARN</NavLink>
        <NavLink to="/ranks">RANKS</NavLink>{me.role === 'admin' && <NavLink to="/admin">ADMIN</NavLink>}
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Quests />} /><Route path="/map" element={<MapPage />} />
          <Route path="/learn" element={<Learn />} /><Route path="/ranks" element={<Ranks />} />
          <Route path="/admin" element={me.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <footer>PLAY. SAVE. SUSTAIN.</footer>
    </Ctx.Provider>
  );
}
