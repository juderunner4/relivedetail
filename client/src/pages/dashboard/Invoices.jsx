import { useEffect, useState } from 'react';
import { invoices as invoicesApi, clients as clientsApi } from '../../api';
import { useToast } from '../../components/Toast';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Invoices() {
  const [list, setList] = useState([]);
  const [clientList, setClientList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    client_id: '', line_items: [{ description: '', amount: '' }],
    status: 'unpaid', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(null);
  const toast = useToast();

  async function load() {
    try {
      setList(await invoicesApi.list());
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  useEffect(() => {
    load();
    clientsApi.list().then(setClientList).catch(() => {});
  }, []);

  function calcTotals(items) {
    const sub = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    return { subtotal: sub, total: sub };
  }

  function addLine() {
    setForm(f => ({ ...f, line_items: [...f.line_items, { description: '', amount: '' }] }));
  }

  function removeLine(i) {
    setForm(f => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }));
  }

  function updateLine(i, key, val) {
    setForm(f => {
      const items = [...f.line_items];
      items[i] = { ...items[i], [key]: val };
      return { ...f, line_items: items };
    });
  }

  function resetForm() {
    setForm({ client_id: '', line_items: [{ description: '', amount: '' }], status: 'unpaid', notes: '' });
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.client_id) return toast('Select a client', 'error');
    const { subtotal, total } = calcTotals(form.line_items);
    setSaving(true);
    try {
      const payload = {
        client_id: form.client_id,
        line_items: form.line_items.map(i => ({ description: i.description, amount: parseFloat(i.amount) || 0 })),
        subtotal, total, status: form.status
      };
      if (editingId) {
        await invoicesApi.update(editingId, payload);
        toast('Invoice updated');
      } else {
        await invoicesApi.create(payload);
        toast('Invoice created');
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

  async function togglePaid(inv) {
    try {
      const items = JSON.parse(inv.line_items || '[]');
      await invoicesApi.update(inv.id, {
        line_items: items, subtotal: inv.subtotal, total: inv.total,
        status: inv.status === 'paid' ? 'unpaid' : 'paid'
      });
      toast(inv.status === 'paid' ? 'Marked unpaid' : 'Marked paid');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleSend(inv) {
    if (!inv.client_email) return toast('Client has no email', 'error');
    setSending(inv.id);
    try {
      await invoicesApi.send(inv.id);
      toast('Invoice sent to ' + inv.client_email);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSending(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this invoice?')) return;
    try {
      await invoicesApi.remove(id);
      toast('Deleted');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  function startEdit(inv) {
    const items = JSON.parse(inv.line_items || '[]');
    setForm({
      client_id: String(inv.client_id),
      line_items: items.length ? items.map(i => ({ description: i.description, amount: String(i.amount) })) : [{ description: '', amount: '' }],
      status: inv.status
    });
    setEditingId(inv.id);
    setShowForm(true);
  }

  const { subtotal, total } = calcTotals(form.line_items);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-navy">Invoices</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-navy text-gold px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors">
          + New Invoice
        </button>
      </div>

      <div className="bg-white rounded-xl border border-navy/10 overflow-hidden shadow-sm">
        {list.length === 0 ? (
          <p className="text-center text-navy/40 py-12 text-sm">No invoices yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 bg-navy/5">
                {['#', 'Client', 'Date', 'Total', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-widest text-navy/50 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {list.map(inv => (
                <tr key={inv.id} className="hover:bg-gold/5">
                  <td className="px-4 py-3 text-navy/60 font-mono text-xs">#{String(inv.id).padStart(4, '0')}</td>
                  <td className="px-4 py-3 font-medium text-navy">{inv.client_name}</td>
                  <td className="px-4 py-3 text-navy/60">{fmt(inv.created_at)}</td>
                  <td className="px-4 py-3 font-semibold text-navy">${Number(inv.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => togglePaid(inv)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors ${
                        inv.status === 'paid'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}>
                      {inv.status === 'paid' ? 'Paid' : 'Unpaid'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a href={`${invoicesApi.pdfUrl(inv.id)}?token=${localStorage.getItem('relive_token')}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs border border-navy/20 text-navy px-2 py-1 rounded hover:bg-navy/5 transition-colors">
                        PDF
                      </a>
                      <button onClick={() => handleSend(inv)} disabled={sending === inv.id}
                        className="text-xs border border-gold/40 text-gold px-2 py-1 rounded hover:bg-gold/10 transition-colors disabled:opacity-50">
                        {sending === inv.id ? '…' : 'Email'}
                      </button>
                      <button onClick={() => startEdit(inv)}
                        className="text-xs border border-navy/20 text-navy px-2 py-1 rounded hover:bg-navy/5 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(inv.id)}
                        className="text-xs border border-red-200 text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4">
            <h2 className="font-display text-xl font-semibold text-navy mb-4">
              {editingId ? 'Edit Invoice' : 'New Invoice'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Client *</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60">
                  <option value="">Select client…</option>
                  {clientList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest text-navy/50">Line Items</label>
                  <button type="button" onClick={addLine}
                    className="text-xs text-gold hover:text-gold-dark">+ Add Line</button>
                </div>
                <div className="space-y-2">
                  {form.line_items.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={item.description} onChange={e => updateLine(i, 'description', e.target.value)}
                        placeholder="Description"
                        className="flex-1 border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
                      <input type="number" step="0.01" value={item.amount} onChange={e => updateLine(i, 'amount', e.target.value)}
                        placeholder="$0.00"
                        className="w-24 border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
                      {form.line_items.length > 1 && (
                        <button type="button" onClick={() => removeLine(i)}
                          className="text-red-400 hover:text-red-600 px-1">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-navy/5 rounded-lg p-3 text-sm">
                <div className="flex justify-between text-navy/60 mb-1">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-navy">
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60">
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 border border-navy/20 text-navy py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-navy text-gold py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
