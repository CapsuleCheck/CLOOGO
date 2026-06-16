import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Plus } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS = {
  open: 'bg-blue-50 text-blue-700',
  matched: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-purple-50 text-purple-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS = {
  open: 'Open',
  matched: 'Matched',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function MyErrands() {
  const { authHeader, API } = useAuth();
  const [errands, setErrands] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchErrands = useCallback(() => {
    axios.get(`${API}/my/errands`, { headers: authHeader })
      .then(res => setErrands(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [API, authHeader]);

  useEffect(() => { fetchErrands(); }, [fetchErrands]);

  return (
    <main className="pt-20 pb-28 md:pb-8 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 font-['Manrope'] tracking-tight">My Errands</h1>
            <p className="text-slate-500 mt-1">Errands you've posted</p>
          </div>
          <Link to="/post-errand" data-testid="my-errands-post-btn"
            className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20">
            <Plus className="w-4 h-4" /> Post New
          </Link>
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
        ) : errands.length === 0 ? (
          <div className="text-center py-20" data-testid="my-errands-empty">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900 font-['Manrope'] text-xl mb-2">No errands yet</h3>
            <p className="text-slate-500 mb-6">Post your first errand and get help from neighbors</p>
            <Link to="/post-errand"
              className="inline-flex rounded-full bg-emerald-600 px-6 py-3 text-white font-bold text-sm hover:bg-emerald-700 transition-all">
              Post an Errand
            </Link>
          </div>
        ) : (
          <div className="space-y-3" data-testid="my-errands-list">
            {errands.map(errand => (
              <Link key={errand.id} to={`/errands/${errand.id}`}
                data-testid={`my-errand-item-${errand.id}`}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-slate-900 font-['Manrope'] truncate">{errand.item_description}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${STATUS_COLORS[errand.status]}`}>
                      {STATUS_LABELS[errand.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                    <span>{errand.pickup_neighborhood} → {errand.delivery_neighborhood}</span>
                    <span className="font-bold text-emerald-600">${(errand.accepted_price || errand.offered_price).toFixed(2)}</span>
                    <span>{formatDistanceToNow(new Date(errand.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
