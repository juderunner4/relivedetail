import { useEffect, useState } from 'react';
import { expenses as api } from '../../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useToast } from '../../components/Toast';

const CATEGORIES = ['Supplies', 'Gas', 'Equipment', 'Marketing', 'Other'];
const CAT_COLORS = { Supplies: '#C9A454', Gas: '#1B2A4A', Equipment: '#4A7ABF', Marketing: '#6B9E6B', Other: '#9E6B9E' };

function today() {
  return new Date().toISOString().slice(0, 10);
}
function fmt(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Expenses() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear]   = useState(String(now.getFullYear()));
  const [list, setList]   = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm]   = useState({ date: today(), category: 'Supplies', amount: '', description: '', notes: '' });
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
    if (!form.amount || isNaN(parseFloat(form.amount))) return toast('Enter a valid amount', 'error');
    try {
      if (editing) {
        await api.update(editing, { ...form, amount: parseFloat(form.amount) });
        toast('Expense updated');
        setEditing(null);
      } else {
        await api.create({ ...form, amount: parseFloat(form.amount) });
        toast('Expense added');
      }
      setForm({ date: today(), category: 'Supplies', amount: '', description: '', notes: '' });
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  function startEdit(item) {
    setEditing(item.id);
    setForm({ date: item.date, category: item.category, amount: String(item.amount), description: item.description || '', notes: item.notes || '' });
  }

  async function remove(id) {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.remove(id);
      toast('Deleted');
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  const monthTotal = list.reduce((s, e) => s + e.amount, 0);
  const catData = CATEGORIES.map(c => ({ name: c, amount: list.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0) })).filter(c => c.amount > 0);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const YEARS = ['2024','2025','2026','2027'];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-navy">Expenses</h1>
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

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-navy/10 p-4 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest mb-1">This Month</p>
          <p className="text-2xl font-bold text-red-500">${monthTotal.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-navy/10 p-4 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest mb-1">Year Total</p>
          <p className="text-2xl font-bold text-navy">${summary ? Number(summary.yearTotal).toFixed(2) : '…'}</p>
        </div>
        <div className="bg-white rounded-xl border border-navy/10 p-4 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest mb-1">Transactions</p>
          <p className="text-2xl font-bold text-navy">{list.length}</p>
        </div>
      </div>

      {/* Chart */}
      {catData.length > 0 && (
        <div className="bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
          <p className="text-sm font-medium text-navy/60 mb-3">By Category</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={catData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => [`$${Number(v).toFixed(2)}`, 'Amount']} />
              <Bar dataKey="amount" radius={[4,4,0,0]}>
                {catData.map((entry) => <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#C9A454'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Add / Edit form */}
        <div className="bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
          <h2 className="font-display text-base font-semibold text-navy mb-4">
            {editing ? 'Edit Expense' : 'Log Expense'}
          </h2>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
              </div>
              <div>
                <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">Amount ($)</label>
              <input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">Description</label>
              <input placeholder="e.g. Microfiber towels" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="block text-xs text-navy/50 uppercase tracking-widest mb-1">Notes</label>
              <input placeholder="Optional" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div className="flex gap-2">
              <button type="submit"
                className="flex-1 bg-navy text-gold py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors">
                {editing ? 'Save Changes' : 'Add Expense'}
              </button>
              {editing && (
                <button type="button" onClick={() => { setEditing(null); setForm({ date: today(), category: 'Supplies', amount: '', description: '', notes: '' }); }}
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
            {MONTHS[parseInt(month)-1]} {year} Expenses
          </h2>
          {loading ? (
            <p className="text-navy/40 text-sm">Loading…</p>
          ) : list.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-navy/20 p-6 text-center text-navy/40 text-sm">
              No expenses logged this month
            </div>
          ) : (
            <div className="space-y-2">
              {list.map(e => (
                <div key={e.id} className="bg-white rounded-xl border border-navy/10 p-3 flex items-center gap-3 shadow-sm">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[e.category] || '#C9A454' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-navy text-sm truncate">{e.description || e.category}</p>
                    <p className="text-xs text-navy/40">{e.category} · {fmt(e.date)}</p>
                  </div>
                  <span className="font-semibold text-red-500 text-sm">${Number(e.amount).toFixed(2)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(e)} className="text-xs text-navy/40 hover:text-navy px-1.5 py-0.5 border border-navy/10 rounded">Edit</button>
                    <button onClick={() => remove(e.id)} className="text-xs text-navy/40 hover:text-red-500 px-1.5 py-0.5 border border-navy/10 rounded">Del</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Year by category breakdown */}
      {summary?.byCategory && (
        <div className="bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
          <h2 className="font-display text-base font-semibold text-navy mb-4">{year} Year Summary</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {CATEGORIES.map(c => {
              const amt = summary.byCategory[c] || 0;
              return (
                <div key={c} className="text-center p-3 bg-cream/50 rounded-lg">
                  <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: CAT_COLORS[c] }} />
                  <p className="text-xs text-navy/50 mb-0.5">{c}</p>
                  <p className="font-semibold text-navy text-sm">${Number(amt).toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
