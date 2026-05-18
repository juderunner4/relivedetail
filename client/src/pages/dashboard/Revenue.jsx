import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { revenue as revenueApi } from '../../api';
import { useToast } from '../../components/Toast';

const GOLD_PALETTE = ['#C9A84C', '#0D1B2A', '#dfc070', '#1a2e42', '#a8882e', '#3a5068'];

function MonthLabel({ month }) {
  if (!month) return '';
  const [y, m] = month.split('-');
  return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short' });
}

export default function Revenue() {
  const [data, setData] = useState(null);
  const toast = useToast();

  useEffect(() => {
    revenueApi.get().then(setData).catch(e => toast(e.message, 'error'));
  }, []);

  if (!data) return <div className="p-6 text-navy/40">Loading…</div>;

  const monthlyData = data.monthly.map(m => ({
    name: MonthLabel({ month: m.month }),
    revenue: m.total
  }));

  const diff = data.thisMonth - data.lastMonth;
  const pct = data.lastMonth ? ((diff / data.lastMonth) * 100).toFixed(1) : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-navy">Revenue</h1>
        <a href={revenueApi.exportUrl()} download="revenue.csv"
          className="border border-navy/20 text-navy px-4 py-2 rounded-lg text-sm hover:bg-navy/5 transition-colors">
          Export CSV
        </a>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-navy/10 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest">This Month</p>
          <p className="text-2xl font-semibold text-navy mt-1">
            ${Number(data.thisMonth).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          {pct !== null && (
            <p className={`text-xs mt-1 ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {diff >= 0 ? '↑' : '↓'} {Math.abs(pct)}% vs last month
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 border border-navy/10 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest">Last Month</p>
          <p className="text-2xl font-semibold text-navy mt-1">
            ${Number(data.lastMonth).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-navy/10 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest">Total Clients</p>
          <p className="text-2xl font-semibold text-navy mt-1">{data.total_clients}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-navy/10 shadow-sm">
          <p className="text-xs text-navy/40 uppercase tracking-widest">Jobs This Month</p>
          <p className="text-2xl font-semibold text-navy mt-1">{data.jobs_this_month}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-navy mb-4">Monthly Revenue</h2>
          {monthlyData.length === 0 ? (
            <p className="text-center text-navy/40 py-8 text-sm">No revenue data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#0D1B2A80' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#0D1B2A80' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v}`} />
                <Tooltip formatter={v => [`$${Number(v).toFixed(2)}`, 'Revenue']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #C9A84C20', fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#C9A84C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By service type */}
        <div className="bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-navy mb-4">By Service</h2>
          {data.byService.length === 0 ? (
            <p className="text-center text-navy/40 py-8 text-sm">No data</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.byService} dataKey="total" nameKey="service_type"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {data.byService.map((_, i) => (
                      <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => `$${Number(v).toFixed(2)}`}
                    contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {data.byService.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: GOLD_PALETTE[i % GOLD_PALETTE.length] }} />
                      <span className="text-navy/70 truncate max-w-[120px]">{s.service_type || 'Other'}</span>
                    </div>
                    <span className="font-medium text-navy">${Number(s.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
