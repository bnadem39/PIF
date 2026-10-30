import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAuditLogs } from '../services/realMarketService';

const ACTIONS = [
  '',
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'REGISTER',
  'ORDER_EXECUTED',
  'RISK_ORDER_TRIGGERED',
  'RISK_THRESHOLDS_UPDATED',
  'ACCOUNT_RESET',
  'STRESS_TEST_RUN',
  'STRESS_SCENARIO_CHANGED',
  'BACKTEST_RUN'
];

/**
 * Journal d'audit (réservé ROLE_ADMIN) : GET /api/v1/admin/audit-logs
 */
export default function AdminAuditPage({ currentUser }) {
  const [page, setPage] = useState(0);
  const [action, setAction] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.role === 'ROLE_ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAuditLogs({ page, size: 50, action: action || undefined }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, action]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Accès réservé aux administrateurs.
      </main>
    );
  }

  const rows = data?.content || [];

  return (
    <main className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-100">
          <ShieldCheck size={18} className="text-[#38BDF8]" />
          <h1 className="text-base font-extrabold">Journal d'audit</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={action}
            onChange={(e) => {
              setPage(0);
              setAction(e.target.value);
            }}
            className="bg-[#1E293B] border border-[#334155] text-xs text-slate-200 rounded-lg px-2 py-1.5"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a || 'Toutes les actions'}</option>
            ))}
          </select>
          <button
            onClick={load}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-[#1E293B] border border-[#334155] text-slate-200 hover:border-[#38BDF8]"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {error && <div className="mb-3 text-xs text-rose-400">{error}</div>}

      <div className="overflow-x-auto border border-[#1E293B] rounded-xl">
        <table className="w-full text-xs">
          <thead className="bg-[#0F172A] text-slate-400">
            <tr>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Utilisateur</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Détails</th>
              <th className="text-left px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#1E293B] text-slate-300">
                <td className="px-3 py-1.5 font-mono whitespace-nowrap">{r.createdAt?.replace('T', ' ').slice(0, 19)}</td>
                <td className="px-3 py-1.5">{r.userEmail || '-'}</td>
                <td className="px-3 py-1.5 font-semibold">{r.action}</td>
                <td className={`px-3 py-1.5 ${r.success ? 'text-emerald-400' : 'text-rose-400'}`}>{r.success ? 'OK' : 'Échec'}</td>
                <td className="px-3 py-1.5">{r.details || ''}</td>
                <td className="px-3 py-1.5 font-mono">{r.ipAddress || ''}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">Aucune entrée.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-3 text-xs text-slate-400">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          <span>Page {page + 1} / {data.totalPages}</span>
          <button disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)} className="disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
