import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Clock, Package, ChevronRight, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS = {
  open: 'bg-blue-50 text-blue-700 border-blue-100',
  matched: 'bg-amber-50 text-amber-700 border-amber-100',
  in_progress: 'bg-purple-50 text-purple-700 border-purple-100',
  completed: 'bg-green-50 text-green-700 border-green-100',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_LABELS = {
  open: 'Open',
  matched: 'Matched',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function ErrandCard({ errand }) {
  const timeAgo = formatDistanceToNow(new Date(errand.created_at), { addSuffix: true });
  return (
    <Link to={`/errands/${errand.id}`} data-testid={`errand-card-${errand.id}`}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 p-6 block">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <Package className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${STATUS_COLORS[errand.status]}`}>
            {STATUS_LABELS[errand.status]}
          </span>
          <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full text-sm border border-emerald-100">
            ${errand.offered_price.toFixed(2)}
          </span>
        </div>
      </div>
      <h3 className="font-bold text-slate-900 text-lg font-['Manrope'] mb-3 line-clamp-1">
        {errand.item_description}
      </h3>
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-emerald-600">P</span>
          </div>
          <span className="truncate">{errand.pickup_neighborhood}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-2.5 h-2.5 text-amber-600" />
          </div>
          <span className="truncate">{errand.delivery_neighborhood}</span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
            {errand.poster_name?.[0]?.toUpperCase()}
          </div>
          <span className="text-xs text-slate-500">{errand.poster_name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { authHeader, API, user } = useAuth();
  const [errands, setErrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterNeighborhood, setFilterNeighborhood] = useState('');

  const fetchErrands = async () => {
    setLoading(true);
    try {
      const params = { status: 'open' };
      if (filterNeighborhood) params.pickup = filterNeighborhood;
      const res = await axios.get(`${API}/errands`, { headers: authHeader, params });
      setErrands(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchErrands(); }, [filterNeighborhood]);

  const filtered = errands.filter(e =>
    !search || e.item_description.toLowerCase().includes(search.toLowerCase()) ||
    e.pickup_neighborhood.toLowerCase().includes(search.toLowerCase()) ||
    e.delivery_neighborhood.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="pt-20 pb-28 md:pb-8 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="py-8">
          <p className="text-slate-500 text-sm mb-1">Good day,</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 font-['Manrope'] tracking-tight">
            {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1">Find errands near {user?.neighborhood}</p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              data-testid="dashboard-search-input"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400"
              placeholder="Search errands..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              data-testid="dashboard-neighborhood-filter"
              className="pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400 min-w-[180px]"
              placeholder="Filter by pickup area"
              value={filterNeighborhood}
              onChange={e => setFilterNeighborhood(e.target.value)}
            />
          </div>
          <button onClick={fetchErrands} data-testid="dashboard-refresh-btn"
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:block">Refresh</span>
          </button>
        </div>

        {/* Quick Action */}
        <div className="mb-8 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-lg font-['Manrope']">Need something picked up?</p>
            <p className="text-emerald-100 text-sm mt-0.5">Post your errand and neighbors will offer to help</p>
          </div>
          <Link to="/post-errand" data-testid="dashboard-post-errand-btn"
            className="flex items-center gap-2 bg-white text-emerald-700 rounded-full px-5 py-2.5 text-sm font-bold hover:bg-emerald-50 transition-colors flex-shrink-0">
            Post Errand <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Errands Grid */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-900 font-['Manrope'] text-lg">
            Open Errands {filtered.length > 0 && <span className="text-slate-400 font-normal text-base">({filtered.length})</span>}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100" />
                  <div className="w-16 h-6 rounded-full bg-slate-100" />
                </div>
                <div className="h-5 bg-slate-100 rounded mb-3 w-3/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" data-testid="dashboard-empty-state">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900 font-['Manrope'] text-xl mb-2">No errands found</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              {filterNeighborhood ? `No open errands from "${filterNeighborhood}" right now.` : "No open errands yet. Be the first to post one!"}
            </p>
            <Link to="/post-errand"
              className="inline-flex rounded-full bg-emerald-600 px-6 py-3 text-white font-bold text-sm hover:bg-emerald-700 transition-all">
              Post the first errand
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="errands-grid">
            {filtered.map(errand => (
              <ErrandCard key={errand.id} errand={errand} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
