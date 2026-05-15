import { useState } from 'react';
import { Eye, EyeOff, TrendingUp, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup' && displayName.trim().length < 2) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }

    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, displayName);

    if (result.error) {
      setError(result.error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen app-bg flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center animate-fade-in">
        <div className="w-20 h-20 rounded-3xl btn-primary flex items-center justify-center mb-4 shadow-xl">
          <TrendingUp size={36} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Spendly</h1>
        <p className="text-gray-500 mt-1">Smart expense tracking</p>
      </div>

      {/* Card */}
      <div className="card-glass rounded-3xl p-6 w-full max-w-sm animate-fade-in">
        {/* Segment control */}
        <div className="segment-control flex mb-6">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 text-sm font-semibold transition-all ${mode === 'signin' ? 'segment-active text-gray-900' : 'text-gray-500'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-sm font-semibold transition-all ${mode === 'signup' ? 'segment-active text-gray-900' : 'text-gray-500'}`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input-glass w-full pl-9 pr-4 py-3 text-sm"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-glass w-full pl-9 pr-4 py-3 text-sm"
              required
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-glass w-full pl-9 pr-10 py-3 text-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center max-w-xs">
        Your data is synced across all your devices securely.
      </p>
    </div>
  );
}
