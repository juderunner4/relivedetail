import { useEffect, useState } from 'react';
import { mileage as api } from '../../api';
import { useToast } from '../../components/Toast';

const IRS_RATE = 0.70;

function today() { return new Date().toISOString().slice(0, 10); }
function fmt(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Mileage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear]   = useState(String(now.getFullYear()));
  const [list, setList]   = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm]   = useState({ date: today(), miles: '', from_address: '', to_address: '', notes: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const [items, sum] = await Promise.all([
        api.list({ month, year }),
        api.summary(),
      ]);
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
    const miles = parseFloat(form.miles);
    if (!miles || miles <= 0) return toast('Enter valid miles', 'error');
    try {
      if (editing) {
        await api.update(editing, { ...form, miles });
        toast('Trip updated');
        setEditing(null);
      } else {
        await api.create({ ...form, miles });
        toast('Trip logged');
      }
      setForm({ date: today(), miles: '', from_address: '', to_address: '', notes: '' });
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  function startEdit(item) {
    setEditing(item.id);
    setForm({ date: item.date, miles: String(item.miles), from_address: item.from_address || '', to_address: item.to_address || '', notes: item.notes || '' });
  }

  async function remove(id) {
    if (!confirm('Delete this trip?')) return;
    try {
      await api.remove(id);
      toast('Deleted');
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  const monthMiles = list.reduce((s, t) => s + t.miles, 0);
  const monthDeduction = monthMiles * IRS_RATE;

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const YEARS = ['2024','2025','2026','2027'];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-navy">Mileage Log</h1>
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-navy/10 p-4 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest mb-1">Month Miles</p>
          <p className="text-2xl font-bold text-navy">{monthMiles.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gold/20 p-4 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest mb-1">Month Deduction</p>
          <p className="text-2xl font-bold text-gold">${monthDeduction.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-navy/10 p-4 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest mb-1">Year Miles</p>
          <p className="text-2xl font-bold text-navy">{summary ? Number(summary.yearMiles).toFixed(1) : '…'}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-100 p-4 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest mb-1">Year Deduction</p>
          <p className="text-2xl font-bold text-green-600">${summary ? Number(summary.yearDeduction).toFixed(2) : '…'}</p>
        </div>
      </div>

      {/* IRS explainer */}
      <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex gap-3 items-start">
        <span className="text-xl">💡</span>
        <div>
          <p className="text-sm font-semibold text-navy mb-0.5">IRS Standard Mileage Rate: ${IRS_RATE.toFixed(2)}/mile ({new Date().getFullYear()})</p>
          <p className="text-xs text-navy/60">Log every mile you drive for jobs — pick-up, to client, back home. The total deduction reduces your taxable income at tax time.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
          <h2 className="font-display text-base font-semibold text-navy mb-4">
            {editing ? 'Edit Trip' : 'Log a Trip'}
          </h2>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
              </div>
              <div>
                <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">Miles</label>
                <input type="number" step="0.1" min="0" placeholder="0.0" value={form.miles}
                  onChange={e => setForm(f => ({ ...f, miles: e.target.value }))}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">From</label>
              <input placeholder="e.g. Home / 123 Main St" value={form.from_address}
                onChange={e => setForm(f => ({ ...f, from_address: e.target.value }))}
                className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">To</label>
              <input placeholder="e.g. Client address" value={form.to_address}
                onChange={e => setForm(f => ({ ...f, to_address: e.target.value }))}
                className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">Notes</label>
              <input placeholder="Client name, job type, etc." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            {form.miles && parseFloat(form.miles) > 0 && (
              <p className="text-xs text-gold font-medium">
                Deduction: {parseFloat(form.miles).toFixed(1)} mi × ${IRS_RATE} = ${(parseFloat(form.miles) * IRS_RATE).toFixed(2)}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit"
                className="flex-1 bg-navy text-gold py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors">
                {editing ? 'Save Changes' : 'Log Trip'}
              </button>
              {editing && (
                <button type="button" onClick={() => { setEditing(null); setForm({ date: today(), miles: '', from_address: '', to_address: '', notes: '' }); }}
                  className="px-4 py-2 border border-navy/20 rounded-lg text-sm text-navy/60 hover:bg-navy/5">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div>
          <h2 className="font-display text-base font-semibold text-navy mb-3">
            {MONTHS[parseInt(month)-1]} {year} Trips
          </h2>
          {loading ? (
            <p className="text-navy/40 text-sm">Loading…</p>
          ) : list.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-navy/20 p-6 text-center text-navy/40 text-sm">
              No trips logged this month
            </div>
          ) : (
            <div className="space-y-2">
              {list.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-navy/10 p-3 flex items-center gap-3 shadow-sm">
                  <span className="text-lg">🚗</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-navy text-sm">
                      {t.from_address && t.to_address ? `${t.from_address} → ${t.to_address}` : t.notes || 'Trip'}
                    </p>
                    <p className="text-xs text-navy/40">{fmt(t.date)}{t.notes && ` · ${t.notes}`}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-navy text-sm">{Number(t.miles).toFixed(1)} mi</p>
                    <p className="text-xs text-gold">${(t.miles * IRS_RATE).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(t)} className="text-xs text-navy/40 hover:text-navy px-1.5 py-0.5 border border-navy/10 rounded">Edit</button>
                    <button onClick={() => remove(t.id)} className="text-xs text-navy/40 hover:text-red-500 px-1.5 py-0.5 border border-navy/10 rounded">Del</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Monthly breakdown from summary */}
          {summary?.monthly?.length > 0 && (
            <div className="mt-4 bg-white rounded-xl border border-navy/10 p-4 shadow-sm">
              <p className="text-xs text-navy/40 uppercase tracking-widest mb-3">{year} Monthly</p>
              <div className="space-y-1.5">
                {summary.monthly.map(m => (
                  <div key={m.month} className="flex items-center gap-2 text-sm">
                    <span className="text-navy/50 w-8">{m.month}</span>
                    <div className="flex-1 h-1.5 bg-navy/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full"
                        style={{ width: `${Math.min(100, (m.miles / Math.max(...summary.monthly.map(x => x.miles))) * 100)}%` }} />
                    </div>
                    <span className="text-navy font-medium w-20 text-right">{Number(m.miles).toFixed(0)} mi</span>
                    <span className="text-gold w-14 text-right">${(m.miles * IRS_RATE).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
