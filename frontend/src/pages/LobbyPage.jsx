import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, GraduationCap, RefreshCw, Award, ShieldAlert, Sparkles } from 'lucide-react';
import { getRooms, joinArenaRoom } from '../services/api';
import RoomList from '../components/lobby/RoomList';
import CreateRoomModal from '../components/lobby/CreateRoomModal';
import AcademyView from '../components/lobby/AcademyView';

export default function LobbyPage({ currentUser }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ARENAS'); // 'ARENAS' | 'ACADEMY'
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isAgentOrAdmin = currentUser?.role === 'ROLE_ADMIN' || currentUser?.role === 'ROLE_AGENT';

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRooms();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Impossible de charger les arènes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleJoinRoom = async (roomId) => {
    try {
      await joinArenaRoom(roomId);
      navigate(`/arena/${roomId}`);
    } catch (err) {
      alert(`Erreur d'accès à l'arène : ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080C14] overflow-y-auto">
      {/* Top Banner & Navigation Header */}
      <div className="border-b border-[#1E293B] bg-[#0B1120] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-[#080C14] rounded-xl border border-[#1E293B]">
            <button
              onClick={() => setActiveTab('ARENAS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                activeTab === 'ARENAS'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy size={15} /> Arènes Compétitives
            </button>
            <button
              onClick={() => setActiveTab('ACADEMY')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                activeTab === 'ACADEMY'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap size={15} /> Académie & Risques
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* User ELO Profile Badge */}
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#080C14] border border-[#1E293B] font-mono text-xs">
              <Award size={14} className="text-yellow-400" />
              <span className="text-slate-300 font-bold">{currentUser.username || currentUser.email}</span>
              <span className="text-sky-400 font-black">[{currentUser.eloRating || 1000} ELO]</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {currentUser.tier || 'Silver'}
              </span>
            </div>
          )}

          <button
            onClick={loadRooms}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 border border-[#1E293B] hover:border-[#334155] transition-all"
            title="Rafraîchir"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {isAgentOrAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-md shadow-sky-950/40 transition-all"
            >
              <Plus size={15} /> Créer une Arène
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-6 max-w-7xl mx-auto w-full flex-1">
        {error && (
          <div className="p-4 mb-4 rounded-xl bg-rose-950/40 border border-rose-700/50 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'ARENAS' ? (
          <RoomList
            rooms={rooms}
            currentUser={currentUser}
            onJoin={handleJoinRoom}
            selectedTier={selectedTier}
            onSelectTier={setSelectedTier}
          />
        ) : (
          <AcademyView />
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newRoom) => {
            setShowCreateModal(false);
            loadRooms();
            if (newRoom?.id) {
              navigate(`/arena/${newRoom.id}`);
            }
          }}
        />
      )}
    </div>
  );
}
