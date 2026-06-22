import { useEffect, useState } from 'react';
import { bookings, clients as clientsApi, invoices as invoicesApi } from '../../api';
import { useToast } from '../../components/Toast';
import { useNavigate } from 'react-router-dom';

const STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  Completed: 'bg-green-100 text-green-800 border-green-200',
  Cancelled: 'bg-red-100 text-red-800 border-red-200',
};
const HEARD_ABOUT_OPTIONS = ['Google', 'Instagram', 'Facebook', 'Nextdoor', 'Word of mouth', 'Driving by', 'Other'];

function fmt(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}
function smsBody(b) {
  return encodeURIComponent(
    `Hey ${b.client_name?.split(' ')[0] || 'there'}, just a reminder you have a detail scheduled for ${fmt(b.date)}${b.time ? ` at ${fmtTime(b.time)}` : ''}. See you then! – Relive Mobile Detailing`
  );
}

function Checklist({ bookingId }) {
  const [items, setItems] = useState(null);
  const toast = useToast();

  useEffect(() => {
    bookings.checklist(bookingId).then(setItems).catch(e => toast(e.message, 'error'));
  }, [bookingId]);

  async function toggle(item) {
    try {
      await bookings.checklistToggle(bookingId, item.id, !item.checked);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: i.checked ? 0 : 1 } : i));
    } catch (e) { toast(e.message, 'error'); }
  }

  if (!items) return <p className="text-xs text-navy/40">Loading checklist…</p>;

  const done = items.filter(i => i.checked).length;

  return (
    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Pre-Job Checklist</p>
        <span className="text-xs text-blue-500">{done}/{items.length} done</span>
      </div>
      <div className="space-y-1">
        {items.map(item => (
          <label key={item.id} className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" checked={!!item.checked} onChange={() => toggle(item)}
              className="accent-blue-600 cursor-pointer flex-shrink-0" />
            <span className={`text-xs ${item.checked ? 'line-through text-blue-400' : 'text-blue-800'}`}>{item.item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function Bookings() {
  const [list, setList] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [clientList, setClientList] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [expandedChecklist, setExpandedChecklist] = useState(null);
  const [form, setForm] = useState({
    client_id: '', date: '', time: '', status: 'Pending',
    service_type: '', add_ons: [], total_price: '', notes: '',
    vehicle_ids: [], heard_about: ''
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  async function load() {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      setList(await bookings.list(params));
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  useEffect(() => { load(); }, [filterStatus]);
  useEffect(() => { clientsApi.list().then(setClientList).catch(() => {}); }, []);

  async function handleClientChange(e) {
    const cid = e.target.value;
    setForm(f => ({ ...f, client_id: cid, vehicle_ids: [] }));
    if (cid) {
      try { setSelectedClient(await clientsApi.get(cid)); }
      catch { setSelectedClient(null); }
    } else {
      setSelectedClient(null);
    }
  }

  function resetForm() {
    setForm({ client_id: '', date: '', time: '', status: 'Pending', service_type: '', add_ons: [], total_price: '', notes: '', vehicle_ids: [], heard_about: '' });
    setSelectedClient(null);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.client_id || !form.date) return toast('Client and date are required', 'error');
    setSaving(true);
    try {
      const payload = { ...form, total_price: parseFloat(form.total_price) || 0 };
      if (editingId) {
        await bookings.update(editingId, payload);
        toast('Booking updated');
      } else {
        await bookings.create(payload);
        toast('Booking created');
      }
      setShowForm(false);
      resetForm();
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id, status, booking) {
    try {
      await bookings.update(id, { ...booking, status, add_ons: JSON.parse(booking.add_ons || '[]') });
      toast(`Marked ${status}`);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this booking?')) return;
    try {
      await bookings.remove(id);
      toast('Booking deleted');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleGenerateInvoice(b) {
    try {
      const addOns = JSON.parse(b.add_ons || '[]');
      const lineItems = [
        { description: b.service_type, amount: b.total_price },
        ...addOns.map(a => ({ description: a, amount: 0 }))
      ];
      await invoicesApi.create({
        booking_id: b.id, client_id: b.client_id,
        line_items: lineItems, subtotal: b.total_price, total: b.total_price
      });
      toast('Invoice created');
      navigate('/invoices');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  function startEdit(b) {
    setForm({
      client_id: String(b.client_id), date: b.date, time: b.time || '',
      status: b.status, service_type: b.service_type || '',
      add_ons: JSON.parse(b.add_ons || '[]'), total_price: String(b.total_price),
      notes: b.notes || '', vehicle_ids: b.vehicles?.map(v => v.id) || [],
      heard_about: b.heard_about || ''
    });
    setEditingId(b.id);
    clientsApi.get(b.client_id).then(setSelectedClient).catch(() => {});
    setShowForm(true);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-navy">Bookings</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-navy text-gold px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors">
          + New Booking
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${!filterStatus ? 'bg-navy text-gold border-navy' : 'border-navy/20 text-navy hover:bg-navy/5'}`}>
          All
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterStatus === s ? 'bg-navy text-gold border-navy' : 'border-navy/20 text-navy hover:bg-navy/5'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {list.length === 0 && <p className="text-navy/40 text-sm text-center py-12">No bookings found</p>}
        {list.map(b => (
          <div key={b.id} className="bg-white rounded-xl border border-navy/10 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-navy">{b.client_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[b.status] || ''}`}>{b.status}</span>
                </div>
                <p className="text-sm text-navy/70">{b.service_type}</p>
                {b.vehicle_names && <p className="text-xs text-navy/40 mt-0.5">{b.vehicle_names}</p>}
                {b.notes && <p className="text-xs text-navy/40 mt-1 italic">{b.notes}</p>}
                {b.heard_about && <p className="text-xs text-navy/30 mt-0.5">Found via: {b.heard_about}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-navy">{fmt(b.date)}{b.time ? ` · ${fmtTime(b.time)}` : ''}</p>
                <p className="text-gold font-semibold">${Number(b.total_price).toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-navy/5 flex items-center gap-2 flex-wrap">
              <select value={b.status} onChange={e => handleStatusChange(b.id, e.target.value, b)}
                className="text-xs border border-navy/20 rounded px-2 py-1 text-navy focus:outline-none">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>

              <button onClick={() => startEdit(b)}
                className="text-xs border border-navy/20 text-navy px-2 py-1 rounded hover:bg-navy/5 transition-colors">
                Edit
              </button>

              <button onClick={() => handleGenerateInvoice(b)}
                className="text-xs border border-gold/40 text-gold px-2 py-1 rounded hover:bg-gold/10 transition-colors">
                Invoice
              </button>

              {b.client_phone && (
                <a href={`sms:${b.client_phone.replace(/\D/g, '')}&body=${smsBody(b)}`}
                  className="text-xs border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                  Send Reminder
                </a>
              )}

              {b.status === 'Confirmed' && (
                <button onClick={() => setExpandedChecklist(expandedChecklist === b.id ? null : b.id)}
                  className="text-xs border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                  {expandedChecklist === b.id ? 'Hide' : 'Checklist'}
                </button>
              )}

              <button onClick={() => handleDelete(b.id)}
                className="text-xs border border-red-200 text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors ml-auto">
                Delete
              </button>
            </div>

            {expandedChecklist === b.id && <Checklist bookingId={b.id} />}
          </div>
        ))}
      </div>

      {/* Booking Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4">
            <h2 className="font-display text-xl font-semibold text-navy mb-4">
              {editingId ? 'Edit Booking' : 'New Booking'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Client *</label>
                <select value={form.client_id} onChange={handleClientChange}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60">
                  <option value="">Select client…</option>
                  {clientList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {selectedClient?.vehicles?.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Vehicles</label>
                  <div className="space-y-1">
                    {selectedClient.vehicles.map(v => (
                      <label key={v.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox"
                          checked={form.vehicle_ids.includes(v.id)}
                          onChange={e => setForm(f => ({
                            ...f, vehicle_ids: e.target.checked ? [...f.vehicle_ids, v.id] : f.vehicle_ids.filter(x => x !== v.id)
                          }))} />
                        {v.make} {v.model} ({v.size})
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Time</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Service</label>
                <input value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))}
                  placeholder="e.g. Full Detail Package"
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Price ($)</label>
                  <input type="number" step="0.01" value={form.total_price}
                    onChange={e => setForm(f => ({ ...f, total_price: e.target.value }))}
                    className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">How Did They Hear About You?</label>
                <select value={form.heard_about} onChange={e => setForm(f => ({ ...f, heard_about: e.target.value }))}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60">
                  <option value="">— Select —</option>
                  {HEARD_ABOUT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60 resize-none" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 border border-navy/20 text-navy py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-navy text-gold py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
