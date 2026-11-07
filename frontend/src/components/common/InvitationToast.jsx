import React from 'react';
import { Mail, Check, X, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { acceptInvitation, declineInvitation } from '../../services/api';

export default function InvitationToast({ invitation, onDismiss }) {
  const navigate = useNavigate();

  if (!invitation) return null;

  const handleAccept = async () => {
    try {
      await acceptInvitation(invitation.id);
      onDismiss();
      navigate(`/arena/${invitation.roomId}`);
    } catch (e) {
      console.error('Erreur acceptation:', e);
      navigate(`/arena/${invitation.roomId}`);
    }
  };

  const handleDecline = async () => {
    try {
      await declineInvitation(invitation.id);
    } catch (e) {}
    onDismiss();
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] animate-bounce-in max-w-md w-full bg-[#0F172A] border-2 border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.35)] rounded-2xl p-4 text-slate-100 flex flex-col gap-3 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <Mail size={18} />
          </div>
          <div>
            <h4 className="text-xs uppercase font-black tracking-wider text-emerald-400">
              Invitation en Direct
            </h4>
            <p className="text-sm font-bold text-slate-100 mt-0.5">
              <span className="text-sky-300 font-extrabold">{invitation.senderUsername || 'Un ami'}</span> vous défie dans l'arène :
            </p>
            <p className="text-xs font-mono text-slate-300 font-semibold mt-0.5">
              {invitation.roomName} <span className="px-1.5 py-0.2 rounded bg-slate-800 text-sky-400 font-bold border border-slate-700">{invitation.roomId}</span>
            </p>
          </div>
        </div>
        <button
          onClick={handleDecline}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
        <button
          onClick={handleAccept}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-950 transition-all active:scale-95"
        >
          <Check size={14} /> Accepter & Rejoindre
        </button>
        <button
          onClick={handleDecline}
          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all"
        >
          Refuser
        </button>
      </div>
    </div>
  );
}

