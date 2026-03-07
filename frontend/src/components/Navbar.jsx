import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, Truck, User, PlusCircle, MapPin, ChevronDown, Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const navLinks = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/my-errands', icon: Package, label: 'My Errands' },
  { to: '/my-runs', icon: Truck, label: 'My Runs' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const NOTIF_ICONS = {
    new_offer: '💬', offer_accepted: '✅', offer_rejected: '❌',
    payment_confirmed: '💰', errand_delivered: '📦', new_message: '✉️', new_rating: '⭐',
  };

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      {/* Desktop Top Navbar */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 z-50" data-testid="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2" data-testid="navbar-logo">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 text-xl font-['Manrope'] hidden sm:block">ErrandGo</span>
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to}
                  data-testid={`navbar-link-${link.label.toLowerCase().replace(' ', '-')}`}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}>
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              <Link to="/post-errand" data-testid="navbar-post-errand-btn"
                className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 hover:-translate-y-0.5">
                <PlusCircle className="w-4 h-4" /> Post Errand
              </Link>

              {/* Notification Bell */}
              <Popover>
                <PopoverTrigger asChild>
                  <button data-testid="navbar-notification-bell" className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
                    <Bell className="w-5 h-5 text-slate-600" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0 shadow-xl border-slate-100" data-testid="notifications-dropdown">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 font-['Manrope'] text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.slice(0, 20).map(notif => (
                        <div key={notif.id}
                          onClick={() => { markRead(notif.id); if (notif.errand_id) navigate(`/errands/${notif.errand_id}`); }}
                          className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.is_read ? 'bg-emerald-50/50' : ''}`}
                          data-testid={`notification-item-${notif.id}`}>
                          <div className="flex gap-3 items-start">
                            <span className="text-lg flex-shrink-0">{NOTIF_ICONS[notif.type] || '🔔'}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${!notif.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.body}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            {!notif.is_read && <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="navbar-user-menu-btn"
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="hidden md:block text-slate-700 font-medium max-w-[100px] truncate">{user?.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-semibold text-slate-900 text-sm truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer mt-1">
                    <User className="w-4 h-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/my-errands')} className="cursor-pointer">
                    <Package className="w-4 h-4 mr-2" /> My Errands
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="navbar-logout-btn"
                    className="text-red-500 hover:text-red-600 cursor-pointer focus:text-red-600">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-50 safe-area-bottom">
        <div className="flex justify-around items-center py-2 px-2">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to}
              data-testid={`mobile-navbar-link-${link.label.toLowerCase().replace(' ', '-')}`}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                isActive(link.to) ? 'text-emerald-600' : 'text-slate-400'
              }`}>
              <link.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          ))}
          <Link to="/post-errand" data-testid="mobile-navbar-post-btn"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              isActive('/post-errand') ? 'text-emerald-600' : 'text-slate-400'
            }`}>
            <PlusCircle className="w-5 h-5" />
            <span className="text-[10px] font-medium">Post</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
