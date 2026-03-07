import { useState, useEffect } from 'react';
import { User, MapPin, Package, Truck, CheckCircle, Edit2, Save, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400";

export default function Profile() {
  const { user, login, token, authHeader, API } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', neighborhood: '' });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, neighborhood: user.neighborhood });
    }
    axios.get(`${API}/my/stats`, { headers: authHeader })
      .then(res => setStats(res.data))
      .catch(console.error);
  }, [user]);

  const saveProfile = async () => {
    if (!form.name.trim() || !form.neighborhood.trim()) {
      toast.error('Name and neighborhood are required');
      return;
    }
    setSaving(true);
    try {
      const res = await axios.patch(`${API}/users/profile`, form, { headers: authHeader });
      login(token, res.data);
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="pt-20 pb-28 md:pb-8 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-extrabold text-slate-900 font-['Manrope'] tracking-tight mb-8">Profile</h1>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6" data-testid="profile-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <span className="text-2xl font-extrabold text-emerald-600 font-['Manrope']">
                  {user?.name?.[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                {editing ? (
                  <input data-testid="profile-name-input"
                    className={`${inputClass} mb-1`}
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your name"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-slate-900 font-['Manrope']" data-testid="profile-name-display">
                    {user?.name}
                  </h2>
                )}
                <p className="text-sm text-slate-500" data-testid="profile-email-display">{user?.email}</p>
              </div>
            </div>
            {!editing ? (
              <button data-testid="profile-edit-btn"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-600 px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            ) : (
              <button onClick={() => setEditing(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Neighborhood
              </label>
              {editing ? (
                <input data-testid="profile-neighborhood-input"
                  className={inputClass}
                  value={form.neighborhood}
                  onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))}
                  placeholder="Your neighborhood"
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span data-testid="profile-neighborhood-display">{user?.neighborhood}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Member Since
              </label>
              <p className="text-slate-700 font-medium">
                {user?.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : 'N/A'}
              </p>
            </div>
          </div>

          {editing && (
            <div className="mt-5 flex gap-3">
              <button data-testid="profile-save-btn"
                onClick={saveProfile}
                disabled={saving}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-md shadow-emerald-600/20">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => { setEditing(false); setForm({ name: user.name, neighborhood: user.neighborhood }); }}
                className="rounded-full border border-slate-200 px-5 py-2.5 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6" data-testid="profile-stats">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 font-['Manrope']" data-testid="stats-errands-posted">
                {stats.errands_posted}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Posted</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                <Truck className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 font-['Manrope']" data-testid="stats-active-runs">
                {stats.active_runs}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Active Runs</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 font-['Manrope']" data-testid="stats-runs-completed">
                {stats.runs_completed}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Completed</p>
            </div>
          </div>
        )}

        {/* User ID Info */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">User ID</p>
          <p className="text-xs text-slate-500 font-mono break-all">{user?.id}</p>
        </div>
      </div>
    </main>
  );
}
