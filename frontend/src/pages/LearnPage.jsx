import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, BookOpen, CheckCircle2, Circle, ChevronLeft, Lightbulb, Trophy, Target, LineChart as ChartIcon,
  Award, Lock, XCircle, Play
} from 'lucide-react';
import {
  getLearningCatalog, getLesson, completeLesson, getQuiz, submitQuiz, getScenario, answerScenario,
  submitChallenge, getLeaderboard
} from '../services/learningService';
import { getBacktestStrategies } from '../services/backtestService';

const pct = (v, d = 1) => (v == null ? '-' : `${(v * 100).toFixed(d)} %`);
const num = (v, d = 2) => (v == null ? '-' : v.toFixed(d));

const TABS = [
  { id: 'parcours', label: 'Parcours', icon: BookOpen },
  { id: 'scenarios', label: 'Scénarios', icon: ChartIcon },
  { id: 'defis', label: 'Défis', icon: Target },
  { id: 'classement', label: 'Classement', icon: Trophy }
];

const DECISIONS = [
  { id: 'ACHETER', label: 'Acheter', cls: 'bg-emerald-600 hover:bg-emerald-500' },
  { id: 'ATTENDRE', label: 'Attendre', cls: 'bg-slate-600 hover:bg-slate-500' },
  { id: 'VENDRE', label: 'Vendre / rester à l\'écart', cls: 'bg-rose-600 hover:bg-rose-500' }
];
const DECISION_LABEL = { ACHETER: 'Acheter', ATTENDRE: 'Attendre', VENDRE: 'Vendre' };

// Stratégies proposées pour les défis : l'achat-conservation et l'IA servent de référence
const CHALLENGE_STRATEGIES = ['SMA_CROSSOVER', 'RSI_REVERSION', 'MACD_CROSSOVER', 'BOLLINGER_REVERSION'];

function criterionText(c) {
  const exposure = c.minExposure != null ? `, investi au moins ${pct(c.minExposure, 0)} du temps` : '';
  switch (c.type) {
    case 'BEAT_BUY_AND_HOLD_RETURN': return `Rendement supérieur à l'achat-conservation${exposure}`;
    case 'MIN_SHARPE': return `Ratio de Sharpe ≥ ${num(c.value)}${exposure}`;
    case 'MAX_DRAWDOWN_ABOVE': return `Perte maximale au-dessus de ${pct(c.value, 0)}${exposure}`;
    default: return c.type;
  }
}

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

function Bar({ value, color = '#38BDF8' }) {
  return (
    <div className="h-1.5 rounded-full bg-[#1E293B] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, background: color }} />
    </div>
  );
}

// ── En-tête de progression ────────────────────────────────────────

function ProgressHeader({ progress }) {
  if (!progress) return null;
  const span = progress.nextLevelPoints != null ? progress.nextLevelPoints - progress.levelStartPoints : 1;
  const within = progress.nextLevelPoints != null ? (progress.points - progress.levelStartPoints) / span : 1;
  const stats = [
    ['Leçons', `${progress.lessonsDone}/${progress.lessonsTotal}`],
    ['Quiz réussis', `${progress.quizzesPassed}/${progress.quizzesTotal}`],
    ['Scénarios', `${progress.scenariosAnswered}/${progress.scenariosTotal}`],
    ['Défis', `${progress.challengesDone}/${progress.challengesTotal}`]
  ];
  return (
    <Card>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-extrabold text-slate-100 font-mono">{progress.points}</span>
            <span className="text-xs text-slate-400">points</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#38BDF8]/15 text-[#38BDF8]">{progress.levelName}</span>
            {progress.rank && <span className="text-xs text-slate-400">· {progress.rank}<sup>{progress.rank === 1 ? 'er' : 'e'}</sup> au classement</span>}
          </div>
          <Bar value={within} />
          <div className="text-[11px] text-slate-500">
            {progress.nextLevelPoints != null
              ? `${progress.nextLevelPoints - progress.points} points avant le niveau suivant`
              : 'Niveau maximal atteint'}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
            {stats.map(([k, v]) => <span key={k}>{k} <b className="text-slate-200 font-mono">{v}</b></span>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 lg:max-w-md lg:justify-end">
          {progress.badges.map((b) => (
            <span
              key={b.id}
              title={b.description}
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border ${b.earned
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                : 'border-[#1E293B] text-slate-600'}`}
            >
              {b.earned ? <Award size={12} /> : <Lock size={12} />}
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Parcours : modules, leçons, quiz ──────────────────────────────

function ModuleGrid({ modules, onLesson, onQuiz }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
      {modules.map((m) => (
        <Card key={m.id} title={m.level} right={<span className="text-[11px] font-mono text-slate-400">{pct(m.progress, 0)}</span>}>
          <h3 className="text-sm font-bold text-slate-100">{m.title}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-2">{m.description}</p>
          <Bar value={m.progress} color={m.progress >= 1 ? '#34D399' : '#38BDF8'} />
          <ul className="mt-2 space-y-1">
            {m.lessons.map((l) => (
              <li key={l.id}>
                <button onClick={() => onLesson(l.id)} className="w-full flex items-center gap-2 text-left text-xs text-slate-300 hover:text-white">
                  {l.completed ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> : <Circle size={14} className="text-slate-600 shrink-0" />}
                  <span className="flex-1">{l.title}</span>
                  <span className="text-[10px] text-slate-500">{l.minutes} min</span>
                </button>
              </li>
            ))}
            <li>
              <button onClick={() => onQuiz(m.quiz.id)} className="w-full flex items-center gap-2 text-left text-xs text-slate-300 hover:text-white">
                {m.quiz.passed ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> : <Lightbulb size={14} className="text-amber-400 shrink-0" />}
                <span className="flex-1">Quiz · {m.quiz.questions} questions</span>
                <span className="text-[10px] text-slate-500">{m.quiz.bestScore != null ? `meilleur ${pct(m.quiz.bestScore, 0)}` : `réussite ${pct(m.quiz.passScore, 0)}`}</span>
              </button>
            </li>
          </ul>
        </Card>
      ))}
    </div>
  );
}

function LessonBlock({ block }) {
  switch (block.type) {
    case 'p':
      return <p className="text-sm text-slate-300 leading-relaxed">{block.text}</p>;
    case 'list':
      return (
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
          {block.items.map((it) => <li key={it}>{it}</li>)}
        </ul>
      );
    case 'tip':
      return (
        <div className="flex gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-sm text-amber-200">
          <Lightbulb size={16} className="shrink-0 mt-0.5" />
          <span>{block.text}</span>
        </div>
      );
    case 'formula':
      return (
        <div className="rounded-lg bg-[#0B1120] border border-[#1E293B] px-3 py-2">
          <div className="font-mono text-sm text-[#38BDF8]">{block.text}</div>
          {block.legend && <div className="text-[11px] text-slate-500 mt-1">{block.legend}</div>}
        </div>
      );
    case 'link':
      return (
        <Link to={block.to} className="inline-flex items-center gap-1 text-sm font-semibold text-[#38BDF8] hover:underline">
          <Play size={12} /> {block.label}
        </Link>
      );
    default:
      return null;
  }
}

function LessonReader({ lessonId, onBack, onProgress, onNext }) {
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLesson(null);
    getLesson(lessonId).then(setLesson).catch((e) => setError(e.message));
  }, [lessonId]);

  const finish = async () => {
    setSaving(true);
    try {
      onProgress(await completeLesson(lessonId));
      setLesson((l) => ({ ...l, completed: true }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2">
        <ChevronLeft size={14} /> Tous les modules
      </button>
      {error && <div className="text-xs text-rose-400">{error}</div>}
      {lesson && (
        <article className="max-w-3xl space-y-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-100">{lesson.title}</h3>
            <div className="text-[11px] text-slate-500">{lesson.minutes} min de lecture</div>
          </div>
          {lesson.blocks.map((b, i) => <LessonBlock key={i} block={b} />)}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1E293B]">
            {lesson.completed ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 size={14} /> Leçon terminée</span>
            ) : (
              <button onClick={finish} disabled={saving} className="px-3 py-1.5 rounded-lg bg-[#38BDF8] text-[#0B1120] text-xs font-bold disabled:opacity-50">
                Marquer comme terminée (+10 points)
              </button>
            )}
            {onNext && (
              <button onClick={onNext.go} className="px-3 py-1.5 rounded-lg border border-[#334155] text-xs text-slate-200 hover:border-slate-400">
                {onNext.label} →
              </button>
            )}
          </div>
        </article>
      )}
    </Card>
  );
}

function QuizRunner({ quizId, onBack, onDone }) {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setQuiz(null);
    setResult(null);
    setAnswers({});
    getQuiz(quizId).then(setQuiz).catch((e) => setError(e.message));
  }, [quizId]);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const r = await submitQuiz(quizId, answers);
      setResult(r);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const byId = Object.fromEntries((result?.questions || []).map((q) => [q.id, q]));
  const allAnswered = quiz && quiz.questions.every((q) => answers[q.id] != null);

  return (
    <Card>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2">
        <ChevronLeft size={14} /> Tous les modules
      </button>
      {error && <div className="text-xs text-rose-400 mb-2">{error}</div>}
      {quiz && (
        <div className="max-w-3xl space-y-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-100">{quiz.title}</h3>
            <div className="text-[11px] text-slate-500">
              Réussite à partir de {pct(quiz.passScore, 0)} · {quiz.bestScore != null ? `meilleur score ${pct(quiz.bestScore, 0)}` : 'premier essai'}
            </div>
          </div>
          {result && (
            <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${result.passed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
              {pct(result.score, 0)} de bonnes réponses · {result.passed ? 'quiz réussi' : 'pas encore réussi'}
              {result.points > 0 ? ` · +${result.points} points` : ''}
            </div>
          )}
          {quiz.questions.map((q, qi) => {
            const r = byId[q.id];
            return (
              <div key={q.id} className="rounded-lg border border-[#1E293B] p-3">
                <div className="text-sm text-slate-200 font-semibold mb-2">{qi + 1}. {q.text}</div>
                <div className="space-y-1">
                  {q.options.map((opt, oi) => {
                    const chosen = answers[q.id] === oi;
                    let cls = chosen ? 'border-[#38BDF8] bg-[#38BDF8]/10' : 'border-[#1E293B] hover:border-[#334155]';
                    if (r && oi === r.answer) cls = 'border-emerald-500 bg-emerald-500/10';
                    else if (r && chosen) cls = 'border-rose-500 bg-rose-500/10';
                    return (
                      <label key={oi} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs text-slate-300 cursor-pointer ${cls}`}>
                        <input
                          type="radio"
                          name={q.id}
                          checked={chosen}
                          disabled={!!result}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                          className="accent-[#38BDF8]"
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
                {r && (
                  <div className={`mt-2 flex gap-1.5 text-[11px] ${r.correct ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {r.correct ? <CheckCircle2 size={13} className="shrink-0" /> : <XCircle size={13} className="shrink-0" />}
                    <span className="text-slate-400">{r.explanation}</span>
                  </div>
                )}
              </div>
            );
          })}
          {result ? (
            <button onClick={() => { setResult(null); setAnswers({}); }} className="px-3 py-1.5 rounded-lg border border-[#334155] text-xs text-slate-200">
              Recommencer
            </button>
          ) : (
            <button onClick={send} disabled={!allAnswered || sending} className="px-3 py-1.5 rounded-lg bg-[#38BDF8] text-[#0B1120] text-xs font-bold disabled:opacity-40">
              Valider mes réponses
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Scénarios de marché ───────────────────────────────────────────

function PriceChart({ history, after }) {
  const width = 900;
  const height = 260;
  const pad = { l: 60, r: 8, t: 10, b: 20 };
  const all = [...history, ...(after || [])];
  const n = all.length;
  if (!n) return null;
  let min = Math.min(...all.map((p) => p.close));
  let max = Math.max(...all.map((p) => p.close));
  if (max === min) max = min + 1;
  // L'axe des dates réserve dès le départ la place de la suite, pour que le graphique ne se redimensionne pas
  const slots = history.length + (after ? after.length : Math.round(history.length / 6));
  const x = (i) => pad.l + (i / Math.max(1, slots - 1)) * (width - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (height - pad.t - pad.b);
  const fmt = (v) => (v >= 1000 ? Math.round(v).toLocaleString('fr-FR') : v.toFixed(2));
  const d = history.length - 1;
  const line = (pts, offset) => pts.map((p, i) => `${x(i + offset).toFixed(1)},${y(p.close).toFixed(1)}`).join(' ');
  const up = after && after[after.length - 1].close >= history[d].close;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const v = min + f * (max - min);
        return (
          <g key={f}>
            <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke="#1E293B" />
            <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#64748B">{fmt(v)}</text>
          </g>
        );
      })}
      <text x={x(0)} y={height - 4} fontSize="10" fill="#64748B">{history[0].date}</text>
      <text x={x(d)} y={height - 4} textAnchor="middle" fontSize="10" fill="#E2E8F0">{history[d].date}</text>
      {after && <text x={x(n - 1)} y={height - 4} textAnchor="end" fontSize="10" fill="#64748B">{after[after.length - 1].date}</text>}
      <line x1={x(d)} x2={x(d)} y1={pad.t} y2={height - pad.b} stroke="#475569" strokeDasharray="3 3" />
      <polyline fill="none" stroke="#38BDF8" strokeWidth="2" points={line(history, 0)} />
      {after && (
        <polyline
          fill="none"
          stroke={up ? '#34D399' : '#F87171'}
          strokeWidth="2"
          points={`${x(d).toFixed(1)},${y(history[d].close).toFixed(1)} ${line(after, d + 1)}`}
        />
      )}
      {!after && (
        <text x={(x(d) + width - pad.r) / 2} y={height / 2} textAnchor="middle" fontSize="28" fill="#334155" fontWeight="bold">?</text>
      )}
    </svg>
  );
}

function ScenariosTab({ scenarios, onProgressChange }) {
  const [selected, setSelected] = useState(scenarios[0]?.id);
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setView(null);
    setError(null);
    getScenario(selected).then(setView).catch((e) => setError(e.message));
  }, [selected]);

  const answer = async (decision) => {
    setSending(true);
    try {
      setView(await answerScenario(selected, decision));
      onProgressChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const o = view?.outcome;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-3 items-start">
      <Card title="Situations réelles">
        <ul className="space-y-1">
          {scenarios.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setSelected(s.id)}
                className={`w-full text-left rounded-lg px-2 py-1.5 border ${selected === s.id ? 'border-[#38BDF8] bg-[#38BDF8]/10' : 'border-transparent hover:border-[#1E293B]'}`}
              >
                <div className="flex items-center gap-2 text-xs text-slate-200">
                  {s.answered ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> : <Circle size={13} className="text-slate-600 shrink-0" />}
                  <span className="flex-1">{s.title}</span>
                </div>
                <div className="text-[10px] text-slate-500 pl-5">
                  {s.symbol} · {s.decisionDate}{s.answered ? ` · ${s.points} pts` : ''}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card title={view ? `${view.symbol} · décision le ${view.decisionDate}` : 'Scénario'}>
        {error && <div className="text-xs text-rose-400">{error}</div>}
        {view && (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-100">{view.title}</h3>
              <p className="text-sm text-slate-300 mt-1">{view.context}</p>
            </div>
            <PriceChart history={view.history} after={o?.after} />
            {!o ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-400">
                  Que faites-vous à la clôture du {view.decisionDate} ? La suite des {view.horizonDays} séances sera révélée après votre choix (une seule réponse).
                </div>
                <div className="flex flex-wrap gap-2">
                  {DECISIONS.map((d) => (
                    <button key={d.id} disabled={sending} onClick={() => answer(d.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 ${d.cls}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`rounded-lg border px-3 py-2 ${o.decision === o.bestDecision ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 mb-1">
                  <span>Votre choix <b className="text-slate-100">{DECISION_LABEL[o.decision]}</b></span>
                  <span>Meilleure décision <b className="text-slate-100">{DECISION_LABEL[o.bestDecision]}</b></span>
                  <span>Variation <b className={o.marketReturn >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{o.marketReturn >= 0 ? '+' : ''}{pct(o.marketReturn)}</b></span>
                  <span>Points <b className="text-amber-300">{o.points}</b></span>
                </div>
                <p className="text-sm text-slate-300">{o.explanation}</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Défis de backtesting ──────────────────────────────────────────

function ChallengesTab({ challenges, onProgressChange }) {
  const [strategies, setStrategies] = useState([]);
  const [selected, setSelected] = useState(challenges[0]?.id);
  const [type, setType] = useState('SMA_CROSSOVER');
  const [params, setParams] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    getBacktestStrategies()
      .then((list) => setStrategies(list.filter((s) => CHALLENGE_STRATEGIES.includes(s.type))))
      .catch((e) => setError(e.message));
  }, []);

  const challenge = challenges.find((c) => c.id === selected);
  const info = strategies.find((s) => s.type === type);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await submitChallenge(selected, { type, params: params[type] || {} }));
      onProgressChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const inputCls = 'w-full mt-0.5 bg-[#1E293B] border border-[#334155] rounded px-1.5 py-1 text-xs text-slate-200';
  const rows = [
    ['Rendement', 'totalReturn', pct],
    ['Sharpe', 'sharpe', num],
    ['Perte max.', 'maxDrawdown', pct],
    ['Exposition', 'exposure', (v) => pct(v, 0)],
    ['Trades', 'trades', (v) => v]
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-3 items-start">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {challenges.map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelected(c.id); setResult(null); }}
            className={`text-left rounded-xl border p-3 bg-[#0F172A] ${selected === c.id ? 'border-[#38BDF8]' : 'border-[#1E293B] hover:border-[#334155]'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-100">{c.title}</h3>
              <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${c.completed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>
                {c.completed ? 'Réussi' : `${c.points} pts`}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{c.symbol} · {c.startDate} → {c.endDate}</div>
            <p className="text-xs text-slate-300 mt-1.5">{c.description}</p>
            <div className="text-[11px] text-[#38BDF8] mt-1.5 flex items-center gap-1"><Target size={12} /> {criterionText(c.criterion)}</div>
            {c.attempts > 0 && <div className="text-[10px] text-slate-500 mt-1">{c.attempts} essai{c.attempts > 1 ? 's' : ''}</div>}
          </button>
        ))}
      </div>

      {challenge && (
        <Card title="Votre stratégie">
          <div className="space-y-2">
            <div className="text-xs text-slate-200 font-semibold">{challenge.title}</div>
            <label className="block text-[11px] text-slate-400">
              Stratégie
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                {strategies.map((s) => <option key={s.type} value={s.type}>{s.label}</option>)}
              </select>
            </label>
            {info && (
              <div className="grid grid-cols-2 gap-1.5">
                {info.params.map((p) => (
                  <label key={p.name} className="text-[11px] text-slate-400">
                    {p.label}
                    <input
                      type="number"
                      min={p.min}
                      max={p.max}
                      step={p.integer ? 1 : 0.1}
                      value={params[type]?.[p.name] ?? p.defaultValue}
                      onChange={(e) => {
                        const v = e.target.value === '' ? undefined : Number(e.target.value);
                        setParams((all) => ({ ...all, [type]: { ...(all[type] || {}), [p.name]: v } }));
                      }}
                      className={inputCls}
                    />
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-1.5 text-[11px] text-slate-500"><Lightbulb size={13} className="shrink-0 text-amber-400" /> {challenge.hint}</div>
            <button onClick={run} disabled={running || !info} className="w-full px-3 py-1.5 rounded-lg bg-[#38BDF8] text-[#0B1120] text-xs font-bold disabled:opacity-50">
              {running ? 'Backtest en cours…' : 'Tester la stratégie'}
            </button>
            {error && <div className="text-xs text-rose-400">{error}</div>}
            {result && (
              <div className={`rounded-lg border p-2 space-y-2 ${result.passed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'}`}>
                <div className={`text-xs font-bold ${result.passed ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {result.passed ? 'Défi réussi' : 'Pas encore'}{result.pointsEarned > 0 ? ` · +${result.pointsEarned} points` : ''}
                </div>
                <div className="text-[11px] text-slate-300">{result.message}</div>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="text-left font-normal" />
                      <th className="text-right font-normal">{result.strategyLabel}</th>
                      <th className="text-right font-normal">Achat-conservation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([label, key, f]) => (
                      <tr key={key} className="border-t border-[#1E293B]">
                        <td className="py-0.5 text-slate-400">{label}</td>
                        <td className="py-0.5 text-right font-mono text-slate-100">{f(result.metrics[key])}</td>
                        <td className="py-0.5 text-right font-mono text-slate-400">{f(result.buyAndHold[key])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Classement ────────────────────────────────────────────────────

function LeaderboardTab() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    getLeaderboard(20).then(setRows).catch((e) => setError(e.message));
  }, []);
  return (
    <Card title="Classement des apprenants" className="max-w-2xl">
      {error && <div className="text-xs text-rose-400">{error}</div>}
      {rows && rows.length === 0 && <div className="text-xs text-slate-500">Personne n'a encore marqué de points.</div>}
      {rows && rows.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 text-left">
              <th className="font-normal py-1 w-10">#</th>
              <th className="font-normal">Apprenant</th>
              <th className="font-normal">Niveau</th>
              <th className="font-normal text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.rank} className={`border-t border-[#1E293B] ${r.me ? 'bg-[#38BDF8]/10 text-[#38BDF8]' : 'text-slate-300'}`}>
                <td className="py-1.5 font-mono">{r.rank}</td>
                <td>{r.name}{r.me ? ' (vous)' : ''}</td>
                <td>{r.levelName}</td>
                <td className="text-right font-mono">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function LearnPage({ currentUser }) {
  const [tab, setTab] = useState('parcours');
  const [catalog, setCatalog] = useState(null);
  const [view, setView] = useState(null); // {kind: 'lesson'|'quiz', id}
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    getLearningCatalog().then(setCatalog).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (currentUser) reload();
  }, [currentUser, reload]);

  // Étape suivante du module : leçon suivante, puis le quiz
  const next = useMemo(() => {
    if (!catalog || view?.kind !== 'lesson') return null;
    const m = catalog.modules.find((mod) => mod.lessons.some((l) => l.id === view.id));
    if (!m) return null;
    const i = m.lessons.findIndex((l) => l.id === view.id);
    if (i + 1 < m.lessons.length) {
      const l = m.lessons[i + 1];
      return { label: l.title, go: () => setView({ kind: 'lesson', id: l.id }) };
    }
    return { label: 'Passer le quiz', go: () => setView({ kind: 'quiz', id: m.quiz.id }) };
  }, [catalog, view]);

  if (!currentUser) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Connectez-vous pour suivre la formation.
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-100">
        <GraduationCap size={18} className="text-[#38BDF8]" />
        <h1 className="text-base font-extrabold">Formation & apprentissage</h1>
      </div>

      {error && <div className="text-xs text-rose-400">{error}</div>}
      <ProgressHeader progress={catalog?.progress} />

      <nav className="flex gap-1 border-b border-[#1E293B] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setView(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? 'border-[#38BDF8] text-[#38BDF8]' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </nav>

      {catalog && tab === 'parcours' && !view && (
        <ModuleGrid
          modules={catalog.modules}
          onLesson={(id) => setView({ kind: 'lesson', id })}
          onQuiz={(id) => setView({ kind: 'quiz', id })}
        />
      )}
      {catalog && tab === 'parcours' && view?.kind === 'lesson' && (
        <LessonReader
          lessonId={view.id}
          onBack={() => setView(null)}
          onProgress={(progress) => { setCatalog((c) => ({ ...c, progress })); reload(); }}
          onNext={next}
        />
      )}
      {catalog && tab === 'parcours' && view?.kind === 'quiz' && (
        <QuizRunner quizId={view.id} onBack={() => setView(null)} onDone={reload} />
      )}
      {catalog && tab === 'scenarios' && <ScenariosTab scenarios={catalog.scenarios} onProgressChange={reload} />}
      {catalog && tab === 'defis' && <ChallengesTab challenges={catalog.challenges} onProgressChange={reload} />}
      {tab === 'classement' && <LeaderboardTab />}
    </main>
  );
}
