import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Truck, ChevronRight, MapPin } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLORS = {
  matched: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-purple-50 text-purple-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS = {
  matched: 'Awaiting Payment',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function MyRuns() {
  const { authHeader, API } = useAuth();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(() => {
    axios.get(`${API}/my/runs`, { headers: authHeader })
      .then(res => setRuns(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [API, authHeader]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const markDelivered = async (errandId, e) => {
    e.preventDefault();
    try {
      await axios.patch(`${API}/errands/${errandId}/status`, { status: 'completed' }, { headers: authHeader });
      setRuns(prev => prev.map(r => r.id === errandId ? { ...r, status: 'completed' } : r));
      toast.success('Errand marked as delivered!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const activeRuns = runs.filter(r => ['matched', 'in_progress'].includes(r.status));
  const pastRuns = runs.filter(r => ['completed', 'cancelled'].includes(r.status));

  const RunCard = ({ run }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 p-5">
      <Link to={`/errands/${run.id}`} data-testid={`my-run-item-${run.id}`} className="block">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 font-['Manrope'] truncate">{run.item_description}</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${STATUS_COLORS[run.status] || 'bg-slate-100 text-slate-500'}`}>
                {STATUS_LABELS[run.status] || run.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {run.pickup_neighborhood} → {run.delivery_neighborhood}
              </span>
              <span className="font-bold text-emerald-600">${(run.accepted_price || run.offered_price).toFixed(2)}</span>
              <span>For: {run.poster_name}</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
        </div>
      </Link>

      {run.status === 'in_progress' && (
        <div className="pt-3 border-t border-slate-100">
          <div className="bg-amber-50 rounded-xl p-3 mb-3">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5">Deliver to</p>
            <p className="text-sm font-semibold text-slate-800">{run.delivery_address}</p>
          </div>
          <button data-testid={`mark-delivered-btn-${run.id}`}
            onClick={(e) => markDelivered(run.id, e)}
            className="w-full rounded-full bg-purple-600 py-2.5 text-white text-sm font-bold hover:bg-purple-700 transition-all">
            Mark as Delivered
          </button>
        </div>
      )}

      {run.status === 'matched' && (
        <div className="pt-3 border-t border-slate-100">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-sm text-amber-700">
            Waiting for poster to confirm payment...
          </div>
        </div>
      )}
    </div>
  );

  return (
    <main className="pt-20 pb-28 md:pb-8 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 font-['Manrope'] tracking-tight">My Runs</h1>
          <p className="text-slate-500 mt-1">Errands you've offered to run</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="h-5 bg-slate-100 rounded w-2/3 mb-3" />
                <div className="h-4 bg-slate-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-20" data-testid="my-runs-empty">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900 font-['Manrope'] text-xl mb-2">No active runs</h3>
            <p className="text-slate-500 mb-6">Browse the dashboard and offer to run an errand</p>
            <Link to="/dashboard"
              className="inline-flex rounded-full bg-emerald-600 px-6 py-3 text-white font-bold text-sm hover:bg-emerald-700 transition-all">
              Browse Errands
            </Link>
          </div>
        ) : (
          <div className="space-y-6" data-testid="my-runs-list">
            {activeRuns.length > 0 && (
              <div>
                <h2 className="font-bold text-slate-700 font-['Manrope'] mb-3 text-sm uppercase tracking-widest">
                  Active ({activeRuns.length})
                </h2>
                <div className="space-y-3">
                  {activeRuns.map(run => <RunCard key={run.id} run={run} />)}
                </div>
              </div>
            )}
            {pastRuns.length > 0 && (
              <div>
                <h2 className="font-bold text-slate-700 font-['Manrope'] mb-3 text-sm uppercase tracking-widest">
                  Past ({pastRuns.length})
                </h2>
                <div className="space-y-3">
                  {pastRuns.map(run => <RunCard key={run.id} run={run} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
