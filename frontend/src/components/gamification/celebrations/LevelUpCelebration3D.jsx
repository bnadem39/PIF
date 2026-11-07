import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Award, Zap, X, Check, Flame } from 'lucide-react';

export default function LevelUpCelebration3D({ event, onDismiss }) {
  const mountRef = useRef(null);
  const animFrameId = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x10b981, 5, 20);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    // Dynamic Concentric Glowing Rings
    const ringsGroup = new THREE.Group();
    scene.add(ringsGroup);

    const ringCount = 5;
    const rings = [];
    for (let i = 0; i < ringCount; i++) {
      const radius = 1.0 + i * 0.45;
      const ringGeo = new THREE.RingGeometry(radius, radius + 0.04, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x10b981 : 0x06b6d4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8 - i * 0.12
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringsGroup.add(ringMesh);
      rings.push(ringMesh);
    }

    // 3D Level Star Emblem in Center
    const starGeo = new THREE.IcosahedronGeometry(0.7, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      metalness: 0.8,
      roughness: 0.2
    });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    scene.add(starMesh);

    // Orbital Sparks
    const sparkCount = 120;
    const pos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount * 3; i += 3) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 1.2 + Math.random() * 2.2;
      pos[i] = Math.cos(angle) * dist;
      pos[i + 1] = Math.sin(angle) * dist;
      pos[i + 2] = (Math.random() - 0.5) * 1.5;
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sparkMat = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x34d399,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.9
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    let clock = new THREE.Clock();
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      starMesh.rotation.y += delta * 1.8;
      starMesh.rotation.x += delta * 1.1;
      starMesh.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.05);

      rings.forEach((r, idx) => {
        r.rotation.z += delta * (idx % 2 === 0 ? 0.6 : -0.6);
      });

      sparks.rotation.z -= delta * 0.4;
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

      {/* Emerald Ambient Light */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-emerald-500/25 blur-[140px] pointer-events-none z-0" />

      <div className="relative z-20 flex flex-col items-center text-center max-w-md mx-4 mt-48 p-6 rounded-3xl bg-[#0B1120]/90 border-2 border-emerald-500/80 backdrop-blur-xl shadow-2xl shadow-emerald-950/60">
        <span className="px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 mb-2 shadow-sm flex items-center gap-1.5">
          <Flame size={13} className="text-emerald-400" /> Montée en Niveau
        </span>

        <h2 className="text-2xl font-black text-white tracking-wide mb-1 flex items-center gap-2">
          {event.title}
        </h2>

        <p className="text-xs text-slate-300 font-medium mb-4 max-w-xs leading-relaxed">
          {event.subtitle || 'Votre prestige et votre maîtrise s\'élèvent dans l\'arène financière.'}
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/40 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check size={16} /> Continuer
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

