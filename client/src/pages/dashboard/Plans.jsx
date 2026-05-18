import { useEffect, useState } from 'react';
import { plans as plansApi, clients as clientsApi } from '../../api';
import { useToast } from '../../components/Toast';
import { useNavigate } from 'react-router-dom';

const TIERS = {
  Essential: { freq: 8, price: 110 },
  Classic:   { freq: 6, price: 140 },
  Signature: { freq: 4, price: 160 },
};

function planStatus(next) {
  if (!next) return 'unknown';
  const days = Math.ceil((new Date(next) - new Date()) / 86400000);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'due-soon';
  return 'on-track';
}

const STATUS_UI = {
  'on-track':  { label: 'On Track',  cls: 'bg-green-100 text-green-800 border-green-200' },
  'due-soon':  { label: 'Due Soon',  cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'overdue':   { label: 'Overdue',   cls: 'bg-red-100 text-red-800 border-red-200' },
  'unknown':   { label: 'No Date',   cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Plans() {
  const [list, setList] = useState([]);
  const [clientList, setClientList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    client_id: '', plan_tier: 'Essential', start_date: '', last_service_date: '', next_service_date: ''
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  async function load() {
    try { setList(await plansApi.list()); } catch (e) { toast(e.message, 'error'); }
  }

  useEffect(() => {
    load();
    clientsApi.list().then(setClientList).catch(() => {});
  }, []);

  function handleTierChange(tier) {
    const t = TIERS[tier];
    setForm(f => ({ ...f, plan_tier: tier, frequency_weeks: t.freq, price_per_visit: t.price }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.client_id) return toast('Select a client', 'error');
    const t = TIERS[form.plan_tier];
    setSaving(true);
    try {
      await plansApi.create({ ...form, frequency_weeks: t.freq, price_per_visit: t.price });
      toast('Plan created');
      setShowForm(false);
      setForm({ client_id: '', plan_tier: 'Essential', start_date: '', last_service_date: '', next_service_date: '' });
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this plan?')) return;
    try {
      await plansApi.remove(id);
      toast('Plan deactivated');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-navy">Maintenance Plans</h1>
        <button onClick={() => setShowForm(true)}
          className="bg-navy text-gold px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors">
          + Enroll Client
        </button>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl border border-navy/10 p-12 text-center text-navy/40 text-sm">
          No active maintenance plans
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(p => {
            const st = planStatus(p.next_service_date);
            const ui = STATUS_UI[st];
            return (
              <div key={p.id} className="bg-white rounded-xl border border-navy/10 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-navy">{p.client_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${ui.cls}`}>{ui.label}</span>
                    </div>
                    <p className="text-sm text-navy/60">
                      {p.plan_tier} Plan · every {p.frequency_weeks} weeks · ${p.price_per_visit}/visit
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-navy/40">
                      <span>Last: {fmt(p.last_service_date)}</span>
                      <span>Next: {fmt(p.next_service_date)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => navigate(`/bookings`)}
                      className="text-xs border border-gold/40 text-gold px-3 py-1.5 rounded hover:bg-gold/10 transition-colors">
                      Schedule Next
                    </button>
                    <button onClick={() => handleDeactivate(p.id)}
                      className="text-xs border border-red-200 text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                      Deactivate
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tier info cards */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        {Object.entries(TIERS).map(([tier, { freq, price }]) => (
          <div key={tier} className="bg-white rounded-xl border border-navy/10 p-4 shadow-sm text-center">
            <p className="font-display text-lg font-semibold text-navy">{tier}</p>
            <p className="text-gold text-2xl font-bold mt-1">${price}<span className="text-sm font-normal text-navy/40">/visit</span></p>
            <p className="text-xs text-navy/50 mt-1">Every {freq} weeks</p>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-display text-xl font-semibold text-navy mb-4">Enroll in Plan</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Client *</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60">
                  <option value="">Select client…</option>
                  {clientList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Plan Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(TIERS).map(tier => (
                    <button key={tier} type="button" onClick={() => handleTierChange(tier)}
                      className={`py-2 rounded-lg text-sm border transition-colors ${
                        form.plan_tier === tier ? 'bg-navy text-gold border-navy' : 'border-navy/20 text-navy hover:bg-navy/5'
                      }`}>
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
              {[
                { key: 'start_date', label: 'Start Date' },
                { key: 'last_service_date', label: 'Last Service Date' },
                { key: 'next_service_date', label: 'Next Service Date' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">{f.label}</label>
                  <input type="date" value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                    className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-navy/20 text-navy py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-navy text-gold py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Enrolling…' : 'Enroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
