import React, { useEffect, useState } from 'react';
import { GraduationCap, X, Trophy, BookOpen, ClipboardCheck } from 'lucide-react';
import { getMatchRecommendation } from '../../services/learningRecommendationService';

/**
 * Fenêtre affichée à la fin d'un match : résultat du joueur + cours recommandés d'après ses décisions.
 * onOpenCourse({ moduleId, lessonId, quizId, nextStep }) ouvre le cours dans l'Académie.
 */
export default function MatchResultModal({ roomId, onClose, onOpenCourse }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMatchRecommendation(roomId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [roomId]);

  const s = data?.summary;
  const ret = s ? Number(s.returnPct) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-[#1E293B] bg-[#0B1220] shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Trophy size={16} className="text-amber-400" /> Match terminé
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200" aria-label="Fermer"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-4">
          {!data && !error && <div className="text-xs text-slate-400">Analyse de ton match en cours…</div>}
          {error && <div className="text-xs text-slate-400">Les recommandations ne sont pas disponibles ({error}).</div>}

          {s && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[#111B2E] p-2">
                <div className={`text-base font-bold ${ret >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{ret >= 0 ? '+' : ''}{ret.toFixed(2)} %</div>
                <div className="text-[10px] text-slate-400">Rendement</div>
              </div>
              <div className="rounded-lg bg-[#111B2E] p-2">
                <div className="text-base font-bold text-slate-100">{s.rank} / {s.participants}</div>
                <div className="text-[10px] text-slate-400">Classement</div>
              </div>
              <div className="rounded-lg bg-[#111B2E] p-2">
                <div className="text-base font-bold text-slate-100">{s.tradeCount}</div>
                <div className="text-[10px] text-slate-400">Ordres passés</div>
              </div>
            </div>
          )}

          {data && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <GraduationCap size={14} /> Cours recommandés pour toi
              </div>
              {data.message && <div className="text-xs text-slate-300">{data.message}</div>}
              {data.recommendations.map((r) => (
                <div key={r.moduleId} className="rounded-lg border border-[#1E293B] bg-[#111B2E] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-100">{r.moduleTitle}</div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300">{r.level}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{r.reason}</p>
                  <button
                    onClick={() => onOpenCourse({ moduleId: r.moduleId, lessonId: r.lessonId, quizId: r.quizId, nextStep: r.nextStep })}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#38BDF8] hover:text-sky-300"
                  >
                    {r.nextStep === 'QUIZ' ? <ClipboardCheck size={13} /> : <BookOpen size={13} />}
                    {r.nextStep === 'QUIZ' ? 'Passer le quiz du module' : `Lire : ${r.lessonTitle}`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-[#1E293B] flex justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg bg-[#1E293B] text-slate-200 hover:bg-[#273449]">Fermer</button>
        </div>
      </div>
    </div>
  );
}
