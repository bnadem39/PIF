import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Trophy, Sparkles, X, Check } from 'lucide-react';

const RARITY_COLORS = {
  COMMON: { main: 0x94a3b8, glow: 0x64748b, hex: '#94a3b8', name: 'Commune' },
  UNCOMMON: { main: 0x10b981, glow: 0x059669, hex: '#10b981', name: 'Atypique' },
  RARE: { main: 0x0284c7, glow: 0x0369a1, hex: '#0284c7', name: 'Rare' },
  EPIC: { main: 0x8b5cf6, glow: 0x6d28d9, hex: '#8b5cf6', name: 'Épique' },
  LEGENDARY: { main: 0xf59e0b, glow: 0xd97706, hex: '#f59e0b', name: 'Légendaire' },
  MYTHIC: { main: 0xec4899, glow: 0xdb2777, hex: '#ec4899', name: 'Mythique' }
};

export default function TrophyCelebration3D({ event, onDismiss }) {
  const mountRef = useRef(null);
  const animFrameId = useRef(null);

  const rarity = RARITY_COLORS[event.rarity] || RARITY_COLORS.COMMON;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040711, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    mount.appendChild(renderer.domElement);

    // 3. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(4, 6, 4);
    scene.add(keyLight);

    const coloredGlowLight = new THREE.PointLight(rarity.main, 4.0, 15);
    coloredGlowLight.position.set(0, 0.8, 1.5);
    scene.add(coloredGlowLight);

    const backRimLight = new THREE.DirectionalLight(rarity.glow, 2.0);
    backRimLight.position.set(-4, -2, -3);
    scene.add(backRimLight);

    // 4. Central 3D Trophy Mesh Assembly
    const trophyGroup = new THREE.Group();
    scene.add(trophyGroup);

    // Base pedestal
    const baseGeo = new THREE.CylinderGeometry(0.85, 1.0, 0.35, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.9;
    trophyGroup.add(baseMesh);

    // Golden Stem
    const stemGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.6, 24);
    const stemMat = new THREE.MeshStandardMaterial({
      color: rarity.main,
      metalness: 0.9,
      roughness: 0.15
    });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.position.y = -0.45;
    trophyGroup.add(stemMesh);

    // Cup Body
    const cupGeo = new THREE.ConeGeometry(0.85, 1.1, 32, 1, true);
    const cupMat = new THREE.MeshStandardMaterial({
      color: rarity.main,
      metalness: 0.95,
      roughness: 0.12,
      side: THREE.DoubleSide
    });
    const cupMesh = new THREE.Mesh(cupGeo, cupMat);
    cupMesh.position.y = 0.35;
    cupMesh.rotation.x = Math.PI;
    trophyGroup.add(cupMesh);

    // Floating Gem / Crown Emblem on top
    const gemGeo = new THREE.OctahedronGeometry(0.35, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: rarity.main,
      emissiveIntensity: 0.9,
      metalness: 0.4,
      roughness: 0.1
    });
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    gemMesh.position.y = 1.1;
    trophyGroup.add(gemMesh);

    // 5. Orbiting Energy Rings
    const ringGeo = new THREE.TorusGeometry(1.4, 0.02, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: rarity.main,
      transparent: true,
      opacity: 0.5
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 3;
    trophyGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 6;
    trophyGroup.add(ring2);

    // 6. Particle Vortex (150 Sparkles)
    const particleCount = 180;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 6;
      posArray[i + 1] = (Math.random() - 0.5) * 4;
      posArray[i + 2] = (Math.random() - 0.5) * 4;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.045,
      color: rarity.main,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 7. Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth Trophy Rotation & Float
      trophyGroup.rotation.y += delta * 1.2;
      trophyGroup.position.y = Math.sin(elapsed * 2.0) * 0.08;

      gemMesh.rotation.y -= delta * 2.5;
      gemMesh.rotation.x += delta * 1.5;

      ring1.rotation.z += delta * 0.8;
      ring2.rotation.z -= delta * 0.9;

      // Particle floating
      particleSystem.rotation.y += delta * 0.15;

      renderer.render(scene, camera);
    };
    animate();

    // Handle Resize
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [rarity]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in select-none">
      {/* 3D WebGL Canvas Layer */}
      <div ref={mountRef} className="absolute inset-0 pointer-events-none z-10" />

      {/* Rarity Aura Backlight */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[140px] opacity-30 pointer-events-none z-0"
        style={{ backgroundColor: rarity.hex }}
      />

      {/* Overlay Details Card */}
      <div className="relative z-20 flex flex-col items-center text-center max-w-md mx-4 mt-44 p-6 rounded-3xl bg-[#0B1120]/90 border-2 backdrop-blur-xl shadow-2xl transition-all"
        style={{ borderColor: `${rarity.hex}80`, boxShadow: `0 0 35px ${rarity.hex}40` }}
      >
        <span
          className="px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase border mb-2 shadow-sm"
          style={{
            color: rarity.hex,
            borderColor: `${rarity.hex}60`,
            backgroundColor: `${rarity.hex}18`
          }}
        >
          Trophée {rarity.name}
        </span>

        <h2 className="text-xl font-black text-white tracking-wide mb-1 flex items-center gap-2">
          <Sparkles size={20} style={{ color: rarity.hex }} />
          {event.title}
        </h2>

        <p className="text-xs text-slate-300 font-medium mb-4 max-w-xs leading-relaxed">
          {event.subtitle || 'Accomplissement exceptionnel validé dans l\'écosystème PIF Trading Arena.'}
        </p>

        {event.rewardExp > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold mb-4">
            <Sparkles size={14} className="text-amber-400" />
            <span>+{event.rewardExp} EXP Attribués</span>
          </div>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-2.5 rounded-xl text-xs font-black text-white shadow-lg transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          style={{
            backgroundColor: rarity.hex,
            boxShadow: `0 0 20px ${rarity.hex}70`
          }}
        >
          <Check size={16} /> Continuer ma Progression
        </button>
      </div>

      {/* Skip Button Top Right */}
      <button
        onClick={onDismiss}
        className="absolute top-6 right-6 z-30 p-2.5 rounded-2xl bg-[#0B1120]/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all shadow-xl"
        title="Passer l'animation (Echap)"
      >
        <X size={18} />
      </button>
    </div>
  );
}

