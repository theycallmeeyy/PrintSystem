import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, CheckCircle2, Clock3, PackageCheck,
  RefreshCw, TrendingUp
} from 'lucide-react';
import { fetchOrders } from '../services/api';
import { getSocket } from '../services/socket';

const STATUS_STEPS = [
  { id: 'new', label: 'New', color: 'bg-rose-500', text: 'text-rose-700', soft: 'bg-rose-50' },
  { id: 'in-progress', label: 'In progress', color: 'bg-amber-500', text: 'text-amber-700', soft: 'bg-amber-50' },
  { id: 'finished', label: 'Finished', color: 'bg-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-50' }
];

const dateKey = (date) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
};

const formatDate = (date, options) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Unknown date' : parsed.toLocaleString('en-PH', options);
};

const getLatestUpdate = (order) => {
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  return history.reduce((latest, entry) => {
    const time = new Date(entry.timestamp).getTime();
    return Number.isFinite(time) && time > latest ? time : latest;
  }, new Date(order.createdAt).getTime());
};

function ThroughputChart({ points }) {
  const width = 720;
  const height = 260;
  const left = 44;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(1, ...points.flatMap(point => [point.received, point.completed]));
  const scaleMax = Math.max(4, Math.ceil(maxValue / 2) * 2);
  const coordinates = (key) => points.map((point, index) => ({
    x: left + (chartWidth * index) / Math.max(1, points.length - 1),
    y: top + chartHeight - (point[key] / scaleMax) * chartHeight
  }));
  const linePath = (values) => values.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');
  const received = coordinates('received');
  const completed = coordinates('completed');
  const gridLines = [0, 1, 2, 3].map(index => ({
    y: top + (chartHeight * index) / 3,
    value: Math.round(scaleMax - (scaleMax * index) / 3)
  }));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Daily order volume over the last seven days, comparing orders received with orders completed"
        className="h-[250px] min-w-[560px] w-full"
      >
        {gridLines.map(line => (
          <g key={line.value}>
            <line x1={left} x2={width - right} y1={line.y} y2={line.y} stroke="#e2e8f0" strokeDasharray="4 6" />
            <text x={left - 12} y={line.y + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{line.value}</text>
          </g>
        ))}
        <path d={linePath(received)} fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={linePath(completed)} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {received.map((point, index) => (
          <g key={`received-${points[index].key}`}>
            <circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#0284c7" strokeWidth="3" />
            <text x={point.x} y={height - 13} textAnchor="middle" fill="#64748b" fontSize="11">{points[index].label}</text>
          </g>
        ))}
        {completed.map((point, index) => (
          <circle key={`completed-${points[index].key}`} cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#10b981" strokeWidth="3" />
        ))}
      </svg>
    </div>
  );
}

function OrderProgressTrack({ status }) {
  const activeIndex = STATUS_STEPS.findIndex(step => step.id === status);
  const progress = activeIndex < 0 ? 0 : (activeIndex / (STATUS_STEPS.length - 1)) * 100;

  return (
    <div className="relative mt-3">
      <div className="absolute left-2 right-2 top-[7px] h-1 rounded-full bg-slate-100" />
      <div className="absolute left-2 top-[7px] h-1 rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-500 transition-all" style={{ width: `calc(${progress}% - ${progress === 100 ? 16 : 0}px)` }} />
      <div className="relative flex justify-between">
        {STATUS_STEPS.map((step, index) => {
          const reached = index <= activeIndex;
          return (
            <div key={step.id} className="flex flex-col items-center gap-1.5">
              <span className={`h-4 w-4 rounded-full border-[3px] border-white shadow-sm ${reached ? step.color : 'bg-slate-200'}`} />
              <span className={`text-[10px] font-semibold ${reached ? step.text : 'text-slate-400'}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SuperAdminProgress({ onOpenQueue }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchOrders({ status: 'all' });
      setOrders(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (loadError) {
      console.error('Failed to load super-admin progress data:', loadError);
      setError(loadError.message || 'Could not load order progress.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const socket = getSocket();
    const upsertOrder = (order) => {
      if (!order?.id) return;
      setOrders(previous => [order, ...previous.filter(existing => existing.id !== order.id)]);
      setLastUpdated(new Date());
    };
    const handleStatusChanged = ({ order }) => upsertOrder(order);
    const handleOrderChanged = (payload) => upsertOrder(payload?.order || payload);

    socket.on('order:created', handleOrderChanged);
    socket.on('order:status_changed', handleStatusChanged);
    socket.on('order:updated', handleOrderChanged);
    socket.on('order:quote_revised', handleOrderChanged);
    socket.on('order:quote_accepted', handleOrderChanged);
    return () => {
      socket.off('order:created', handleOrderChanged);
      socket.off('order:status_changed', handleStatusChanged);
      socket.off('order:updated', handleOrderChanged);
      socket.off('order:quote_revised', handleOrderChanged);
      socket.off('order:quote_accepted', handleOrderChanged);
    };
  }, []);

  const metrics = useMemo(() => {
    const counts = Object.fromEntries(STATUS_STEPS.map(step => [step.id, 0]));
    orders.forEach(order => {
      if (Object.hasOwn(counts, order.status)) counts[order.status] += 1;
    });

    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (6 - index));
      const key = dateKey(day);
      return {
        key,
        label: day.toLocaleDateString('en-PH', { weekday: 'short' }),
        received: 0,
        completed: 0
      };
    });
    const byDate = new Map(days.map(day => [day.key, day]));

    orders.forEach(order => {
      const receivedDay = byDate.get(dateKey(order.createdAt));
      if (receivedDay) receivedDay.received += 1;

      (Array.isArray(order.statusHistory) ? order.statusHistory : []).forEach(event => {
        if (event.status === 'finished') {
          const completedDay = byDate.get(dateKey(event.timestamp));
          if (completedDay) completedDay.completed += 1;
        }
      });
    });

    const recentOrders = [...orders]
      .sort((a, b) => getLatestUpdate(b) - getLatestUpdate(a))
      .slice(0, 8);

    return { counts, days, recentOrders };
  }, [orders]);

  const completionRate = orders.length
    ? Math.round((metrics.counts.finished / orders.length) * 100)
    : 0;
  const activeOrders = metrics.counts.new + metrics.counts['in-progress'];
  const receivedWeek = metrics.days.reduce((total, day) => total + day.received, 0);
  const completedWeek = metrics.days.reduce((total, day) => total + day.completed, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-700">
            <Activity className="h-3.5 w-3.5" /> Live operations
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Printing progress</h1>
          <p className="mt-1 text-sm text-slate-500">A live overview of order flow, shop workload, and recent updates.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-slate-400 sm:inline">
            {lastUpdated ? `Updated ${formatDate(lastUpdated, { hour: 'numeric', minute: '2-digit' })}` : 'Connecting to order data'}
          </span>
          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={onOpenQueue}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            Open queue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</span>
          <button type="button" onClick={loadOrders} className="font-bold underline">Try again</button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total orders', value: orders.length, icon: Activity, color: 'text-sky-700', bg: 'bg-sky-50' },
          { label: 'Active workload', value: activeOrders, icon: Clock3, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Completed', value: metrics.counts.finished, icon: PackageCheck, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Completion rate', value: `${completionRate}%`, icon: TrendingUp, color: 'text-violet-700', bg: 'bg-violet-50' }
        ].map(metric => (
          <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{metric.label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${metric.bg} ${metric.color}`}>
                <metric.icon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">{metric.value}</div>
            {metric.label === 'Active workload' && (
              <div className="mt-1 text-[11px] text-slate-400">{metrics.counts.new} new · {metrics.counts['in-progress']} in progress</div>
            )}
            {metric.label === 'Completion rate' && (
              <div className="mt-1 text-[11px] text-slate-400">Finished orders across all time</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Order throughput</h2>
              <p className="mt-1 text-xs text-slate-500">Orders received and finished each day · last 7 days</p>
            </div>
            <div className="flex gap-4 text-[11px] font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-sky-600" /> Received <b className="text-slate-900">{receivedWeek}</b></span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" /> Finished <b className="text-slate-900">{completedWeek}</b></span>
            </div>
          </div>
          <div className="mt-3">
            <ThroughputChart points={metrics.days} />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Live order pipeline</h2>
            <p className="mt-1 text-xs text-slate-500">Current workload by status</p>
          </div>
          <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label="Order count by status">
            {STATUS_STEPS.map(step => (
              <div
                key={step.id}
                className={`${step.color} transition-all duration-500`}
                style={{ width: `${orders.length ? (metrics.counts[step.id] / orders.length) * 100 : 0}%` }}
                title={`${step.label}: ${metrics.counts[step.id]}`}
              />
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {STATUS_STEPS.map(step => (
              <div key={step.id} className={`flex items-center justify-between rounded-xl px-3.5 py-3 ${step.soft}`}>
                <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                  <i className={`h-2.5 w-2.5 rounded-full ${step.color}`} /> {step.label}
                </span>
                <span className={`text-lg font-black tabular-nums ${step.text}`}>{metrics.counts[step.id]}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm"><CheckCircle2 className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-bold text-slate-800">Progress at a glance</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  {activeOrders
                    ? `${activeOrders} ${activeOrders === 1 ? 'order is' : 'orders are'} still moving through the shop.`
                    : 'There are no orders waiting for shop processing.'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recently updated orders</h2>
            <p className="mt-1 text-xs text-slate-500">Latest activity across the print workflow</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
          </span>
        </div>
        {isLoading && !orders.length ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading order progress…</div>
        ) : metrics.recentOrders.length ? (
          <div className="divide-y divide-slate-100">
            {metrics.recentOrders.map(order => {
              const status = STATUS_STEPS.find(step => step.id === order.status) || STATUS_STEPS[0];
              return (
                <article key={order.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center sm:px-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900">{order.id}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.soft} ${status.text}`}>{status.label}</span>
                      {order.isRush && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">Rush</span>}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-600">
                      {order.customer?.name || 'Customer'} <span className="text-slate-300">·</span> {order.job?.jobTypeName || 'Print order'}
                    </p>
                    <OrderProgressTrack status={order.status} />
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                    <span className="text-[10px] font-medium text-slate-400">Last activity</span>
                    <span className="block text-[11px] font-semibold text-slate-600">
                      {formatDate(getLatestUpdate(order), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">No orders to show yet.</div>
        )}
      </section>
    </div>
  );
}
