import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Users, BarChart3, Newspaper, GraduationCap, Landmark, ScrollText, RefreshCw, Search,
  Trash2, Pencil, Sparkles, Cpu
} from 'lucide-react';
import {
  getPlatformStats, getUsers, updateUser, resetUserPortfolio, getLearningStats, getAiHealth
} from '../services/adminService';
import { getAllNews, analyzeNewsText, createNews, updateNews, deleteNews } from '../services/newsService';
import AdminAuditPage from './AdminAuditPage';

const TABS = [
  { id: 'overview', label: "Vue d'ensemble", icon: BarChart3 },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'news', label: 'Actualités', icon: Newspaper },
  { id: 'learning', label: 'Formation', icon: GraduationCap },
  { id: 'stress', label: 'Stress tests', icon: Landmark },
  { id: 'audit', label: "Journal d'audit", icon: ScrollText }
];

const ACTION_LABEL = {
  LOGIN_SUCCESS: 'Connexions', LOGIN_FAILURE: 'Échecs de connexion', REGISTER: 'Inscriptions',
  ORDER_EXECUTED: 'Ordres exécutés', RISK_ORDER_TRIGGERED: 'Stops déclenchés', RISK_THRESHOLDS_UPDATED: 'Seuils de risque modifiés',
  ACCOUNT_RESET: 'Comptes réinitialisés', STRESS_TEST_RUN: 'Stress tests', STRESS_SCENARIO_CHANGED: 'Scénarios de stress modifiés',
  BACKTEST_RUN: 'Backtests', ADMIN_USER_UPDATED: 'Comptes modifiés (admin)', NEWS_CHANGED: 'Actualités modifiées'
};
const SENTIMENT_STYLE = {
  POSITIVE: 'bg-emerald-500/15 text-emerald-300',
  NEGATIVE: 'bg-rose-500/15 text-rose-300',
  NEUTRAL: 'bg-slate-500/15 text-slate-300'
};
const money = (v) => (v == null ? '-' : Math.round(Number(v)).toLocaleString('fr-FR'));
const pct = (v) => (v == null ? '-' : `${Math.round(v * 100)} %`);
const inputCls = 'w-full bg-[#1E293B] border border-[#334155] rounded px-2 py-1 text-xs text-slate-200';

function Card({ title, children, right, className = '' }) {
  return (
    <section className={`bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-2 gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-xl font-extrabold font-mono text-slate-100">{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

// ── Vue d'ensemble ────────────────────────────────────────────────

function Overview() {
  const [stats, setStats] = useState(null);
  const [ai, setAi] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    getPlatformStats().then(setStats).catch((e) => setError(e.message));
    getAiHealth().then(setAi).catch(() => setAi({ status: 'OFFLINE' }));
  }, []);
  useEffect(load, [load]);

  if (error) return <div className="text-xs text-rose-400">{error}</div>;
  if (!stats) return <div className="text-xs text-slate-500">Chargement…</div>;
  const max = Math.max(1, ...stats.activity30d.map((d) => d.count));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
        <Kpi label="Utilisateurs" value={stats.users} sub={`${stats.admins} admin · ${stats.disabledUsers} désactivé(s)`} />
        <Kpi label="Nouveaux (7 j)" value={stats.newUsers7d} />
        <Kpi label="Ordres exécutés" value={stats.orders} sub={`${money(stats.tradedAmount)} échangés`} />
        <Kpi label="Positions ouvertes" value={stats.openPositions} />
        <Kpi label="Connexions (30 j)" value={stats.logins30d} sub={`${stats.loginFailures30d} échec(s)`} />
        <Kpi label="Backtests · stress tests (30 j)" value={`${stats.backtests30d} · ${stats.stressTests30d}`} />
        <Kpi label="Apprenants" value={stats.learners} />
        <Kpi label="Leçons terminées" value={stats.lessonsCompleted} />
        <Kpi label="Quiz réussis" value={stats.quizzesPassed} />
        <Kpi label="Défis réussis" value={stats.challengesCompleted} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-3 items-start">
        <Card title="Activité des 30 derniers jours (journal d'audit)" right={
          <button onClick={load} className="text-slate-400 hover:text-white"><RefreshCw size={13} /></button>
        }>
          <div className="flex items-end gap-[3px] h-32 border-b border-[#1E293B]">
            {stats.activity30d.map((d) => (
              <div key={d.date} className="flex-1 h-full flex items-end" title={`${d.date} : ${d.count} événement(s)`}>
                <div className="w-full rounded-t bg-[#38BDF8] hover:bg-[#7DD3FC]" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 2 : 0 }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
            {stats.activity30d.filter((_, i) => i % 5 === 0).map((d) => <span key={d.date}>{d.date.slice(5)}</span>)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-[11px]">
            {Object.entries(stats.actions30d).map(([k, v]) => (
              <div key={k} className="flex justify-between text-slate-400">
                <span>{ACTION_LABEL[k] || k}</span><b className="font-mono text-slate-200">{v}</b>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Service IA" right={<Cpu size={13} className="text-slate-500" />}>
          {!ai ? <div className="text-xs text-slate-500">…</div> : (
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between"><span className="text-slate-400">État</span><b className="text-slate-200">{ai.status}</b></div>
              {Object.entries(ai.components || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-400">{k}</span>
                  <span className={v === 'OK' ? 'text-emerald-300' : 'text-amber-300'}>{v}</span>
                </div>
              ))}
              {ai.model_info && (
                <>
                  <div className="flex justify-between"><span className="text-slate-400">Modèle entraîné le</span><span className="text-slate-200">{String(ai.model_info.trained_at || '').slice(0, 10)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Exactitude (validation croisée)</span><span className="text-slate-200 font-mono">{pct(ai.model_info.cv_mean_accuracy)}</span></div>
                </>
              )}
              <p className="text-[10px] text-slate-500 pt-1">
                Le RAG et le LLM sont optionnels : sans eux, les analyses sont produites par le moteur quantitatif.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Utilisateurs ──────────────────────────────────────────────────

function UsersTab({ currentUser }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    getUsers(search).then(setRows).catch((e) => setError(e.message));
  }, [search]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const change = async (u, update) => {
    setBusy(u.id);
    setError(null);
    try {
      const updated = await updateUser(u.id, update);
      setRows((all) => all.map((r) => (r.id === u.id ? updated : r)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const reset = async (u) => {
    if (!window.confirm(`Réinitialiser le portefeuille de ${u.email} (positions et historique supprimés, 100 000 TND) ?`)) return;
    setBusy(u.id);
    try {
      await resetUserPortfolio(u.id);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card title={`Comptes (${rows.length})`} right={
      <div className="relative w-56">
        <Search size={12} className="absolute left-2 top-2 text-slate-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="E-mail ou nom" className={`${inputCls} pl-6`} />
      </div>
    }>
      {error && <div className="text-xs text-rose-400 mb-2">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 text-left">
              <th className="font-normal py-1">Utilisateur</th>
              <th className="font-normal">Rôle</th>
              <th className="font-normal">Statut</th>
              <th className="font-normal text-right">Liquidités</th>
              <th className="font-normal text-right">Ordres</th>
              <th className="font-normal text-right">Montant échangé</th>
              <th className="font-normal text-right">Positions</th>
              <th className="font-normal text-right">Points formation</th>
              <th className="font-normal">Inscrit le</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const self = u.id === currentUser?.id || u.email === currentUser?.email;
              return (
                <tr key={u.id} className={`border-t border-[#1E293B] ${u.enabled ? 'text-slate-300' : 'text-slate-500'}`}>
                  <td className="py-1.5">
                    <div className="text-slate-200">{u.fullName || '—'}</div>
                    <div className="text-[10px] text-slate-500">{u.email}</div>
                  </td>
                  <td>
                    <select
                      value={u.role}
                      disabled={self || busy === u.id}
                      onChange={(e) => change(u, { role: e.target.value })}
                      className="bg-[#1E293B] border border-[#334155] rounded px-1 py-0.5 text-[11px] text-slate-200 disabled:opacity-50"
                    >
                      <option value="ROLE_TRADER">Trader</option>
                      <option value="ROLE_ADMIN">Admin</option>
                    </select>
                  </td>
                  <td>
                    <button
                      disabled={self || busy === u.id}
                      onClick={() => change(u, { enabled: !u.enabled })}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold disabled:opacity-50 ${u.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}
                      title={u.enabled ? 'Désactiver le compte' : 'Réactiver le compte'}
                    >
                      {u.enabled ? 'Actif' : 'Désactivé'}
                    </button>
                  </td>
                  <td className="text-right font-mono">{money(u.cashBalance)}</td>
                  <td className="text-right font-mono">{u.orders}</td>
                  <td className="text-right font-mono">{money(u.tradedAmount)}</td>
                  <td className="text-right font-mono">{u.openPositions}</td>
                  <td className="text-right font-mono">{u.learningPoints}</td>
                  <td className="text-[11px]">{u.createdAt ? u.createdAt.slice(0, 10) : '-'}</td>
                  <td className="text-right">
                    <button onClick={() => reset(u)} disabled={busy === u.id} className="text-[11px] text-slate-400 hover:text-amber-300" title="Réinitialiser le portefeuille">
                      <RefreshCw size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-500 mt-2">
        Un compte désactivé ne peut plus se connecter et ses jetons en cours sont refusés. Chaque modification est tracée dans le journal d'audit.
      </p>
    </Card>
  );
}

// ── Actualités ────────────────────────────────────────────────────

const EMPTY_ARTICLE = { publishedDate: '', title: '', source: '', url: '', body: '', symbols: '' };

function SentimentBadge({ label, score }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${SENTIMENT_STYLE[label] || SENTIMENT_STYLE.NEUTRAL}`}>
      {label === 'POSITIVE' ? 'POSITIF' : label === 'NEGATIVE' ? 'NÉGATIF' : 'NEUTRE'} {score > 0 ? '+' : ''}{Number(score).toFixed(2)}
    </span>
  );
}

function Terms({ terms }) {
  if (!terms?.length) return <span className="text-[10px] text-slate-500">Aucun terme du lexique détecté.</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {terms.map((t, i) => (
        <span key={i} className={`text-[10px] px-1 rounded ${t.polarity > 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
          {t.negated ? 'non ' : ''}{t.term} {t.polarity > 0 ? '+' : ''}{t.polarity}
        </span>
      ))}
    </div>
  );
}

function NewsTab() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_ARTICLE);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getAllNews().then(setRows).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const payload = () => ({
    publishedDate: form.publishedDate,
    title: form.title,
    source: form.source,
    url: form.url,
    body: form.body,
    symbols: form.symbols.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) await updateNews(editing, payload());
      else await createNews(payload());
      setForm(EMPTY_ARTICLE);
      setEditing(null);
      setPreview(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const analyze = async () => {
    setError(null);
    try {
      setPreview(await analyzeNewsText(`${form.title}. ${form.body}`));
    } catch (e) {
      setError(e.message);
    }
  };

  const edit = (a) => {
    setEditing(a.id);
    setPreview(null);
    setForm({ publishedDate: a.publishedDate, title: a.title, source: a.source || '', url: a.url || '', body: a.body || '', symbols: a.symbols.join(', ') });
  };

  const remove = async (a) => {
    if (!window.confirm(`Supprimer « ${a.title} » ?`)) return;
    try {
      await deleteNews(a.id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-3 items-start">
      <Card title={editing ? "Modifier l'actualité" : 'Nouvelle actualité'}>
        <div className="space-y-2 text-[11px] text-slate-400">
          <div className="grid grid-cols-2 gap-2">
            <label>Date de publication<input type="date" value={form.publishedDate} onChange={set('publishedDate')} className={`${inputCls} mt-0.5`} /></label>
            <label>Actifs concernés<input value={form.symbols} onChange={set('symbols')} placeholder="BIAT, SFBT (vide = marché)" className={`${inputCls} mt-0.5`} /></label>
          </div>
          <label className="block">Titre<input value={form.title} onChange={set('title')} className={`${inputCls} mt-0.5`} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label>Source<input value={form.source} onChange={set('source')} placeholder="Ilboursa, BVMT, Reuters…" className={`${inputCls} mt-0.5`} /></label>
            <label>Lien<input value={form.url} onChange={set('url')} placeholder="https://…" className={`${inputCls} mt-0.5`} /></label>
          </div>
          <label className="block">Texte (facultatif)<textarea rows={4} value={form.body} onChange={set('body')} className={`${inputCls} mt-0.5`} /></label>
          <div className="flex gap-2">
            <button onClick={analyze} disabled={!form.title} className="flex items-center gap-1 px-2 py-1 rounded border border-[#334155] text-xs text-slate-200 disabled:opacity-40">
              <Sparkles size={12} /> Analyser le sentiment
            </button>
            <button onClick={save} disabled={saving || !form.title || !form.publishedDate} className="flex-1 px-2 py-1 rounded bg-[#38BDF8] text-[#0B1120] text-xs font-bold disabled:opacity-40">
              {editing ? 'Enregistrer' : 'Publier'}
            </button>
            {editing && (
              <button onClick={() => { setEditing(null); setForm(EMPTY_ARTICLE); setPreview(null); }} className="px-2 py-1 text-xs text-slate-400">Annuler</button>
            )}
          </div>
          {preview && (
            <div className="rounded-lg border border-[#1E293B] p-2 space-y-1">
              <SentimentBadge label={preview.label} score={preview.score} />
              <Terms terms={preview.terms} />
              <div className="text-[10px] text-slate-500">Méthode : {preview.method}</div>
            </div>
          )}
          {error && <div className="text-xs text-rose-400">{error}</div>}
          <p className="text-[10px] text-slate-500">
            Saisissez de vraies actualités avec leur date réelle : elles n'apparaissent dans la simulation qu'à partir de cette date,
            et leur sentiment alimente l'analyse de l'agent IA.
          </p>
        </div>
      </Card>

      <Card title={`Actualités publiées (${rows.length})`}>
        {rows.length === 0 && <div className="text-xs text-slate-500">Aucune actualité pour l'instant.</div>}
        <div className="space-y-2">
          {rows.map((a) => (
            <div key={a.id} className="rounded-lg border border-[#1E293B] p-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-200 font-semibold">{a.title}</div>
                  <div className="text-[10px] text-slate-500">
                    {a.publishedDate} · {a.source || 'source non précisée'} · {a.symbols.length ? a.symbols.join(', ') : 'marché'}
                    {a.url && <> · <a href={a.url} target="_blank" rel="noreferrer" className="text-[#38BDF8] hover:underline">lien</a></>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SentimentBadge label={a.sentimentLabel} score={a.sentimentScore} />
                  <button onClick={() => edit(a)} className="text-slate-400 hover:text-white"><Pencil size={12} /></button>
                  <button onClick={() => remove(a)} className="text-slate-400 hover:text-rose-300"><Trash2 size={12} /></button>
                </div>
              </div>
              <div className="mt-1"><Terms terms={a.terms} /></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Formation ─────────────────────────────────────────────────────

function LearningTab() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    getLearningStats().then(setRows).catch((e) => setError(e.message));
  }, []);
  const TYPE = { QUIZ: 'Quiz', SCENARIO: 'Scénario', CHALLENGE: 'Défi' };
  return (
    <Card title="Contenus pédagogiques : fréquentation et réussite">
      {error && <div className="text-xs text-rose-400">{error}</div>}
      {rows && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="font-normal py-1">Type</th>
                <th className="font-normal">Contenu</th>
                <th className="font-normal text-right">Apprenants</th>
                <th className="font-normal text-right">Tentatives</th>
                <th className="font-normal text-right">Réussite</th>
                <th className="font-normal text-right">Score moyen</th>
                <th className="font-normal">Réponses</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[#1E293B] text-slate-300">
                  <td className="py-1.5 text-slate-500">{TYPE[r.type]}</td>
                  <td>{r.title}</td>
                  <td className="text-right font-mono">{r.learners}</td>
                  <td className="text-right font-mono">{r.attempts}</td>
                  <td className="text-right font-mono">{r.learners ? pct(r.completed / r.learners) : '-'}</td>
                  <td className="text-right font-mono">{pct(r.averageScore)}</td>
                  <td className="text-[11px] text-slate-400">
                    {r.answers ? Object.entries(r.answers).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(' · ') : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] text-slate-500 mt-2">
        Les cours, quiz, scénarios et défis sont versionnés dans <code>backend/src/main/resources/learning/catalog.json</code>, validé au démarrage.
        Pour un scénario, la réussite compte les apprenants ayant pris la meilleure décision.
      </p>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function AdminPage({ currentUser }) {
  const [tab, setTab] = useState('overview');

  if (currentUser?.role !== 'ROLE_ADMIN') {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Accès réservé aux administrateurs.
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-100">
        <ShieldCheck size={18} className="text-[#38BDF8]" />
        <h1 className="text-base font-extrabold">Administration de la plateforme</h1>
      </div>
      <nav className="flex gap-1 border-b border-[#1E293B] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? 'border-[#38BDF8] text-[#38BDF8]' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </nav>
      {tab === 'overview' && <Overview />}
      {tab === 'users' && <UsersTab currentUser={currentUser} />}
      {tab === 'news' && <NewsTab />}
      {tab === 'learning' && <LearningTab />}
      {tab === 'stress' && (
        <Card title="Scénarios de stress testing">
          <p className="text-xs text-slate-300 mb-2">
            Les scénarios personnalisés se créent, se modifient et se suppriment depuis la page Stress Testing : en tant
            qu'administrateur, vous y voyez le formulaire d'enregistrement et les boutons de suppression. Les scénarios
            prédéfinis (réglementaires) ne sont pas modifiables.
          </p>
          <Link to="/stress-test" className="inline-block px-3 py-1.5 rounded-lg bg-[#38BDF8] text-[#0B1120] text-xs font-bold">
            Gérer les scénarios
          </Link>
        </Card>
      )}
      {tab === 'audit' && <AdminAuditPage currentUser={currentUser} />}
    </main>
  );
}
