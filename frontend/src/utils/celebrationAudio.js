// celebrationAudio.js - Audio & Speech Synthesis Engine for Gamified Celebrations

const STORAGE_KEY = 'pif_celebration_audio_settings';

const DEFAULT_SETTINGS = {
  master: true,
  voice: true,
  sfx: true
};

export function getAudioSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (_) { }
  return { ...DEFAULT_SETTINGS };
}

export function saveAudioSettings(settings) {
  try {
    const updated = { ...getAudioSettings(), ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (_) {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Phrases vocales immersives en français selon le type d'événement
 */
const VOICE_LINES = {
  SKILL_UNLOCKED: 'Nouvelle compétence débloquée !',
  SKILL_COMPLETED: 'Compétence validée avec succès !',
  SKILL_MASTERED: 'Compétence maîtrisée ! Félicitations !',
  ACHIEVEMENT_UNLOCKED: 'Nouvel accomplissement obtenu !',
  TROPHY_UNLOCKED: 'Nouveau trophée débloqué !',
  LEVEL_UP: 'Nouveau niveau atteint !',
  CAREER_PROMOTION: 'Promotion de carrière obtenue !',
  SEASON_CHAMPION: 'Vous êtes champion de la saison !',
  ROOM_VICTORY: 'Victoire d\'arène ! Première place !'
};

/**
 * Synthétiseur audio Web Audio API pour les carillons de victoire & déblocage (Zéro dépendance MP3 externe)
 */
export function playCelebrationSfx(eventType) {
  const settings = getAudioSettings();
  if (!settings.master || !settings.sfx) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { });
    }

    const now = ctx.currentTime;

    if (eventType === 'ROOM_VICTORY' || eventType === 'SEASON_CHAMPION') {
      // Fanfare triomphale : accords ascendants Majeurs
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 1.0);
      });
    } else {
      // Carillon de cristal scintillant (Cristaux & Trophées)
      const freqs = [880, 1174.66, 1318.51, 1760]; // A5, D6, E6, A6
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.8);
      });
    }
  } catch (_) {
    // Autoplay ou Web Audio non supporté
  }
}

/**
 * Annonce vocale par synthèse vocale du navigateur (SpeechSynthesis)
 */
export function speakCelebration(eventType, customText = null) {
  const settings = getAudioSettings();
  if (!settings.master || !settings.voice) return;

  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Annule toute parole précédente pour éviter les chevauchements

    const phrase = customText || VOICE_LINES[eventType] || 'Accomplissement débloqué !';
    const utterance = new SpeechSynthesisUtterance(phrase);

    utterance.lang = 'fr-FR';
    utterance.rate = 1.05;
    utterance.pitch = 1.08;
    utterance.volume = 0.85;

    // Détection de la voix française la plus naturelle
    const voices = window.speechSynthesis.getVoices();
    const frenchVoice = voices.find(
      (v) => (v.lang === 'fr-FR' || v.lang.startsWith('fr')) && !v.name.toLowerCase().includes('compact')
    ) || voices.find((v) => v.lang.startsWith('fr'));

    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (_) { }
}

/**
 * Arrête tout son ou parole en cours
 */
export function stopCelebrationAudio() {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch (_) { }
}

