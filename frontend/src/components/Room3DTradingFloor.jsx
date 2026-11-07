import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * 3D Trading Floor Arena rendered via Three.js
 * Displays interactive 3D participant pods and a central market beacon.
 */
export default function Room3DTradingFloor({ participants = [], tick = null, activeSymbol = 'TUNINDEX' }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const podsRef = useRef(new Map());
  const beaconRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 320;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080c14, 0.04);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 7, 13);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Grid Floor
    const gridHelper = new THREE.GridHelper(24, 24, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Subtle Hexagonal / Circular Platform Base
    const ringGeo = new THREE.RingGeometry(0.5, 6.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x0369a1, side: THREE.DoubleSide, transparent: true, opacity: 0.15 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    scene.add(ringMesh);

    // Central Market Beacon Pillar
    const beaconGeo = new THREE.CylinderGeometry(0.8, 1.0, 3.5, 24, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 1.75;
    scene.add(beacon);
    beaconRef.current = beacon;

    // Central Core Glow
    const coreGeo = new THREE.OctahedronGeometry(0.5, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 1.75;
    scene.add(core);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 2, 20);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    // Interactive mouse rotation
    let isDragging = false;
    let prevMouseX = 0;
    let angle = 0;

    const handleMouseDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const delta = e.clientX - prevMouseX;
      prevMouseX = e.clientX;
      angle += delta * 0.008;
      const radius = 13;
      camera.position.x = Math.sin(angle) * radius;
      camera.position.z = Math.cos(angle) * radius;
      camera.lookAt(0, 1.2, 0);
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    mount.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(mount);

    // Animation Loop
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      // Auto slow rotation if not dragging
      if (!isDragging) {
        angle += 0.002;
        const radius = 13;
        camera.position.x = Math.sin(angle) * radius;
        camera.position.z = Math.cos(angle) * radius;
        camera.lookAt(0, 1.2, 0);
      }

      // Rotate beacon & core
      if (beaconRef.current) {
        beaconRef.current.rotation.y += 0.008;
      }
      core.rotation.y -= 0.015;
      core.rotation.x += 0.005;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      mount.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update participant 3D pods dynamically
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old pod meshes
    podsRef.current.forEach((mesh) => scene.remove(mesh));
    podsRef.current.clear();

    const count = Math.max(participants.length, 1);
    const radius = 4.5;

    participants.forEach((p, idx) => {
      const theta = (idx / count) * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      const group = new THREE.Group();
      group.position.set(x, 0, z);

      // Height scaled by ROI / rank
      const roi = p.roiPercent || p.pnl || 0;
      const height = Math.max(0.6, Math.min(2.5, 1.0 + roi / 20));
      const isPositive = roi >= 0;

      // Pedestal Cylinder
      const cylGeo = new THREE.CylinderGeometry(0.4, 0.45, height, 16);
      const cylMat = new THREE.MeshStandardMaterial({
        color: isPositive ? 0x059669 : 0xe11d48,
        emissive: isPositive ? 0x047857 : 0xbe123c,
        emissiveIntensity: 0.3,
        roughness: 0.3,
        metalness: 0.6
      });
      const pedestal = new THREE.Mesh(cylGeo, cylMat);
      pedestal.position.y = height / 2;
      group.add(pedestal);

      // Player Hologram Orb
      const orbGeo = new THREE.SphereGeometry(0.22, 16, 16);
      const orbMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.7,
        roughness: 0.2
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.y = height + 0.35;
      group.add(orb);

      // Ring glow around pod base
      const podRingGeo = new THREE.RingGeometry(0.5, 0.65, 16);
      const podRingMat = new THREE.MeshBasicMaterial({
        color: isPositive ? 0x10b981 : 0xf43f5e,
        side: THREE.DoubleSide
      });
      const podRing = new THREE.Mesh(podRingGeo, podRingMat);
      podRing.rotation.x = -Math.PI / 2;
      podRing.position.y = 0.01;
      group.add(podRing);

      scene.add(group);
      podsRef.current.set(p.username || idx, group);
    });
  }, [participants]);

  // Update beacon color based on tick price change
  useEffect(() => {
    if (!beaconRef.current || !tick) return;
    const priceChange = tick.changePercent || 0;
    if (priceChange >= 0) {
      beaconRef.current.material.color.setHex(0x10b981);
    } else {
      beaconRef.current.material.color.setHex(0xf43f5e);
    }
  }, [tick]);

  return (
    <div className="relative w-full h-[280px] bg-gradient-to-b from-[#080C14] to-[#0B1120] rounded-xl overflow-hidden border border-[#1E293B]">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute top-2 left-3 flex items-center gap-2 pointer-events-none select-none text-[11px] font-mono font-bold text-sky-400 bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-sky-800/30">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        ARÈNE 3D — {activeSymbol} · {participants.length} JOUEUR{participants.length > 1 ? 'S' : ''}
      </div>
      <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] text-slate-500 font-mono">
        Faire glisser pour pivoter
      </div>
    </div>
  );
}

