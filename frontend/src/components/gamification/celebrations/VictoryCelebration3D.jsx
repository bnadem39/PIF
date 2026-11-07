import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Trophy, Crown, Check, X, Sparkles } from 'lucide-react';

export default function VictoryCelebration3D({ event, onDismiss }) {
  const mountRef = useRef(null);
  const animFrameId = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1, 5.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const goldSpotLight = new THREE.SpotLight(0xf59e0b, 5, 20, Math.PI / 4, 0.5);
    goldSpotLight.position.set(0, 5, 2);
    scene.add(goldSpotLight);

    // Golden Laurel Wreath / Ring
    const wreathGeo = new THREE.TorusGeometry(1.2, 0.08, 16, 48);
    const wreathMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.15
    });
    const wreathMesh = new THREE.Mesh(wreathGeo, wreathMat);
    scene.add(wreathMesh);

    // Center Crown
    const crownGeo = new THREE.CylinderGeometry(0.7, 0.5, 0.6, 6, 1, true);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    const crownMesh = new THREE.Mesh(crownGeo, crownMat);
    scene.add(crownMesh);

    // Confetti Particles (Golden / Yellow / Emerald)
    const count = 250;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorChoices = [
      new THREE.Color(0xf59e0b),
      new THREE.Color(0x10b981),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xffffff)
    ];

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 8;
      positions[i + 1] = (Math.random() - 0.5) * 6;
      positions[i + 2] = (Math.random() - 0.5) * 4;

      const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[i] = c.r;
      colors[i + 1] = c.g;
      colors[i + 2] = c.b;
    }

    const confettiGeo = new THREE.BufferGeometry();
    confettiGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    confettiGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const confettiMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.95
    });
    const confettiSystem = new THREE.Points(confettiGeo, confettiMat);
    scene.add(confettiSystem);

    let clock = new THREE.Clock();
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      crownMesh.rotation.y += delta * 1.5;
      crownMesh.position.y = Math.sin(elapsed * 2.5) * 0.08;

      wreathMesh.rotation.z += delta * 0.5;

      confettiSystem.rotation.y += delta * 0.2;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (mount && renderer.domElement) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div ref={mountRef} className="absolute inset-0 pointer-events-none z-10" />

      {/* Gold Ambient Light */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-amber-500/25 blur-[140px] pointer-events-none z-0" />

      <div className="relative z-20 flex flex-col items-center text-center max-w-md mx-4 mt-48 p-6 rounded-3xl bg-[#0B1120]/90 border-2 border-amber-500/80 backdrop-blur-xl shadow-2xl shadow-amber-950/60">
        <span className="px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase border border-amber-500/60 bg-amber-500/20 text-amber-300 mb-2 shadow-sm flex items-center gap-1.5">
          <Crown size={13} className="text-amber-400" /> 1ère Place · Victoire Certifiée
        </span>

        <h2 className="text-2xl font-black text-white tracking-wide mb-1 flex items-center gap-2">
          {event.title}
        </h2>

        <p className="text-xs text-slate-300 font-medium mb-4 max-w-xs leading-relaxed">
          {event.subtitle || 'Votre stratégie a surclassé les concurrents de la salle de marché.'}
        </p>

        {event.rewardExp > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold mb-4">
            <Sparkles size={14} className="text-amber-400" />
            <span>+{event.rewardExp} EXP & Points de Saison</span>
          </div>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-lg shadow-amber-600/40 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check size={16} /> Savourer la Victoire
        </button>
      </div>

      <button
        onClick={onDismiss}
        className="absolute top-6 right-6 z-30 p-2.5 rounded-2xl bg-[#0B1120]/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all shadow-xl"
        title="Passer l'animation"
      >
        <X size={18} />
      </button>
    </div>
  );
}

