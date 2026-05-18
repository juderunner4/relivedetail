import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clients } from '../../api';
import { useToast } from '../../components/Toast';

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [showVehicle, setShowVehicle] = useState(false);
  const [vForm, setVForm] = useState({ make: '', model: '', year: '', size: 'sedan', color: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  async function load() {
    try {
      const data = await clients.get(id);
      setClient(data);
      setForm({ name: data.name, phone: data.phone, email: data.email, address: data.address, notes: data.notes });
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await clients.update(id, form);
      toast('Client updated');
      setEditing(false);
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${client.name}? This cannot be undone.`)) return;
    try {
      await clients.remove(id);
      toast('Client deleted');
      navigate('/clients');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleAddVehicle(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await clients.addVehicle(id, vForm);
      toast('Vehicle added');
      setShowVehicle(false);
      setVForm({ make: '', model: '', year: '', size: 'sedan', color: '', notes: '' });
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveVehicle(vid) {
    if (!confirm('Remove this vehicle?')) return;
    try {
      await clients.removeVehicle(id, vid);
      toast('Vehicle removed');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  if (!client) return <div className="p-6 text-navy/40">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/clients')} className="text-sm text-navy/40 hover:text-navy mb-4 flex items-center gap-1">
        ← Back to Clients
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">{client.name}</h1>
          <p className="text-navy/50 text-sm">{client.phone} {client.email ? `· ${client.email}` : ''}</p>
          {client.address && <p className="text-navy/40 text-sm">{client.address}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)}
            className="border border-navy/20 text-navy px-3 py-1.5 rounded-lg text-sm hover:bg-navy/5 transition-colors">
            Edit
          </button>
          <button onClick={handleDelete}
            className="border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-sm hover:bg-red-50 transition-colors">
            Delete
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-navy/10 shadow-sm text-center">
          <p className="text-xs text-navy/40 uppercase tracking-widest">Lifetime Spent</p>
          <p className="text-2xl font-semibold text-navy mt-1">${Number(client.lifetime_spent).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-navy/10 shadow-sm text-center">
          <p className="text-xs text-navy/40 uppercase tracking-widest">Jobs</p>
          <p className="text-2xl font-semibold text-navy mt-1">{client.bookings?.length || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-navy/10 shadow-sm text-center">
          <p className="text-xs text-navy/40 uppercase tracking-widest">Plan</p>
          <p className="text-lg font-semibold text-navy mt-1">{client.plan?.plan_tier || '—'}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Vehicles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-navy">Vehicles</h2>
            <button onClick={() => setShowVehicle(true)}
              className="text-xs text-gold border border-gold/30 px-2 py-1 rounded hover:bg-gold/10 transition-colors">
              + Add
            </button>
          </div>
          {client.vehicles?.length === 0 && <p className="text-navy/40 text-sm">No vehicles on file</p>}
          <div className="space-y-2">
            {client.vehicles?.map(v => (
              <div key={v.id} className="bg-white rounded-xl border border-navy/10 p-3 flex items-center justify-between shadow-sm">
                <div>
                  <p className="font-medium text-navy text-sm">{v.year ? `${v.year} ` : ''}{v.make} {v.model}</p>
                  <p className="text-xs text-navy/40 capitalize">{v.size}{v.color ? ` · ${v.color}` : ''}</p>
                  {v.notes && <p className="text-xs text-navy/40 italic">{v.notes}</p>}
                </div>
                <button onClick={() => handleRemoveVehicle(v.id)}
                  className="text-red-400 hover:text-red-600 text-xs ml-2">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <h2 className="font-display text-lg font-semibold text-navy mb-3">Notes</h2>
          <div className="bg-white rounded-xl border border-navy/10 p-4 shadow-sm">
            <p className="text-sm text-navy/70 whitespace-pre-wrap">{client.notes || 'No notes'}</p>
          </div>
        </div>

        {/* Service History */}
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-navy mb-3">Service History</h2>
          {client.bookings?.length === 0 ? (
            <p className="text-navy/40 text-sm">No service history yet</p>
          ) : (
            <div className="bg-white rounded-xl border border-navy/10 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy/10 bg-navy/5">
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-navy/50 font-medium">Date</th>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-navy/50 font-medium">Service</th>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-navy/50 font-medium">Vehicles</th>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-navy/50 font-medium">Price</th>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-navy/50 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy/5">
                  {client.bookings?.map(b => (
                    <tr key={b.id} className="hover:bg-gold/5">
                      <td className="px-4 py-2 text-navy/60">{fmt(b.date)}</td>
                      <td className="px-4 py-2 text-navy">{b.service_type}</td>
                      <td className="px-4 py-2 text-navy/50 text-xs">{b.vehicle_names || '—'}</td>
                      <td className="px-4 py-2 font-medium text-navy">${b.total_price}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || ''}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-display text-xl font-semibold text-navy mb-4">Edit Client</h2>
            <form onSubmit={handleSave} className="space-y-3">
              {[
                { key: 'name', label: 'Name *', type: 'text' },
                { key: 'phone', label: 'Phone', type: 'tel' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'address', label: 'Address', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">{f.label}</label>
                  <input type={f.type} value={form[f.key] || ''} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                    className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
                </div>
              ))}
              <div>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Notes</label>
                <textarea value={form.notes || ''} onChange={e => setForm(x => ({ ...x, notes: e.target.value }))}
                  rows={3} className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditing(false)}
                  className="flex-1 border border-navy/20 text-navy py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-navy text-gold py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-display text-xl font-semibold text-navy mb-4">Add Vehicle</h2>
            <form onSubmit={handleAddVehicle} className="space-y-3">
              {[
                { key: 'make', label: 'Make' },
                { key: 'model', label: 'Model' },
                { key: 'year', label: 'Year' },
                { key: 'color', label: 'Color' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">{f.label}</label>
                  <input value={vForm[f.key]} onChange={e => setVForm(x => ({ ...x, [f.key]: e.target.value }))}
                    className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
                </div>
              ))}
              <div>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Size</label>
                <select value={vForm.size} onChange={e => setVForm(x => ({ ...x, size: e.target.value }))}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60">
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="truck">Truck</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Notes</label>
                <input value={vForm.notes} onChange={e => setVForm(x => ({ ...x, notes: e.target.value }))}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowVehicle(false)}
                  className="flex-1 border border-navy/20 text-navy py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-navy text-gold py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Adding…' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
