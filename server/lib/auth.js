import { parseCookies, token } from './util.js';

const COOKIE = 'tired_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export function createAuth(db) {
  const sessions = () => db.data.sessions;

  function attach(req, res, next) {
    const sid = parseCookies(req.headers.cookie).tired_session;
    const session = sid ? sessions()[sid] : null;
    if (session && Date.now() - session.createdAt < MAX_AGE_MS) {
      req.user = db.data.users.find((u) => u.id === session.userId) || null;
      req.sessionId = sid;
    } else {
      req.user = null;
    }
    next();
  }

  function signIn(res, userId) {
    const sid = token();
    sessions()[sid] = { userId, createdAt: Date.now() };
    db.save();
    res.setHeader(
      'Set-Cookie',
      `${COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_MS / 1000}`,
    );
    return sid;
  }

  function signOut(req, res) {
    if (req.sessionId) {
      delete sessions()[req.sessionId];
      db.save();
    }
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  }

  const requireUser = (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Sign in required' });
    next();
  };

  const requireHost = (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Sign in required' });
    if (!req.user.roles.includes('host')) return res.status(403).json({ error: 'Host access required' });
    next();
  };

  return { attach, signIn, signOut, requireUser, requireHost };
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, salt, ...rest } = user;
  return rest;
}
