import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Eye, EyeOff, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Auth() {
  const [tab, setTab] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', neighborhood: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, loginForm);
      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      if (!err.response) {
        setError('Unable to reach the server. Please check your connection and try again.');
      } else {
        setError(err.response?.data?.detail || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.neighborhood) {
      setError('All fields are required');
      return;
    }
    if (registerForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, registerForm);
      login(res.data.token, res.data.user);
      toast.success(`Welcome to ErrandGo, ${res.data.user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      if (!err.response) {
        setError('Unable to reach the server. Please check your connection and try again.');
      } else {
        setError(err.response?.data?.detail || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <span className="font-extrabold text-slate-900 text-2xl font-['Manrope']">ErrandGo</span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">
        {/* Tab switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-8">
          <button
            data-testid="auth-login-tab"
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${tab === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Sign In
          </button>
          <button
            data-testid="auth-register-tab"
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${tab === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div data-testid="auth-error" className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                data-testid="login-email-input"
                type="email" required
                className={inputClass}
                placeholder="you@example.com"
                value={loginForm.email}
                onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  data-testid="login-password-input"
                  type={showPass ? 'text' : 'password'} required
                  className={`${inputClass} pr-12`}
                  placeholder="Your password"
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button data-testid="login-submit-btn" type="submit" disabled={loading}
              className="w-full rounded-full bg-emerald-600 py-3.5 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-lg shadow-emerald-600/20 mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input
                data-testid="register-name-input"
                type="text" required
                className={inputClass}
                placeholder="Jane Smith"
                value={registerForm.name}
                onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                data-testid="register-email-input"
                type="email" required
                className={inputClass}
                placeholder="you@example.com"
                value={registerForm.email}
                onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  data-testid="register-password-input"
                  type={showPass ? 'text' : 'password'} required
                  className={`${inputClass} pr-12`}
                  placeholder="Min. 6 characters"
                  value={registerForm.password}
                  onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Neighborhood</label>
              <input
                data-testid="register-neighborhood-input"
                type="text" required
                className={inputClass}
                placeholder="e.g. Riverside, Oak Park"
                value={registerForm.neighborhood}
                onChange={e => setRegisterForm({ ...registerForm, neighborhood: e.target.value })}
              />
              <p className="text-xs text-slate-400 mt-1.5">Helps runners find errands near them</p>
            </div>
            <button data-testid="register-submit-btn" type="submit" disabled={loading}
              className="w-full rounded-full bg-emerald-600 py-3.5 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-lg shadow-emerald-600/20 mt-2">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="text-emerald-600 hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy-policy" className="text-emerald-600 hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
