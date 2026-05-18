import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bookings, revenue } from '../../api';

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export default function Home() {
  const [data, setData] = useState(null);
  const [todayJobs, setTodayJobs] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const navigate = useNavigate();

  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  useEffect(() => {
    revenue.get().then(setData).catch(() => {});
    bookings.list({ from: today, to: today }).then(setTodayJobs).catch(() => {});
    bookings.list({ from: today, to: weekEnd }).then(rows => setUpcoming(rows.filter(b => b.date !== today))).catch(() => {});
  }, []);

  const stats = data ? [
    { label: 'Total Clients', value: data.total_clients },
    { label: 'This Month Revenue', value: `$${Number(data.thisMonth).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
    { label: 'Jobs This Month', value: data.jobs_this_month },
    { label: 'Bookings This Month', value: data.bookings_this_month },
  ] : [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-navy font-semibold">{fmt(today)}</h1>
          <p className="text-navy/50 text-sm">Relive Mobile Detailing</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/bookings')}
            className="bg-navy text-gold px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors">
            New Booking
          </button>
          <button onClick={() => navigate('/clients')}
            className="border border-navy/20 text-navy px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy/5 transition-colors">
            New Client
          </button>
          <button onClick={() => navigate('/invoices')}
            className="border border-navy/20 text-navy px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy/5 transition-colors">
            Create Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-navy/10 shadow-sm">
            <p className="text-xs text-navy/40 uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-navy">{s.value ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Jobs */}
        <div>
          <h2 className="font-display text-lg font-semibold text-navy mb-3">Today's Jobs</h2>
          {todayJobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-navy/10 p-6 text-center text-navy/40 text-sm">
              No jobs scheduled today
            </div>
          ) : (
            <div className="space-y-3">
              {todayJobs.map(b => (
                <Link to={`/bookings`} key={b.id}
                  className="block bg-white rounded-xl border border-navy/10 p-4 hover:border-gold/40 transition-colors shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-navy">{b.client_name}</p>
                      <p className="text-sm text-navy/60">{b.service_type}</p>
                      {b.vehicle_names && <p className="text-xs text-navy/40 mt-0.5">{b.vehicle_names}</p>}
                      {b.notes && <p className="text-xs text-navy/40 mt-1 italic truncate max-w-xs">{b.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || ''}`}>
                        {b.status}
                      </span>
                      {b.time && <p className="text-sm font-semibold text-gold mt-1">{fmtTime(b.time)}</p>}
                      <p className="text-sm font-semibold text-navy">${b.total_price}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div>
          <h2 className="font-display text-lg font-semibold text-navy mb-3">Next 7 Days</h2>
          {upcoming.length === 0 ? (
            <div className="bg-white rounded-xl border border-navy/10 p-6 text-center text-navy/40 text-sm">
              No upcoming bookings
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-navy/10 p-3 flex items-center gap-3 shadow-sm">
                  <div className="text-center min-w-[40px]">
                    <p className="text-xs text-navy/40">{new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</p>
                    <p className="text-lg font-bold text-navy leading-none">{new Date(b.date + 'T00:00:00').getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-navy text-sm truncate">{b.client_name}</p>
                    <p className="text-xs text-navy/50 truncate">{b.service_type}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[b.status] || ''}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
