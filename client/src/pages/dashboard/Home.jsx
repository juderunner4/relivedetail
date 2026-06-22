import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bookings, revenue, expenses as expensesApi, todos as todosApi, settings as settingsApi } from '../../api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '../../components/Toast';

const STATUS_COLORS = {
  Pending:   'bg-yellow-100 text-yellow-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};
const STATUS_ORDER = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

function fmt(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function weatherIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}
function weatherDesc(code) {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mostly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  return 'Thunderstorm';
}

const REFERRAL_COLORS = ['#C9A454','#1B2A4A','#4A7ABF','#6B9E6B','#BF7A4A','#9E6B9E'];

const LINK_ICONS = {
  Instagram: '📷', Facebook: '👍', Google: '🔍', Website: '🌐',
  'Google Voice': '📞', Venmo: '💸', Zelle: '💸', PayPal: '💳',
};

export default function Home() {
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [data, setData] = useState(null);
  const [todayJobs, setTodayJobs] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [todoList, setTodoList] = useState([]);
  const [todoInput, setTodoInput] = useState('');
  const [siteSettings, setSiteSettings] = useState(null);
  const [weather, setWeather] = useState(null);
  const [referralData, setReferralData] = useState([]);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const thisMonth = today.slice(0, 7);
    const [year, month] = thisMonth.split('-');

    Promise.all([
      revenue.get(),
      bookings.list({ from: today, to: today }),
      bookings.list({ from: today, to: weekEnd }),
      expensesApi.list({ month, year }),
      todosApi.list(),
      settingsApi.get(),
      bookings.list({}),
    ]).then(([rev, todayB, weekB, exps, tds, sett, allB]) => {
      setData(rev);
      setTodayJobs(todayB);
      setUpcoming(weekB.filter(b => b.date !== today));
      setExpenseTotal(exps.reduce((s, e) => s + e.amount, 0));
      setTodoList(tds);
      setSiteSettings(sett);
      // Referral data
      const counts = {};
      allB.forEach(b => {
        if (b.heard_about) counts[b.heard_about] = (counts[b.heard_about] || 0) + 1;
      });
      setReferralData(Object.entries(counts).map(([name, value]) => ({ name, value })));
    }).catch(() => {});

    // Weather — Lynchburg, VA
    fetch('https://api.open-meteo.com/v1/forecast?latitude=37.4138&longitude=-79.1423&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=fahrenheit&windspeed_unit=mph')
      .then(r => r.json())
      .then(d => setWeather(d.current))
      .catch(() => {});
  }, []);

  async function cycleStatus(booking) {
    const idx = STATUS_ORDER.indexOf(booking.status);
    const next = STATUS_ORDER[(idx + 1) % (STATUS_ORDER.length - 1)]; // skip Cancelled
    try {
      await bookings.update(booking.id, { ...booking, add_ons: JSON.parse(booking.add_ons || '[]'), status: next });
      setTodayJobs(prev => prev.map(b => b.id === booking.id ? { ...b, status: next } : b));
    } catch (e) { toast(e.message, 'error'); }
  }

  async function addTodo(e) {
    e.preventDefault();
    if (!todoInput.trim()) return;
    try {
      const { id } = await todosApi.create({ text: todoInput.trim() });
      setTodoList(prev => [...prev, { id, text: todoInput.trim(), done: 0 }]);
      setTodoInput('');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function toggleTodo(todo) {
    try {
      await todosApi.update(todo.id, { done: !todo.done });
      setTodoList(prev => prev.map(t => t.id === todo.id ? { ...t, done: t.done ? 0 : 1 } : t));
    } catch (e) { toast(e.message, 'error'); }
  }

  async function deleteTodo(id) {
    try {
      await todosApi.remove(id);
      setTodoList(prev => prev.filter(t => t.id !== id));
    } catch (e) { toast(e.message, 'error'); }
  }

  const thisMonthRevenue = data ? Number(data.thisMonth) : 0;
  const profit = thisMonthRevenue - expenseTotal;
  const revGoal = siteSettings ? Number(siteSettings.monthly_revenue_goal || 0) : 0;
  const jobGoal = siteSettings ? Number(siteSettings.monthly_job_goal || 0) : 0;
  const jobCount = data ? Number(data.jobs_this_month || 0) : 0;
  const quickLinks = siteSettings?.quick_links
    ? (typeof siteSettings.quick_links === 'string' ? JSON.parse(siteSettings.quick_links) : siteSettings.quick_links)
    : [];

  const kanbanCols = ['Pending', 'Confirmed', 'Completed'];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-navy font-semibold">{fmt(today)}</h1>
          <p className="text-navy/50 text-sm">Relive Mobile Detailing</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/bookings')}
            className="bg-navy text-gold px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors">
            + Booking
          </button>
          <button onClick={() => navigate('/clients')}
            className="border border-navy/20 text-navy px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy/5 transition-colors">
            + Client
          </button>
        </div>
      </div>

      {/* Row 1: Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: data?.total_clients ?? '—' },
          { label: 'Revenue This Month', value: `$${thisMonthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          { label: 'Jobs This Month', value: data?.jobs_this_month ?? '—' },
          { label: 'Expenses This Month', value: `$${expenseTotal.toFixed(2)}`, sub: true },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl p-4 border shadow-sm ${s.sub ? 'border-red-100' : 'border-navy/10'}`}>
            <p className="text-xs text-navy/40 uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.sub ? 'text-red-500' : 'text-navy'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Row 2: Profit + Goals */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Profit card */}
        <div className={`bg-white rounded-xl p-5 border shadow-sm ${profit >= 0 ? 'border-green-100' : 'border-red-100'}`}>
          <p className="text-xs text-navy/40 uppercase tracking-widest mb-1">This Month Profit</p>
          <p className={`text-3xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            ${profit.toFixed(2)}
          </p>
          <p className="text-xs text-navy/40 mt-1">Revenue ${thisMonthRevenue.toFixed(2)} − Expenses ${expenseTotal.toFixed(2)}</p>
          <Link to="/expenses" className="text-xs text-gold hover:underline mt-2 inline-block">Log an expense →</Link>
        </div>

        {/* Goals */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-navy/10 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-navy/40 uppercase tracking-widest">Monthly Goals</p>
            <Link to="/settings" className="text-xs text-gold hover:underline">Edit goals →</Link>
          </div>
          <div className="space-y-3">
            {/* Revenue goal */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-navy/70">Revenue</span>
                <span className="font-semibold text-navy">${thisMonthRevenue.toFixed(0)} / ${revGoal.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-navy/10 rounded-full overflow-hidden">
                <div className="h-full bg-gold rounded-full transition-all duration-500"
                  style={{ width: revGoal ? `${Math.min(100, (thisMonthRevenue / revGoal) * 100)}%` : '0%' }} />
              </div>
            </div>
            {/* Job count goal */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-navy/70">Jobs</span>
                <span className="font-semibold text-navy">{jobCount} / {jobGoal}</span>
              </div>
              <div className="h-2 bg-navy/10 rounded-full overflow-hidden">
                <div className="h-full bg-navy rounded-full transition-all duration-500"
                  style={{ width: jobGoal ? `${Math.min(100, (jobCount / jobGoal) * 100)}%` : '0%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Kanban — Today's Jobs */}
      <div>
        <h2 className="font-display text-lg font-semibold text-navy mb-3">Today's Jobs</h2>
        {todayJobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-navy/10 p-6 text-center text-navy/40 text-sm">
            No jobs scheduled today
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {kanbanCols.map(col => (
              <div key={col}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                  col === 'Pending' ? 'text-yellow-600' : col === 'Confirmed' ? 'text-blue-600' : 'text-green-600'
                }`}>{col}</p>
                <div className="space-y-2 min-h-[60px]">
                  {todayJobs.filter(b => b.status === col).map(b => (
                    <div key={b.id} className="bg-white rounded-xl border border-navy/10 p-3 shadow-sm">
                      <p className="font-medium text-navy text-sm">{b.client_name}</p>
                      <p className="text-xs text-navy/50 truncate">{b.service_type}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-semibold text-gold">${b.total_price}</span>
                        {b.time && <span className="text-xs text-navy/40">{fmtTime(b.time)}</span>}
                      </div>
                      {col !== 'Completed' && (
                        <button onClick={() => cycleStatus(b)}
                          className="mt-2 text-[11px] text-navy/50 hover:text-navy border border-navy/15 hover:border-navy/30 px-2 py-0.5 rounded transition-colors w-full">
                          Mark {STATUS_ORDER[STATUS_ORDER.indexOf(col) + 1]} →
                        </button>
                      )}
                      {b.client_phone && (
                        <a href={`sms:${b.client_phone.replace(/\D/g,'')}&body=Hey ${b.client_name?.split(' ')[0]}, just a reminder you have a detail scheduled today at ${fmtTime(b.time)}. See you then!`}
                          className="mt-1 text-[11px] text-gold hover:underline block text-center">
                          Send reminder
                        </a>
                      )}
                    </div>
                  ))}
                  {todayJobs.filter(b => b.status === col).length === 0 && (
                    <div className="border border-dashed border-navy/10 rounded-xl h-12 flex items-center justify-center">
                      <span className="text-xs text-navy/20">—</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 4: 3-column widgets */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Weather */}
        <div className="bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest mb-3">Lynchburg Weather</p>
          {weather ? (
            <div className="flex items-center gap-4">
              <span className="text-4xl">{weatherIcon(weather.weathercode)}</span>
              <div>
                <p className="text-3xl font-bold text-navy">{Math.round(weather.temperature_2m)}°F</p>
                <p className="text-sm text-navy/60">{weatherDesc(weather.weathercode)}</p>
                <p className="text-xs text-navy/40 mt-0.5">Wind {Math.round(weather.windspeed_10m)} mph</p>
              </div>
            </div>
          ) : (
            <p className="text-navy/40 text-sm">Loading…</p>
          )}
        </div>

        {/* To-do list */}
        <div className="bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest mb-3">To-Do</p>
          <form onSubmit={addTodo} className="flex gap-2 mb-3">
            <input value={todoInput} onChange={e => setTodoInput(e.target.value)}
              placeholder="Add a task…"
              className="flex-1 border border-navy/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gold/60" />
            <button type="submit" className="bg-navy text-gold px-3 py-1.5 rounded-lg text-sm font-medium">+</button>
          </form>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {todoList.length === 0 && <p className="text-xs text-navy/30 text-center py-2">Nothing yet</p>}
            {todoList.map(t => (
              <div key={t.id} className="flex items-center gap-2 group">
                <input type="checkbox" checked={!!t.done} onChange={() => toggleTodo(t)}
                  className="accent-gold cursor-pointer flex-shrink-0" />
                <span className={`text-sm flex-1 ${t.done ? 'line-through text-navy/30' : 'text-navy'}`}>{t.text}</span>
                <button onClick={() => deleteTodo(t.id)}
                  className="text-navy/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-navy/40 uppercase tracking-widest">Quick Links</p>
            <Link to="/settings" className="text-xs text-gold hover:underline">Edit</Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-navy hover:text-gold hover:bg-gold/5 border border-navy/10 rounded-lg px-3 py-2 transition-colors truncate">
                <span>{LINK_ICONS[link.label] || '🔗'}</span>
                <span className="truncate">{link.label}</span>
              </a>
            ))}
            {quickLinks.length === 0 && (
              <Link to="/settings" className="col-span-2 text-xs text-center text-gold hover:underline py-2">
                Add links in Settings →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Row 5: Upcoming + Referral */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Next 7 days */}
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
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || ''}`}>{b.status}</span>
                    {b.client_phone && (
                      <a href={`sms:${b.client_phone.replace(/\D/g,'')}&body=Hey ${b.client_name?.split(' ')[0]}, reminder: detail on ${fmt(b.date)}${b.time ? ` at ${fmtTime(b.time)}` : ''}. See you then!`}
                        className="text-[10px] text-gold hover:underline">remind</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referral sources */}
        <div>
          <h2 className="font-display text-lg font-semibold text-navy mb-3">Where Clients Come From</h2>
          <div className="bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
            {referralData.length === 0 ? (
              <p className="text-navy/40 text-sm text-center py-4">
                No referral data yet. Add a "Heard about us" field when creating bookings.
              </p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={referralData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={2}>
                      {referralData.map((_, i) => <Cell key={i} fill={REFERRAL_COLORS[i % REFERRAL_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'clients']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {referralData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: REFERRAL_COLORS[i % REFERRAL_COLORS.length] }} />
                      <span className="text-navy/70">{d.name}</span>
                      <span className="font-semibold text-navy ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
