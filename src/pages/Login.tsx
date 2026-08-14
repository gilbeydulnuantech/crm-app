import { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'success' } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === 'signup';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      if (isSignUp) {
        await signUp(name, email, password);
      } else {
        await login(email, password);
      }
      setMessage({ text: 'Success! Access granted.', tone: 'success' });
      // AuthProvider's state update will swap the app to the authenticated
      // shell automatically — no manual redirect needed.
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Authentication failed.',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-800">
            {isSignUp ? 'Create an Account' : 'Welcome Back'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isSignUp ? 'Sign up to start using your CRM' : 'Please enter your details to sign in'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            />
          </div>

          {message && (
            <div
              className={`p-3 text-xs rounded-lg text-center border ${
                message.tone === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            {submitting
              ? isSignUp
                ? 'Registering...'
                : 'Signing In...'
              : isSignUp
                ? 'Sign Up'
                : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-5 text-xs text-slate-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isSignUp ? 'login' : 'signup');
              setMessage(null);
            }}
            className="text-indigo-600 font-semibold hover:underline"
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
