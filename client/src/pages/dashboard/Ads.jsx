import { useEffect, useState } from 'react';
import { adspend as api } from '../../api';
import { useToast } from '../../components/Toast';

const PLATFORMS = ['Instagram/Facebook', 'Google', 'Nextdoor', 'Other'];

const PLATFORM_GUIDES = [
  {
    name: 'Instagram & Facebook',
    icon: '📷',
    color: 'from-purple-500 to-pink-500',
    howItWorks: 'You create an ad with a photo or video of your work + a call to action (like "Book Now"). Meta shows it to people nearby who match your target (homeowners, car owners, nearby zip codes). You only pay when someone sees or clicks it.',
    bestFor: 'Before/after photos, showing off your work, building local brand recognition.',
    estimatedCost: '$5–$15/day is plenty to start for Lynchburg. Facebook tends to be cheaper per click.',
    tipText: 'Use a clean before/after photo. The "before" catches attention, the "after" closes the sale.',
    setupUrl: 'https://www.facebook.com/adsmanager',
    setupLabel: 'Open Facebook Ads Manager',
  },
  {
    name: 'Google Ads',
    icon: '🔍',
    color: 'from-blue-500 to-green-500',
    howItWorks: 'Your ad shows up at the top of Google when someone searches "mobile detailing Lynchburg" or "car detailing near me." You pay per click — only when someone actually taps your ad.',
    bestFor: 'Capturing people who are actively searching right now. Highest intent of any platform.',
    estimatedCost: '$10–$20/day. Keywords like "car detailing Lynchburg" cost $2–$6 per click.',
    tipText: 'Start with exact keywords like "mobile car detailing Lynchburg VA" — don\'t use broad match until you know what\'s working.',
    setupUrl: 'https://ads.google.com',
    setupLabel: 'Open Google Ads',
  },
  {
    name: 'Nextdoor',
    icon: '🏘️',
    color: 'from-green-500 to-teal-500',
    howItWorks: 'Nextdoor is a neighborhood app where locals talk about local services. You can post as a business or run "Local Deal" ads that show up in the neighborhood feed. Very trusted because it\'s local.',
    bestFor: 'Building word-of-mouth in specific neighborhoods. Great for the "I was just talking to my neighbor about detailing" effect.',
    estimatedCost: 'Business page is free. Local Deal ads start around $25 for a 2-week run.',
    tipText: 'Post your work (before/after) as a free neighborhood post first. If neighbors react well, then consider paid promotion.',
    setupUrl: 'https://business.nextdoor.com',
    setupLabel: 'Set up on Nextdoor',
  },
];

function today() { return new Date().toISOString().slice(0, 10); }
function fmt(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Ads() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear]   = useState(String(now.getFullYear()));
  const [list, setList]   = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm]   = useState({ date: today(), platform: 'Instagram/Facebook', amount: '', notes: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const [items, sum] = await Promise.all([api.list({ month, year }), api.summary()]);
      setList(items);
      setSummary(sum);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [month, year]);

  async function submit(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return toast('Enter a valid amount', 'error');
    try {
      if (editing) {
        await api.update(editing, { ...form, amount });
        toast('Updated');
        setEditing(null);
      } else {
        await api.create({ ...form, amount });
        toast('Spend logged');
      }
      setForm({ date: today(), platform: 'Instagram/Facebook', amount: '', notes: '' });
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  function startEdit(item) {
    setEditing(item.id);
    setForm({ date: item.date, platform: item.platform, amount: String(item.amount), notes: item.notes || '' });
  }

  async function remove(id) {
    if (!confirm('Delete this entry?')) return;
    try {
      await api.remove(id);
      toast('Deleted');
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  const monthTotal = list.reduce((s, e) => s + e.amount, 0);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const YEARS = ['2024','2025','2026','2027'];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Ads</h1>
          <p className="text-navy/50 text-sm">Platform guide + spend tracker</p>
        </div>
      </div>

      {/* Platform guides */}
      <section>
        <h2 className="font-display text-lg font-semibold text-navy mb-4">Where to Run Ads</h2>
        <div className="space-y-4">
          {PLATFORM_GUIDES.map(p => (
            <div key={p.name} className="bg-white rounded-xl border border-navy/10 shadow-sm overflow-hidden">
              <div className={`bg-gradient-to-r ${p.color} p-4 flex items-center gap-3`}>
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <h3 className="font-semibold text-white text-base">{p.name}</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-navy/40 uppercase tracking-widest font-semibold mb-1">How It Works</p>
                  <p className="text-sm text-navy/80">{p.howItWorks}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-navy/40 uppercase tracking-widest font-semibold mb-1">Best For</p>
                    <p className="text-sm text-navy/70">{p.bestFor}</p>
                  </div>
                  <div>
                    <p className="text-xs text-navy/40 uppercase tracking-widest font-semibold mb-1">Estimated Cost</p>
                    <p className="text-sm text-navy/70">{p.estimatedCost}</p>
                  </div>
                </div>
                <div className="bg-gold/10 border border-gold/20 rounded-lg p-3 flex gap-2">
                  <span className="text-sm">💡</span>
                  <p className="text-sm text-navy/80">{p.tipText}</p>
                </div>
                <a href={p.setupUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-gold hover:underline font-medium">
                  {p.setupLabel} →
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spend tracker */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-navy">Spend Tracker</h2>
          <div className="flex gap-2">
            <select value={month} onChange={e => setMonth(e.target.value)}
              className="border border-navy/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
              {MONTHS.map((m, i) => <option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(e.target.value)}
              className="border border-navy/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
              {YEARS.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-navy/10 p-4 shadow-sm">
            <p className="text-xs text-navy/40 uppercase tracking-widest mb-1">Month Spend</p>
            <p className="text-2xl font-bold text-navy">${monthTotal.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-navy/10 p-4 shadow-sm">
            <p className="text-xs text-navy/40 uppercase tracking-widest mb-1">Year Spend</p>
            <p className="text-2xl font-bold text-navy">${summary ? Number(summary.yearTotal).toFixed(2) : '…'}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
            <h3 className="font-display text-base font-semibold text-navy mb-3">{editing ? 'Edit Entry' : 'Log Ad Spend'}</h3>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
                </div>
                <div>
                  <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">Amount ($)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">Platform</label>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60">
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">Notes</label>
                <input placeholder="Campaign details, results, etc." value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
              </div>
              <div className="flex gap-2">
                <button type="submit"
                  className="flex-1 bg-navy text-gold py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors">
                  {editing ? 'Save' : 'Log Spend'}
                </button>
                {editing && (
                  <button type="button" onClick={() => { setEditing(null); setForm({ date: today(), platform: 'Instagram/Facebook', amount: '', notes: '' }); }}
                    className="px-4 py-2 border border-navy/20 rounded-lg text-sm text-navy/60 hover:bg-navy/5">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div>
            <h3 className="font-display text-base font-semibold text-navy mb-3">{MONTHS[parseInt(month)-1]} {year}</h3>
            {loading ? (
              <p className="text-navy/40 text-sm">Loading…</p>
            ) : list.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-navy/20 p-6 text-center text-navy/40 text-sm">
                No ad spend logged yet
              </div>
            ) : (
              <div className="space-y-2">
                {list.map(e => (
                  <div key={e.id} className="bg-white rounded-xl border border-navy/10 p-3 flex items-center gap-3 shadow-sm">
                    <span className="text-base">
                      {e.platform.includes('Instagram') ? '📷' : e.platform === 'Google' ? '🔍' : e.platform === 'Nextdoor' ? '🏘️' : '📣'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-navy text-sm">{e.platform}</p>
                      <p className="text-xs text-navy/40">{fmt(e.date)}{e.notes ? ` · ${e.notes}` : ''}</p>
                    </div>
                    <span className="font-semibold text-navy text-sm">${Number(e.amount).toFixed(2)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(e)} className="text-xs text-navy/40 hover:text-navy px-1.5 py-0.5 border border-navy/10 rounded">Edit</button>
                      <button onClick={() => remove(e.id)} className="text-xs text-navy/40 hover:text-red-500 px-1.5 py-0.5 border border-navy/10 rounded">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Platform breakdown */}
            {summary?.byPlatform && Object.keys(summary.byPlatform).length > 0 && (
              <div className="mt-3 bg-white rounded-xl border border-navy/10 p-4 shadow-sm">
                <p className="text-xs text-navy/40 uppercase tracking-widest mb-2">{year} By Platform</p>
                {Object.entries(summary.byPlatform).map(([platform, amt]) => (
                  <div key={platform} className="flex justify-between text-sm py-1 border-b border-navy/5 last:border-0">
                    <span className="text-navy/70">{platform}</span>
                    <span className="font-semibold text-navy">${Number(amt).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
