import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth } from '../api';

const NAV = [
  { to: '/',         label: 'Home',     icon: '⌂',  end: true },
  { to: '/clients',  label: 'Clients',  icon: '👤' },
  { to: '/bookings', label: 'Bookings', icon: '📅' },
  { to: '/invoices', label: 'Invoices', icon: '📄' },
  { to: '/plans',    label: 'Plans',    icon: '♻' },
  { to: '/revenue',  label: 'Revenue',  icon: '💰' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Layout() {
  const navigate = useNavigate();

  function handleLogout() {
    auth.logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-navy text-cream flex flex-col">
        <div className="p-5 border-b border-white/10">
          <span className="font-display text-gold text-lg font-semibold tracking-tight leading-tight">
            Relive<br />
            <span className="text-xs text-cream/60 font-sans font-normal tracking-widest uppercase">Mobile Detailing</span>
          </span>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
          {NAV.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors
                 ${isActive
                   ? 'bg-gold/20 text-gold border-r-2 border-gold'
                   : 'text-cream/70 hover:text-cream hover:bg-white/5'
                 }`
              }
            >
              <span className="w-5 text-center text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-cream/40 hover:text-cream/70 transition-colors px-1"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-cream">
        <Outlet />
      </main>
    </div>
  );
}
