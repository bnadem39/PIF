import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Trophy, Sparkles, X, Check, Volume2, VolumeX,
  Award, Shield, Zap, Flame, Crown, Star
} from 'lucide-react';
import {
  playCelebrationSfx, speakCelebration, stopCelebrationAudio,
  getAudioSettings, saveAudioSettings
} from '../../../utils/celebrationAudio';

const RARITY_THEMES = {
  COMMON: { main: 0x94a3b8, hex: '#94a3b8', label: 'Commun', glow: 'rgba(148, 163, 184, 0.4)' },
  UNCOMMON: { main: 0x10b981, hex: '#10b981', label: 'Atypique', glow: 'rgba(16, 185, 129, 0.4)' },
  RARE: { main: 0x0284c7, hex: '#0284c7', label: 'Rare', glow: 'rgba(2, 132, 199, 0.45)' },
  EPIC: { main: 0x8b5cf6, hex: '#8b5cf6', label: 'Épique', glow: 'rgba(139, 92, 246, 0.45)' },
  LEGENDARY: { main: 0xf59e0b, hex: '#f59e0b', label: 'Légendaire', glow: 'rgba(245, 158, 11, 0.5)' },
  MYTHIC: { main: 0xec4899, hex: '#ec4899', label: 'Mythique', glow: 'rgba(236, 72, 153, 0.55)' }
};

export default function CompactCelebration3D({ event, onDismiss }) {
  const mountRef = useRef(null);
  const animFrameRef = useRef(null);
  const [audioEnabled, setAudioEnabled] = useState(getAudioSettings().master);
  const [progress, setProgress] = useState(100);
  const [webglError, setWebglError] = useState(false);

  const rarity = RARITY_THEMES[event.rarity] || RARITY_THEMES.LEGENDARY;

  // Initialisation audio + synthèse vocale
  useEffect(() => {
    playCelebrationSfx(event.eventType);
    speakCelebration(event.eventType, event.title);

    return () => {
      stopCelebrationAudio();
    };
  }, [event]);

  // Décompte auto-dismiss de 5 secondes avec barre de progression
  useEffect(() => {
    const duration = 5000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onDismiss]);

  const toggleAudio = (e) => {
    e.stopPropagation();
    const updated = !audioEnabled;
    setAudioEnabled(updated);
    saveAudioSettings({ master: updated });
    if (!updated) {
      stopCelebrationAudio();
    }
  };

  // Rendu Three.js du motif 3D compact et spécifique à l'événement
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const size = 190; // Motif compact non-intrusif
    let renderer;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (_) {
      setWebglError(true);
      return;
    }

    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.3, 4.2);

    // Lumières douces et reflets métalliques contrôlés
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const coloredPointLight = new THREE.PointLight(rarity.main, 3.5, 10);
    coloredPointLight.position.set(-2, 1, 2);
    scene.add(coloredPointLight);

    const motifGroup = new THREE.Group();
    scene.add(motifGroup);

    // Création du motif 3D spécifique selon l'événement
    const metallicMat = new THREE.MeshStandardMaterial({
      color: rarity.main,
      metalness: 0.85,
      roughness: 0.22,
      emissive: rarity.main,
      emissiveIntensity: 0.18
    });

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.18
    });

    // 1. MOTIF 3D ADAPTÉ À L'ÉVÉNEMENT
    if (event.eventType === 'SKILL_UNLOCKED' || event.eventType === 'SKILL_COMPLETED') {
      // Cristal d'Énergie Octaédrique
      const crystalGeo = new THREE.OctahedronGeometry(1.0, 0);
      const crystalMesh = new THREE.Mesh(crystalGeo, metallicMat);
      motifGroup.add(crystalMesh);

      // Anneau orbital fin
      const ringGeo = new THREE.TorusGeometry(1.35, 0.04, 16, 64);
      const ringMesh = new THREE.Mesh(ringGeo, goldAccentMat);
      ringMesh.rotation.x = Math.PI / 3;
      motifGroup.add(ringMesh);

    } else if (event.eventType === 'SKILL_MASTERED') {
      // Diamant Émeraude de Maîtrise
      const gemGeo = new THREE.IcosahedronGeometry(1.0, 0);
      const gemMesh = new THREE.Mesh(gemGeo, new THREE.MeshStandardMaterial({
        color: 0x10b981,
        metalness: 0.75,
        roughness: 0.15,
        emissive: 0x059669,
        emissiveIntensity: 0.25
      }));
      motifGroup.add(gemMesh);

      const ringGeo = new THREE.TorusGeometry(1.4, 0.035, 16, 64);
      const ringMesh = new THREE.Mesh(ringGeo, goldAccentMat);
      ringMesh.rotation.y = Math.PI / 4;
      motifGroup.add(ringMesh);

    } else if (event.eventType === 'LEVEL_UP') {
      // Emblème d'Étoile et Anneaux Concentriques
      const starGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.2, 8);
      const starMesh = new THREE.Mesh(starGeo, goldAccentMat);
      starMesh.rotation.x = Math.PI / 2;
      motifGroup.add(starMesh);

      const ringGeo1 = new THREE.TorusGeometry(1.2, 0.04, 16, 48);
      const ringMesh1 = new THREE.Mesh(ringGeo1, metallicMat);
      motifGroup.add(ringMesh1);

    } else if (event.eventType === 'CAREER_PROMOTION') {
      // Bouclier Héraldique & Étoile
      const shieldGeo = new THREE.ConeGeometry(0.9, 1.3, 5);
      const shieldMesh = new THREE.Mesh(shieldGeo, goldAccentMat);
      shieldMesh.rotation.x = Math.PI;
      motifGroup.add(shieldMesh);

      const ringGeo = new THREE.TorusGeometry(1.25, 0.04, 16, 48);
      const ringMesh = new THREE.Mesh(ringGeo, metallicMat);
      motifGroup.add(ringMesh);

    } else if (event.eventType === 'ROOM_VICTORY' || event.eventType === 'SEASON_CHAMPION') {
      // Couronne de Laurier & Médaille d'Or
      const medalGeo = new THREE.CylinderGeometry(0.88, 0.88, 0.15, 32);
      const medalMesh = new THREE.Mesh(medalGeo, goldAccentMat);
      medalMesh.rotation.x = Math.PI / 2;
      motifGroup.add(medalMesh);

      const wreathGeo = new THREE.TorusGeometry(1.15, 0.1, 12, 32);
      const wreathMesh = new THREE.Mesh(wreathGeo, metallicMat);
      motifGroup.add(wreathMesh);

    } else {
      // Trophée Doré Compact Classique
      const cupGeo = new THREE.CylinderGeometry(0.65, 0.35, 0.9, 24);
      const cupMesh = new THREE.Mesh(cupGeo, goldAccentMat);
      cupMesh.position.y = 0.2;
      motifGroup.add(cupMesh);

      const baseGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.2, 24);
      const baseMesh = new THREE.Mesh(baseGeo, metallicMat);
      baseMesh.position.y = -0.45;
      motifGroup.add(baseMesh);

      const orbGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const orbMesh = new THREE.Mesh(orbGeo, metallicMat);
      orbMesh.position.y = 0.8;
      motifGroup.add(orbMesh);
    }

    // Animation fluide de rotation et lévitation
    let startTime = performance.now();
    const animate = () => {
      const elapsed = (performance.now() - startTime) * 0.001;

      motifGroup.rotation.y = elapsed * 0.95;
      motifGroup.position.y = Math.sin(elapsed * 2.2) * 0.08;

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      // Nettoyage WebGL méticuleux
      renderer.dispose();
      motifGroup.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    };
  }, [event, rarity]);

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm select-none animate-fade-in p-4"
    >
      {/* Carte de célébration compacte (Empreinte visuelle 35-40% viewport max) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col items-center bg-[#0B1120]/95 border-2 rounded-3xl p-6 max-w-sm w-full text-slate-100 shadow-2xl backdrop-blur-xl animate-scale-up"
        style={{
          borderColor: `${rarity.hex}70`,
          boxShadow: `0 8px 40px ${rarity.glow}`
        }}
      >
        {/* Barre de contrôle supérieure : Audio & Skip */}
        <div className="w-full flex items-center justify-between pb-2 mb-1">
          <button
            onClick={toggleAudio}
            className="p-1.5 rounded-xl bg-[#080C14] hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1"
            title={audioEnabled ? 'Désactiver les sons' : 'Activer les sons'}
          >
            {audioEnabled ? <Volume2 size={14} className="text-emerald-400" /> : <VolumeX size={14} className="text-rose-400" />}
          </button>

          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border"
            style={{
              color: rarity.hex,
              borderColor: `${rarity.hex}50`,
              backgroundColor: `${rarity.hex}15`
            }}
          >
            {rarity.label}
          </span>

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-xl bg-[#080C14] hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
            title="Passer (Echap)"
          >
            <X size={14} />
          </button>
        </div>

        {/* CONTENEUR DU MOTIF 3D COMPACT (Totalement visible au-dessus des détails) */}
        <div className="relative w-48 h-48 flex items-center justify-center my-1">
          {/* Lueur d'aura radiale douce */}
          <div
            className="absolute inset-4 rounded-full blur-[45px] opacity-40 pointer-events-none"
            style={{ backgroundColor: rarity.hex }}
          />

          {!webglError ? (
            <div ref={mountRef} className="w-48 h-48 flex items-center justify-center" />
          ) : (
            // Fallback 2D Élégant
            <div className="w-28 h-28 rounded-3xl bg-[#080C14] border-2 flex items-center justify-center text-amber-400 shadow-xl"
              style={{ borderColor: rarity.hex }}
            >
              <Trophy size={48} />
            </div>
          )}
        </div>

        {/* Détails de la Récompense (Non superposés sur le motif) */}
        <div className="text-center w-full space-y-1.5 mt-2">
          <h3 className="text-base font-black text-white flex items-center justify-center gap-1.5 leading-snug">
            <Sparkles size={16} style={{ color: rarity.hex }} />
            <span>{event.title}</span>
          </h3>

          <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-xs mx-auto">
            {event.subtitle || 'Accomplissement remarquable validé dans PIF Trading Arena.'}
          </p>

          {/* Badge Gain d'EXP */}
          {event.rewardExp > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold mt-2">
              <Zap size={13} className="text-amber-400" />
              <span>+{event.rewardExp} EXP Gagnés</span>
            </div>
          )}
        </div>

        {/* Bouton d'action principal */}
        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 w-full py-2.5 rounded-xl text-xs font-black text-white shadow-lg transition-all active:scale-95 hover:brightness-110 flex items-center justify-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: rarity.hex,
            boxShadow: `0 0 16px ${rarity.glow}`
          }}
        >
          <Check size={14} />
          <span>Continuer</span>
        </button>

        {/* Barre de progression auto-dismiss */}
        <div className="w-full bg-slate-800/80 h-1 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full transition-all duration-75 ease-linear"
            style={{
              width: `${progress}%`,
              backgroundColor: rarity.hex
            }}
          />
        </div>
      </div>
    </div>
  );
}

