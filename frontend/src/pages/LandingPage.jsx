import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';
import useScrollSpy from '../hooks/useScrollSpy';

// Composants de navigation et de défilement
import ScrollProgress from '../components/landing/ScrollProgress';
import SectionDots from '../components/landing/SectionDots';
import ScrollControls from '../components/landing/ScrollControls';

// Composant Héro et Modales
import Hero from '../components/landing/Hero';
import AuthModals from '../components/landing/AuthModals';

// Sections d'information sous le héros
import Presentation from '../components/landing/sections/Presentation';
import HowItWorks from '../components/landing/sections/HowItWorks';
import Ranks from '../components/landing/sections/Ranks';
import Tools from '../components/landing/sections/Tools';
import AiAssistant from '../components/landing/sections/AiAssistant';
import Footer from '../components/landing/sections/Footer';

const LANDING_SECTIONS = [
  'hero',
  'presentation',
  'comment-ca-marche',
  'rangs',
  'outils',
  'ia',
  'footer'
];

/**
 * LandingPage
 * Portail d'entrée immersif de PIF Trading Arena.
 * S'inspire des portails fantasy sombres centré-symétriques (arche, blason taureau,
 * torches néon, menus jumeaux, chandeliers de trading, ticker et panneau de login).
 */
export default function LandingPage({ currentUser }) {
  const navigate = useNavigate();

  // Détection automatique de la section active pour la barre latérale et les contrôles
  const activeSection = useScrollSpy(LANDING_SECTIONS, 0.25);

  // État des modales d'inscription ("+") et de récupération ("?")
  const [registerOpen, setRegisterOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  return (
    <div className="relative min-h-screen w-full max-w-full bg-[#05070D] text-slate-100 font-sans selection:bg-amber-500 selection:text-black overflow-x-hidden">
      {/* 1. Barre de progression fine au sommet */}
      <ScrollProgress />

      {/* 2. Indicateurs de navigation latéraux (un point cliquable par section) */}
      <SectionDots activeSection={activeSection} />

      {/* 3. Boutons flottants de défilement rapide ▲ et ▼ */}
      <ScrollControls activeSection={activeSection} />

      {/* 4. Section 1 : HÉRO (Écran initial 100vh sans scroller sur 1440x900) */}
      <Hero
        onOpenRegister={() => setRegisterOpen(true)}
        onOpenForgot={() => setForgotOpen(true)}
      />

      {/* 5. Section 2 : Présentation du jeu & salons multijoueurs */}
      <Presentation />

      {/* 6. Section 3 : Comment ça marche (3 étapes illustrées) */}
      <HowItWorks />

      {/* 7. Section 4 : Rangs de Bronze à Master & seuils ELO */}
      <Ranks />

      {/* 8. Section 5 : Outils de trading pro (SL, TP, Trailing Stop, OCO) */}
      <Tools />

      {/* 9. Section 6 : Assistant IA contextuel en mode PAUSE */}
      <AiAssistant />

      {/* 10. Section 7 : Pied de page et décharge légale pédagogique */}
      <Footer />

      {/* 11. Modales accessibles d'authentification */}
      <AuthModals
        registerOpen={registerOpen}
        forgotOpen={forgotOpen}
        onClose={() => {
          setRegisterOpen(false);
          setForgotOpen(false);
        }}
        onRegisteredSuccess={() => {
          navigate('/lobby');
        }}
      />
    </div>
  );
}
