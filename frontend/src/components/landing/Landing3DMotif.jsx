import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TrendingUp, BarChart2, Sparkles } from 'lucide-react';

/**
 * Landing3DMotif - Motif 3D Boursier Officiel PIF Trading Arena
 * Sculpture financière 3D :
 * - Podium technologique de cotation
 * - Bougies japonaises 3D en tendance haussière (Bullish Candlesticks)
 * - Vecteur de croissance diagonal doré & flèche de breakout
 * - Anneaux holographiques de marché BVMT
 * - Cristal zénithal et flux de particules (Market Tick Streams)
 */
export default function Landing3DMotif({
  size = 380,
  compact = false,
  className = ''
}) {
  const containerRef = useRef(null);
  const mountRef = useRef(null);
  const animFrameRef = useRef(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (_) {
      setWebglSupported(false);
      return;
    }

    const actualSize = compact ? 220 : size;
    renderer.setSize(actualSize, actualSize);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    mount.appendChild(renderer.domElement);

    // 1. Scène et Caméra
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, compact ? 0.35 : 0.5, compact ? 4.5 : 4.8);

    // 2. Éclairages cinématiques typés salle des marchés
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.8);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 2.0);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const marketGlow = new THREE.PointLight(0x10b981, 4.2, 12);
    marketGlow.position.set(0, 0.8, 1.5);
    scene.add(marketGlow);

    // 3. Groupe principal
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // Matériaux physiques haute précision
    const darkPedestalMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      metalness: 0.88,
      roughness: 0.25
    });

    const emeraldCandleMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.65,
      roughness: 0.15,
      emissive: 0x059669,
      emissiveIntensity: 0.6
    });

    const goldCandleMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.92,
      roughness: 0.15,
      emissive: 0xd97706,
      emissiveIntensity: 0.4
    });

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.95,
      roughness: 0.12
    });

    const cyanEnergyMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.75,
      roughness: 0.2,
      emissive: 0x0891b2,
      emissiveIntensity: 0.6
    });

    // ─── A. SOCLE / PODIUM BOURSIER HEXAGONAL ─────────────────────────
    const baseGeo = new THREE.CylinderGeometry(1.15, 1.35, 0.25, 6);
    const baseMesh = new THREE.Mesh(baseGeo, darkPedestalMat);
    baseMesh.position.y = -1.1;
    masterGroup.add(baseMesh);

    // Anneau de cotation lumineux sur le socle
    const ringBaseGeo = new THREE.TorusGeometry(1.22, 0.04, 16, 48);
    const ringBaseMesh = new THREE.Mesh(ringBaseGeo, cyanEnergyMat);
    ringBaseMesh.position.y = -0.98;
    ringBaseMesh.rotation.x = Math.PI / 2;
    masterGroup.add(ringBaseMesh);

    // ─── B. GRAPHIQUE 3D DE BOUGIES JAPONAISES (RALLYE HAUSSIER) ───────
    // 5 chandeliers en escalier ascendant
    const candlesData = [
      { x: -0.80, y: -0.55, h: 0.50, wickH: 0.85, isBullish: true },
      { x: -0.40, y: -0.30, h: 0.68, wickH: 1.05, isBullish: true },
      { x:  0.00, y: -0.10, h: 0.55, wickH: 0.95, isBullish: false }, // Pullback doré de consolidation
      { x:  0.40, y:  0.22, h: 0.85, wickH: 1.25, isBullish: true },
      { x:  0.80, y:  0.60, h: 1.15, wickH: 1.60, isBullish: true }  // Breakout haussier majeur
    ];

    const candlesGroup = new THREE.Group();
    masterGroup.add(candlesGroup);

    candlesData.forEach((cd) => {
      // 1. Mèche métallique haute et basse
      const wickGeo = new THREE.CylinderGeometry(0.02, 0.02, cd.wickH, 12);
      const wickMesh = new THREE.Mesh(wickGeo, goldAccentMat);
      wickMesh.position.set(cd.x, cd.y, 0);
      candlesGroup.add(wickMesh);

      // 2. Corps de la bougie japonaise (Barre solide)
      const bodyGeo = new THREE.BoxGeometry(0.24, cd.h, 0.24);
      const bodyMesh = new THREE.Mesh(bodyGeo, cd.isBullish ? emeraldCandleMat : goldCandleMat);
      bodyMesh.position.set(cd.x, cd.y, 0);
      candlesGroup.add(bodyMesh);
    });

    // ─── C. VECTEUR DE TENDANCE / FLÈCHE DE CROISSANCE BOURSIÈRE ──────
    // Ligne ascendante en diagonale perçant le graphique
    const trendlineGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.45, 16);
    const trendlineMesh = new THREE.Mesh(trendlineGeo, goldAccentMat);
    trendlineMesh.position.set(0.02, 0.08, 0.18);
    trendlineMesh.rotation.z = -Math.PI / 4.2; // Inclinaison diagonale ascendante
    masterGroup.add(trendlineMesh);

    // Tête de flèche haussière au sommet
    const arrowHeadGeo = new THREE.ConeGeometry(0.16, 0.38, 16);
    const arrowHeadMesh = new THREE.Mesh(arrowHeadGeo, goldAccentMat);
    arrowHeadMesh.position.set(0.95, 0.98, 0.18);
    arrowHeadMesh.rotation.z = -Math.PI / 4.2;
    masterGroup.add(arrowHeadMesh);

    // ─── D. CRISTAL / DIAMANT DU SOMMET (ALPHA DU TRADER) ────────────
    const zenithGeo = new THREE.OctahedronGeometry(0.32, 0);
    const zenithMesh = new THREE.Mesh(zenithGeo, emeraldCandleMat);
    zenithMesh.position.set(0.95, 1.25, 0.18);
    masterGroup.add(zenithMesh);

    // ─── E. ANNEAUX HOLOGRAPHIQUES ORBITAUX (BOURSE & MARCHÉ GLOBAL) ─
    // Anneau orbital intérieur émeraude
    const ring1Geo = new THREE.TorusGeometry(1.48, 0.035, 16, 64);
    const ring1Mesh = new THREE.Mesh(ring1Geo, emeraldCandleMat);
    ring1Mesh.rotation.x = Math.PI / 2.8;
    masterGroup.add(ring1Mesh);

    // Anneau orbital extérieur doré
    const ring2Geo = new THREE.TorusGeometry(1.72, 0.028, 16, 64);
    const ring2Mesh = new THREE.Mesh(ring2Geo, goldAccentMat);
    ring2Mesh.rotation.y = Math.PI / 3.2;
    masterGroup.add(ring2Mesh);

    // ─── F. FLUX DE PARTICULES / MARKET TICK STREAMS ─────────────────
    const particleCount = compact ? 50 : 85;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 5.2;
      particlePositions[i + 1] = (Math.random() - 0.5) * 4.2 + 0.2;
      particlePositions[i + 2] = (Math.random() - 0.5) * 4.2;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.045,
      color: 0x10b981,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const particlePoints = new THREE.Points(particleGeo, particleMat);
    masterGroup.add(particlePoints);

    setIsLoaded(true);

    // IntersectionObserver : Pause WebGL hors viewport
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);

    // 4. Boucle d'animation cinématique
    const startTime = performance.now();
    const animate = () => {
      if (isVisible) {
        const elapsed = (performance.now() - startTime) * 0.001;

        // Rotation continue et lévitation fluide du bloc boursier
        masterGroup.rotation.y = elapsed * 0.52;
        masterGroup.position.y = Math.sin(elapsed * 1.8) * 0.08;

        // Rotation en sens opposé des anneaux orbitaux de marché
        ring1Mesh.rotation.z = elapsed * 0.65;
        ring2Mesh.rotation.x = elapsed * -0.55;

        // Pulsation du diamant zénithal et lueur de marché
        zenithMesh.rotation.y = elapsed * -1.5;
        zenithMesh.rotation.z = Math.sin(elapsed * 2.2) * 0.2;
        marketGlow.intensity = 3.6 + Math.sin(elapsed * 2.6) * 0.9;
        emeraldCandleMat.emissiveIntensity = 0.5 + Math.sin(elapsed * 2.4) * 0.2;

        renderer.render(scene, camera);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      observer.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      baseGeo.dispose();
      ringBaseGeo.dispose();
      trendlineGeo.dispose();
      arrowHeadGeo.dispose();
      zenithGeo.dispose();
      ring1Geo.dispose();
      ring2Geo.dispose();
      particleGeo.dispose();
      darkPedestalMat.dispose();
      emeraldCandleMat.dispose();
      goldCandleMat.dispose();
      goldAccentMat.dispose();
      cyanEnergyMat.dispose();
      particleMat.dispose();
    };
  }, [size, compact]);

  if (!webglSupported) {
    // Fallback élégant 2D Boursier SVG/CSS
    return (
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{ width: compact ? 180 : size, height: compact ? 180 : size }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/20 via-cyan-500/20 to-amber-500/20 blur-2xl animate-pulse" />
        <div className="relative w-36 h-36 rounded-3xl bg-[#0B1120] border-2 border-emerald-500/50 flex flex-col items-center justify-center text-emerald-400 shadow-2xl">
          <TrendingUp size={48} className="animate-pulse" />
          <span className="text-[11px] font-mono font-bold text-amber-400 mt-2">BVMT BULLISH</span>
        </div>
      </div>
    );
  }

  const actualSize = compact ? 220 : size;

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: actualSize, height: actualSize }}
    >
      {/* Halo d'ambiance néon boursier vert/or */}
      <div
        className="absolute rounded-full pointer-events-none transition-all duration-700"
        style={{
          width: actualSize * 0.85,
          height: actualSize * 0.85,
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(245, 158, 11, 0.16) 45%, rgba(6, 182, 212, 0.10) 70%, transparent 85%)',
          filter: 'blur(35px)'
        }}
      />

      {/* Conteneur Three.js Canvas */}
      <div
        ref={mountRef}
        className={`relative z-10 transition-opacity duration-1000 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        style={{ width: actualSize, height: actualSize }}
      />
    </div>
  );
}
