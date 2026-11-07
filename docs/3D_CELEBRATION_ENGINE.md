# 🎬 Moteur de Célébration 3D Cinématique — PIF Trading Arena

## 1. Composants Three.js & Rendu Temps Réel

Le moteur de célébration utilise **Three.js** sans dépendance lourde externe pour garantir des performances à 60 FPS sur tout type d'appareil.

### 1. `TrophyCelebration3D.jsx` (Déballage de Trophée)
- **Modèle 3D Procédural** : Coupe de trophée avec pied biseauté, fût métallique, anses géométriques et orbe supérieur.
- **Matériaux Physiques (MeshStandardMaterial)** :
  - *Metalness* : 0.85
  - *Roughness* : 0.20
  - *Couleur dynamique selon rareté* : Vert émeraude (Common), Bleu cyan (Rare), Violet améthyste (Epic), Or brillant (Legendary), Rubis néon (Mythic).
- **Particules & Vortex** : 200 particules stellaires en rotation orbitale avec anneaux d'énergie pulsants.
- **Cinématique de Caméra** : Zoom dynamique de `z=7` vers `z=4` avec oscillation sinusoïdale d'angle.

### 2. `LevelUpCelebration3D.jsx` (Montée de Niveau)
- Étoile 3D à 8 branches en métal doré.
- 3 anneaux de résonance concentriques en expansion continue.
- Gerbes d'étincelles verticales ascendantes simulant une poussée d'énergie.

### 3. `VictoryCelebration3D.jsx` (Victoire de Match)
- Couronne de laurier dorée en rotation tridimensionnelle.
- Explosion de confettis multicolores en gravité simulée (physique vélocité + gravité + rotation aléatoire).

---

## 2. Central `CelebrationManager` & Déduplication

- **File d'Attente FIFO** : Si plusieurs événements surviennent simultanément (ex: victoire de match + déblocage trophée + promotion carrière), le gestionnaire les présente séquentiellement.
- **Idempotence & Persistance** : La table `celebration_events` mémorise l'`event_id` pour empêcher tout réaffichage intempestif.
- **Contrôles Utilisateur** : Bouton "Passer", touche Échap, option d'accessibilité "Animations réduites".

