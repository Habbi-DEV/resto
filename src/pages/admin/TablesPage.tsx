import { useEffect, useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import type { Order, RestaurantTable, TableStatus } from '../../lib/types';
import { api } from '../../lib/api';
import { orderNumber } from '../../lib/format';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { ACTIVE_STATUSES } from '../../lib/types';

const STATUS_META: Record<TableStatus, { label: string; cls: string }> = {
  available: { label: 'Available', cls: 'bg-sky-50 text-sky-600 ring-sky-200' },
  occupied: { label: 'Occupied', cls: 'bg-brand-50 text-brand-700 ring-brand-200' },
  reserved: { label: 'Reserved', cls: 'bg-indigo-50 text-indigo-600 ring-indigo-200' },
};

export default function TablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ table_number: '', seats: '2' });
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([
      fetch('/api/tables').then((r) => r.json()),
      fetch('/api/orders?limit=80').then((r) => r.json()),
    ])
      .then(([t, o]) => {
        setTables(Array.isArray(t) ? t : []);
        setOrders(Array.isArray(o) ? o : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const activeOrderFor = (tableNumber: number) =>
    orders.find((o) => o.table_number === tableNumber && ACTIVE_STATUSES.includes(o.status) && o.order_type === 'dine_in');

  const setStatus = async (t: RestaurantTable, status: TableStatus) => {
    await api('/api/tables', { method: 'PUT', body: JSON.stringify({ id: t.id, status }) }).catch(console.error);
    load();
  };

  const addTable = async () => {
    const n = Number(form.table_number);
    if (!n || n <= 0) {
      setError('Enter a valid table number.');
      return;
    }
    if (tables.some((t) => t.table_number === n)) {
      setError(`Table ${n} already exists.`);
      return;
    }
    try {
      await api('/api/tables', { method: 'POST', body: JSON.stringify({ table_number: n, seats: Number(form.seats) || 2 }) });
      setModalOpen(false);
      setForm({ table_number: '', seats: '2' });
      setError('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add table');
    }
  };

  const removeTable = async (t: RestaurantTable) => {
    if (!confirm(`Remove table ${t.table_number} from the floor plan?`)) return;
    await api('/api/tables', { method: 'DELETE', body: JSON.stringify({ id: t.id }) }).catch(console.error);
    load();
  };

  if (loading) return <Spinner label="Loading the floor plan…" />;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900">Tables</h1>
          <p className="text-sm text-zinc-500">
            {tables.filter((t) => t.status === 'available').length} available ·{' '}
            {tables.filter((t) => t.status === 'occupied').length} occupied ·{' '}
            {tables.filter((t) => t.status === 'reserved').length} reserved
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-brand-600">
          <Plus size={16} /> Add table
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {tables.map((t) => {
          const meta = STATUS_META[t.status];
          const active = activeOrderFor(t.table_number);
          return (
            <div key={t.id} className={`rounded-2xl bg-white p-4 shadow-sm ring-1 transition ${t.status === 'occupied' ? 'ring-brand-200' : 'ring-zinc-100'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-2xl font-extrabold text-zinc-900">T{t.table_number}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-400"><Users size={11} /> {t.seats} seats</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${meta.cls}`}>{meta.label}</span>
              </div>

              {active && (
                <p className="mt-2 rounded-lg bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700">
                  Order {orderNumber(active.id)} open
                </p>
              )}

              <div className="mt-3 flex gap-1.5">
                {(['available', 'occupied', 'reserved'] as TableStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(t, s)}
                    className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold transition ${t.status === s ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
                <button onClick={() => removeTable(t)} className="rounded-lg bg-zinc-100 px-2 text-zinc-400 hover:bg-red-50 hover:text-red-500" aria-label="Delete table">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add a table">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Table number *</label>
              <input value={form.table_number} onChange={(e) => setForm({ ...form, table_number: e.target.value })} type="number" min="1" className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Seats</label>
              <input value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} type="number" min="1" className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400" />
            </div>
          </div>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}
          <button onClick={addTable} className="w-full rounded-xl bg-brand-500 py-3 font-display text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-brand-600">
            Add table
          </button>
        </div>
      </Modal>
    </div>
  );
}
