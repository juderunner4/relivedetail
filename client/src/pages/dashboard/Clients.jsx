import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clients } from '../../api';
import { useToast } from '../../components/Toast';

export default function Clients() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  async function load(search = '') {
    try {
      setList(await clients.list(search));
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  useEffect(() => { load(); }, []);

  function handleSearch(e) {
    const val = e.target.value;
    setQ(val);
    clearTimeout(window._st);
    window._st = setTimeout(() => load(val), 300);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast('Name is required', 'error');
    setLoading(true);
    try {
      const { id } = await clients.create(form);
      toast('Client added');
      setShowAdd(false);
      setForm({ name: '', phone: '', email: '', address: '', notes: '' });
      navigate(`/clients/${id}`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-navy">Clients</h1>
        <button onClick={() => setShowAdd(true)}
          className="bg-navy text-gold px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors">
          + New Client
        </button>
      </div>

      <input
        value={q}
        onChange={handleSearch}
        placeholder="Search by name, phone, or email…"
        className="w-full border border-navy/20 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-gold/60 bg-white"
      />

      <div className="bg-white rounded-xl border border-navy/10 overflow-hidden shadow-sm">
        {list.length === 0 ? (
          <p className="text-center text-navy/40 py-12 text-sm">No clients found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 bg-navy/5">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-navy/50 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-navy/50 font-medium">Phone</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-navy/50 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-navy/50 font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {list.map(c => (
                <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)}
                  className="hover:bg-gold/5 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-navy">{c.name}</td>
                  <td className="px-4 py-3 text-navy/60">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-navy/60">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-navy/40 text-xs">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Client Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-display text-xl font-semibold text-navy mb-4">New Client</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              {[
                { key: 'name', label: 'Name *', type: 'text' },
                { key: 'phone', label: 'Phone', type: 'tel' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'address', label: 'Address', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                    className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(x => ({ ...x, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 border border-navy/20 text-navy py-2 rounded-lg text-sm hover:bg-navy/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-navy text-gold py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors disabled:opacity-50">
                  {loading ? 'Saving…' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
