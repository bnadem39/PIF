import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import GamifiedHubPage from './pages/GamifiedHubPage';
import ProfilePage from './pages/ProfilePage';
import RoomArenaPage from './pages/RoomArenaPage';
import SpectatorArenaPage from './pages/SpectatorArenaPage';
import AdminPage from './pages/AdminPage';
import AdminAuditPage from './pages/AdminAuditPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BootstrapLoader from './components/common/BootstrapLoader';
import AuthModal from './components/AuthModal';
import InvitationToast from './components/common/InvitationToast';
import { getCurrentUser, logoutUser } from './services/api';
import { subscribeToInvitations } from './services/websocket';
import { applyThemeSkin } from './utils/colorPaletteExtractor';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('LOGIN'); // 'LOGIN' ou 'REGISTER'
  const [incomingInvitation, setIncomingInvitation] = useState(null);

  // Phase de bootstrap initial : vérification d'état et initialisation douce
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBootstrapping(false);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  // Application immédiate du thème personnalisé stocké (fond GIF/photo et couleur néon)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pif_custom_theme');
      if (saved) {
        const parsed = JSON.parse(saved);
        applyThemeSkin(parsed);
      }
    } catch (_) {}
  }, []);

  // Écoute temps réel des invitations de parties via WebSocket STOMP
  useEffect(() => {
    const username = currentUser?.usernameAlias || currentUser?.username || currentUser?.email?.split('@')[0];
    if (!username) return;

    const sub = subscribeToInvitations(username, (inv) => {
      setIncomingInvitation(inv);
    });

    return () => sub.disconnect();
  }, [currentUser]);

  const handleAuthSuccess = (userData) => {
    const updated = getCurrentUser();
    setCurrentUser(updated || userData);
    setIsAuthModalOpen(false);
  };

  const handleOpenLogin = () => {
    setAuthModalMode('LOGIN');
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (_) {}
    setCurrentUser(null);
    window.location.href = '/';
  };

  if (isBootstrapping) {
    return <BootstrapLoader message="Vérification des identifiants et chargement de l'arène..." />;
  }

  return (
    <div className="flex flex-col min-h-screen w-screen bg-[#080C14] text-[#F8FAFC] overflow-x-hidden font-sans select-none">
      {/* Toast d'invitation temps réel flottant non bloquant */}
      {incomingInvitation && (
        <InvitationToast
          invitation={incomingInvitation}
          onDismiss={() => setIncomingInvitation(null)}
        />
      )}

      {/* Routage Principal Sécurisé de l'Application */}
      <Routes>
        {/* ROUTE RACINE : Si authentifié -> Lobby, sinon -> Public Landing Page */}
        <Route
          path="/"
          element={
            currentUser ? (
              <Navigate to="/lobby" replace />
            ) : (
              <LandingPage currentUser={null} />
            )
          }
        />

        {/* PAGES D'AUTHENTIFICATION DÉDIÉES */}
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/lobby" replace />
            ) : (
              <LoginPage onLoginSuccess={handleAuthSuccess} />
            )
          }
        />

        <Route
          path="/register"
          element={
            currentUser ? (
              <Navigate to="/lobby" replace />
            ) : (
              <RegisterPage onRegisterSuccess={handleAuthSuccess} />
            )
          }
        />

        {/* LOBBY MULTIJOUEUR GAMIFIÉ (PROTÉGÉ : Authentification requise) */}
        <Route
          path="/lobby"
          element={
            currentUser ? (
              <GamifiedHubPage
                currentUser={currentUser}
                onOpenAuthModal={handleOpenLogin}
                onLogout={handleLogout}
                initialTab="ARENAS"
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/academy"
          element={
            currentUser ? (
              <GamifiedHubPage
                currentUser={currentUser}
                onOpenAuthModal={handleOpenLogin}
                onLogout={handleLogout}
                initialTab="ACADEMY"
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/learn"
          element={
            currentUser ? (
              <GamifiedHubPage
                currentUser={currentUser}
                onOpenAuthModal={handleOpenLogin}
                onLogout={handleLogout}
                initialTab="ACADEMY"
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* PROFIL JOUEUR INDÉPENDANT (PROTÉGÉ) */}
        <Route
          path="/profile"
          element={
            currentUser ? (
              <ProfilePage
                currentUser={currentUser}
                onOpenAuthModal={handleOpenLogin}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* SALLES DE MATCH MULTIJOUEUR (PROTÉGÉ) */}
        <Route
          path="/arena/:roomId"
          element={
            currentUser ? (
              <RoomArenaPage currentUser={currentUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/room/:roomId"
          element={
            currentUser ? (
              <RoomArenaPage currentUser={currentUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* MODE SPECTATEUR ESPORTS */}
        <Route
          path="/spectator/:roomId"
          element={<SpectatorArenaPage currentUser={currentUser} />}
        />

        {/* MODULES D'ADMINISTRATION (PROTÉGÉS) */}
        <Route
          path="/admin"
          element={
            currentUser ? (
              <AdminPage currentUser={currentUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin/audit"
          element={
            currentUser ? (
              <AdminAuditPage currentUser={currentUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Fallback vers la racine */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Modal d'authentification globale */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
