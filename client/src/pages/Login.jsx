import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../api';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await auth.login(password);
      localStorage.setItem('relive_token', token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-gold text-3xl font-semibold">Relive</h1>
          <p className="text-cream/50 text-sm mt-1 tracking-widest uppercase">Mobile Detailing</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-navy-light rounded-xl p-8 border border-white/10 shadow-2xl">
          <h2 className="text-cream font-display text-xl mb-6">Owner Login</h2>

          {error && (
            <div className="bg-red-900/40 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-cream/60 text-xs uppercase tracking-widest mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-navy border border-white/10 rounded-lg px-4 py-3 text-cream placeholder-cream/20 focus:outline-none focus:border-gold/50 transition-colors"
              placeholder="Enter password"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-50 text-navy font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-cream/20 text-xs mt-6">Relive Mobile Detailing — Lynchburg, VA</p>
      </div>
    </div>
  );
}
