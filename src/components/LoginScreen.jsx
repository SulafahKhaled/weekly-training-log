import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login, register, error, clearError } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const ok = mode === 'login' ? await login(username, password) : await register(username, password);
    setSubmitting(false);
    if (!ok) return;
  }

  function switchMode(next) {
    setMode(next);
    clearError();
  }

  return (
    <div className="auth-screen">
      <div className="bg-glow" />
      <motion.div className="auth-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="auth-icon">
          <Dumbbell size={22} />
        </div>
        <h1>الخطة الأسبوعية</h1>
        <p className="auth-sub">Weekly Training Log — {mode === 'login' ? 'sign in to your log' : 'create your own log'}</p>

        <form onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. sola"
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_]+"
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="spin" /> : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button type="button" onClick={() => switchMode('register')}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have one?{' '}
              <button type="button" onClick={() => switchMode('login')}>
                Sign in
              </button>
            </>
          )}
        </div>
        <p className="auth-hint">Each account keeps its own private progress, weights, and history — sharing this app with family or friends won't mix your data with theirs.</p>
      </motion.div>
    </div>
  );
}
