import { useState, useEffect } from 'react';
import { User, MapPin, Package, Truck, CheckCircle, Edit2, Save, X, Star, DollarSign, Clock, Trash2, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400";

export default function Profile() {
  const { user, login, token, authHeader, API, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', neighborhood: '' });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [userRating, setUserRating] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, neighborhood: user.neighborhood });
      Promise.all([
        axios.get(`${API}/my/stats`, { headers: authHeader }),
        axios.get(`${API}/users/${user.id}/rating`, { headers: authHeader }),
        axios.get(`${API}/my/earnings`, { headers: authHeader }),
      ]).then(([statsRes, ratingRes, earningsRes]) => {
        setStats(statsRes.data);
        setUserRating(ratingRes.data);
        setEarnings(earningsRes.data);
      }).catch(console.error);
    }
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

  const deleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/users/me`, { headers: authHeader });
      toast.success('Account deleted successfully.');
      logout();
      navigate('/');
    } catch (err) {
      toast.error('Failed to delete account. Please try again.');
      setDeleting(false);
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
                  <input data-testid="profile-name-input" className={`${inputClass} mb-1`}
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
                ) : (
                  <h2 className="text-xl font-bold text-slate-900 font-['Manrope']" data-testid="profile-name-display">{user?.name}</h2>
                )}
                <p className="text-sm text-slate-500" data-testid="profile-email-display">{user?.email}</p>
                {/* Rating display */}
                {userRating && userRating.count > 0 && (
                  <div className="flex items-center gap-1.5 mt-1" data-testid="profile-rating-display">
                    <div className="flex">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={`w-3.5 h-3.5 ${star <= Math.round(userRating.average) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{userRating.average}</span>
                    <span className="text-xs text-slate-400">({userRating.count} ratings)</span>
                  </div>
                )}
                {userRating && userRating.count === 0 && (
                  <p className="text-xs text-slate-400 mt-1">No ratings yet</p>
                )}
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

        {/* Member Info */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Account Email</p>
          <p className="text-sm text-slate-600 font-medium">{user?.email}</p>
        </div>
        {/* Earnings Section */}
        {earnings && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" data-testid="earnings-section">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="font-extrabold text-slate-900 font-['Manrope'] text-base">Runner Earnings</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-1">Total Earned</p>
                <p className="text-2xl font-extrabold text-emerald-700 font-['Manrope']" data-testid="total-earned">
                  ${earnings.total_earned.toFixed(2)}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Pending Payout</p>
                </div>
                <p className="text-2xl font-extrabold text-amber-700 font-['Manrope']" data-testid="pending-payout">
                  ${earnings.pending_payout.toFixed(2)}
                </p>
              </div>
            </div>

            {earnings.completed_runs.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">Recent Completed Runs</p>
                <div className="space-y-2">
                  {earnings.completed_runs.slice(0, 5).map(run => (
                    <div key={run.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{run.item_description}</p>
                        <p className="text-xs text-slate-400">{run.poster_name} · {run.delivery_neighborhood}</p>
                      </div>
                      <p className="text-sm font-extrabold text-emerald-700 font-['Manrope']">
                        +${(run.accepted_price || run.offered_price || 0).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {earnings.completed_runs.length === 0 && earnings.total_earned === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">
                Complete runs to start earning. Your earnings will show here.
              </p>
            )}
          </div>
        )}

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-6 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-red-600 text-base">Danger Zone</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            data-testid="delete-account-btn"
            onClick={() => { setShowDeleteConfirm(true); setDeleteInput(''); }}
            className="flex items-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-red-600 text-sm font-semibold hover:bg-red-50 transition-all"
          >
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Delete Account</h3>
                  <p className="text-xs text-slate-400">This is permanent and cannot be reversed.</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                All your errands, offers, messages, and earnings history will be permanently removed.
                Type <span className="font-bold text-red-600">DELETE</span> to confirm.
              </p>
              <input
                data-testid="delete-confirm-input"
                type="text"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
              />
              <div className="flex gap-3">
                <button
                  data-testid="delete-confirm-btn"
                  onClick={deleteAccount}
                  disabled={deleteInput !== 'DELETE' || deleting}
                  className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  data-testid="delete-cancel-btn"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
