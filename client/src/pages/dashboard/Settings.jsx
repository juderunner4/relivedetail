import { useEffect, useState } from 'react';
import { settings as settingsApi } from '../../api';
import { useToast } from '../../components/Toast';

export default function Settings() {
  const [biz, setBiz] = useState({
    business_name: '', business_phone: '', business_email: '', business_address: '', owner_email: ''
  });
  const [pricing, setPricing] = useState({});
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [goals, setGoals] = useState({ monthly_revenue_goal: '', monthly_job_goal: '' });
  const [notifEmail, setNotifEmail] = useState('');
  const [quickLinks, setQuickLinks] = useState([]);
  const [newLink, setNewLink] = useState({ label: '', url: '' });
  const [saving, setSaving] = useState('');
  const toast = useToast();

  useEffect(() => {
    settingsApi.get().then(data => {
      setBiz({
        business_name: data.business_name || '',
        business_phone: data.business_phone || '',
        business_email: data.business_email || '',
        business_address: data.business_address || '',
        owner_email: data.owner_email || '',
      });
      setPricing(data.pricing || {});
      setGoals({
        monthly_revenue_goal: data.monthly_revenue_goal || '',
        monthly_job_goal: data.monthly_job_goal || '',
      });
      setNotifEmail(data.notification_email || '');
      try {
        setQuickLinks(typeof data.quick_links === 'string' ? JSON.parse(data.quick_links) : (data.quick_links || []));
      } catch { setQuickLinks([]); }
    }).catch(e => toast(e.message, 'error'));
  }, []);

  async function saveBiz(e) {
    e.preventDefault();
    setSaving('biz');
    try {
      await settingsApi.update(biz);
      toast('Business info saved');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving('');
    }
  }

  async function savePricing(e) {
    e.preventDefault();
    setSaving('pricing');
    try {
      await settingsApi.update({ pricing });
      toast('Pricing saved');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving('');
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) return toast('Passwords do not match', 'error');
    if (pwForm.new_password.length < 6) return toast('Password must be at least 6 characters', 'error');
    setSaving('pw');
    try {
      await settingsApi.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast('Password changed');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving('');
    }
  }

  async function saveGoals(e) {
    e.preventDefault();
    setSaving('goals');
    try {
      await settingsApi.update({ monthly_revenue_goal: goals.monthly_revenue_goal, monthly_job_goal: goals.monthly_job_goal });
      toast('Goals saved');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(''); }
  }

  async function saveNotif(e) {
    e.preventDefault();
    setSaving('notif');
    try {
      await settingsApi.update({ notification_email: notifEmail });
      toast('Notification email saved');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(''); }
  }

  async function saveQuickLinks(links) {
    try {
      await settingsApi.update({ quick_links: JSON.stringify(links) });
      setQuickLinks(links);
      toast('Quick links saved');
    } catch (e) { toast(e.message, 'error'); }
  }

  function addLink(e) {
    e.preventDefault();
    if (!newLink.label.trim() || !newLink.url.trim()) return toast('Label and URL required', 'error');
    const updated = [...quickLinks, { label: newLink.label.trim(), url: newLink.url.trim() }];
    setNewLink({ label: '', url: '' });
    saveQuickLinks(updated);
  }

  function removeLink(i) {
    saveQuickLinks(quickLinks.filter((_, idx) => idx !== i));
  }

  const PRICING_LABELS = {
    exterior_sedan: 'Exterior — Sedan',
    exterior_suv: 'Exterior — SUV',
    interior_sedan: 'Interior — Sedan',
    interior_suv: 'Interior — SUV',
    full_detail_sedan: 'Full Detail — Sedan',
    full_detail_suv: 'Full Detail — SUV',
    addon_clay_bar: 'Add-on: Clay Bar',
    addon_spray_wax: 'Add-on: Spray Wax',
    addon_engine_bay: 'Add-on: Engine Bay',
    plan_essential: 'Plan: Essential',
    plan_classic: 'Plan: Classic',
    plan_signature: 'Plan: Signature',
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="font-display text-2xl font-semibold text-navy">Settings</h1>

      {/* Business Info */}
      <section className="bg-white rounded-xl border border-navy/10 p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-navy mb-4">Business Info</h2>
        <form onSubmit={saveBiz} className="space-y-3">
          {[
            { key: 'business_name', label: 'Business Name' },
            { key: 'business_phone', label: 'Phone' },
            { key: 'business_email', label: 'Business Email' },
            { key: 'business_address', label: 'Address' },
            { key: 'owner_email', label: 'Owner Email (for notifications)' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">{f.label}</label>
              <input value={biz[f.key]} onChange={e => setBiz(x => ({ ...x, [f.key]: e.target.value }))}
                className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
          ))}
          <button type="submit" disabled={saving === 'biz'}
            className="bg-navy text-gold px-6 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors disabled:opacity-50">
            {saving === 'biz' ? 'Saving…' : 'Save'}
          </button>
        </form>
      </section>

      {/* Pricing */}
      <section className="bg-white rounded-xl border border-navy/10 p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-navy mb-4">Pricing</h2>
        <form onSubmit={savePricing} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(PRICING_LABELS).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">{label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40 text-sm">$</span>
                  <input type="number" step="0.01" value={pricing[key] || ''}
                    onChange={e => setPricing(x => ({ ...x, [key]: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-navy/20 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
                </div>
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving === 'pricing'}
            className="bg-navy text-gold px-6 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors disabled:opacity-50">
            {saving === 'pricing' ? 'Saving…' : 'Save Pricing'}
          </button>
        </form>
      </section>

      {/* Monthly Goals */}
      <section className="bg-white rounded-xl border border-navy/10 p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-navy mb-4">Monthly Goals</h2>
        <form onSubmit={saveGoals} className="space-y-3 max-w-sm">
          <div>
            <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Revenue Goal ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40 text-sm">$</span>
              <input type="number" min="0" step="1" placeholder="2000" value={goals.monthly_revenue_goal}
                onChange={e => setGoals(g => ({ ...g, monthly_revenue_goal: e.target.value }))}
                className="w-full border border-navy/20 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">Job Count Goal</label>
            <input type="number" min="0" step="1" placeholder="15" value={goals.monthly_job_goal}
              onChange={e => setGoals(g => ({ ...g, monthly_job_goal: e.target.value }))}
              className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
          </div>
          <button type="submit" disabled={saving === 'goals'}
            className="bg-navy text-gold px-6 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors disabled:opacity-50">
            {saving === 'goals' ? 'Saving…' : 'Save Goals'}
          </button>
        </form>
      </section>

      {/* Quick Links */}
      <section className="bg-white rounded-xl border border-navy/10 p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-navy mb-4">Quick Links</h2>
        <div className="space-y-2 mb-4">
          {quickLinks.length === 0 && <p className="text-navy/40 text-sm">No links yet. Add your social profiles, tools, and websites below.</p>}
          {quickLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-3 bg-cream/40 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-navy flex-1">{link.label}</span>
              <span className="text-xs text-navy/40 truncate max-w-[180px]">{link.url}</span>
              <button onClick={() => removeLink(i)} className="text-navy/30 hover:text-red-500 transition-colors text-xs ml-2">✕</button>
            </div>
          ))}
        </div>
        <form onSubmit={addLink} className="flex gap-2">
          <input placeholder="Label (e.g. Instagram)" value={newLink.label}
            onChange={e => setNewLink(l => ({ ...l, label: e.target.value }))}
            className="flex-1 border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
          <input placeholder="URL" value={newLink.url}
            onChange={e => setNewLink(l => ({ ...l, url: e.target.value }))}
            className="flex-1 border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
          <button type="submit" className="bg-navy text-gold px-4 py-2 rounded-lg text-sm font-medium">Add</button>
        </form>
      </section>

      {/* Notifications */}
      <section className="bg-white rounded-xl border border-navy/10 p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-navy mb-2">Booking Notifications</h2>
        <p className="text-xs text-navy/50 mb-4">When someone submits a booking request on your website, you'll get an email here. Requires Gmail credentials set in Railway env vars.</p>
        <form onSubmit={saveNotif} className="flex gap-2 max-w-sm">
          <input type="email" placeholder="your@email.com" value={notifEmail}
            onChange={e => setNotifEmail(e.target.value)}
            className="flex-1 border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
          <button type="submit" disabled={saving === 'notif'}
            className="bg-navy text-gold px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving === 'notif' ? 'Saving…' : 'Save'}
          </button>
        </form>
      </section>

      {/* Change Password */}
      <section className="bg-white rounded-xl border border-navy/10 p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-navy mb-4">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-3 max-w-sm">
          {[
            { key: 'current_password', label: 'Current Password' },
            { key: 'new_password', label: 'New Password' },
            { key: 'confirm', label: 'Confirm New Password' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs uppercase tracking-widest text-navy/50 mb-1">{f.label}</label>
              <input type="password" value={pwForm[f.key]}
                onChange={e => setPwForm(x => ({ ...x, [f.key]: e.target.value }))}
                className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
          ))}
          <button type="submit" disabled={saving === 'pw'}
            className="bg-navy text-gold px-6 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors disabled:opacity-50">
            {saving === 'pw' ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </section>
    </div>
  );
}
