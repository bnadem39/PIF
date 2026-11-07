import React, { useState, useRef, useEffect } from 'react';
import {
  Palette, Upload, Sparkles, Image as ImageIcon, Film, Sliders,
  RefreshCw, Check, X, AlertCircle, Trash2, User, Eye, Sun, Layers, Lock, ShieldAlert
} from 'lucide-react';
import PlayerAvatar, { resolveMediaUrl } from '../common/PlayerAvatar';
import { extractColorPalette, applyThemeSkin, getStoredTheme } from '../../utils/colorPaletteExtractor';
import { updatePlayerAppearance, updatePlayerAvatar, uploadPlayerAvatar, uploadPlayerBackground, getCustomizationPermissions } from '../../services/api';

export default function AppearanceCustomizerModal({ isOpen, onClose, player, onAppearanceUpdated, onLiveThemeChange }) {
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const stored = getStoredTheme();

  // Settings State
  const [bgUrl, setBgUrl] = useState(player?.customBackgroundUrl || stored.backgroundUrl || '');
  const [bgFile, setBgFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(player?.profileImageUrl || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [darkness, setDarkness] = useState(player?.backgroundDarkness ?? stored.darkness ?? 60);
  const [blur, setBlur] = useState(player?.backgroundBlur ?? stored.blur ?? 0);
  const [position, setPosition] = useState(player?.backgroundPosition || stored.position || 'center');
  const [themeMode, setThemeMode] = useState(player?.themeMode || stored.themeMode || 'AUTOMATIC');
  const [accentColor, setAccentColor] = useState(player?.themeAccentColor || stored.accentColor || '#10b981');
  const [secondaryColor, setSecondaryColor] = useState(player?.themeSecondaryColor || stored.secondaryColor || '#06b6d4');

  const [extractedPalette, setExtractedPalette] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [permissions, setPermissions] = useState(null);

  // Synchronisation avec le profil joueur et chargement des permissions de niveau
  useEffect(() => {
    if (isOpen) {
      getCustomizationPermissions()
        .then((data) => setPermissions(data))
        .catch((err) => console.warn('Permissions fetch error:', err));
    }
    if (isOpen && player) {
      if (player.customBackgroundUrl !== undefined) setBgUrl(player.customBackgroundUrl || '');
      if (player.profileImageUrl !== undefined) setAvatarUrl(player.profileImageUrl || '');
      if (player.backgroundDarkness !== undefined) setDarkness(player.backgroundDarkness);
      if (player.backgroundBlur !== undefined) setBlur(player.backgroundBlur);
      if (player.backgroundPosition) setPosition(player.backgroundPosition);
      if (player.themeMode) setThemeMode(player.themeMode);
      if (player.themeAccentColor) setAccentColor(player.themeAccentColor);
      if (player.themeSecondaryColor) setSecondaryColor(player.themeSecondaryColor);
    }
  }, [isOpen, player]);

  // Appliquer le thème en direct pendant la manipulation des contrôles
  const updateLivePreview = (newAccent, newSecondary, newBg, newDarkness, newBlur, newPos, newMode) => {
    applyThemeSkin({
      accentColor: newAccent,
      secondaryColor: newSecondary,
      backgroundUrl: newBg,
      darkness: newDarkness,
      blur: newBlur,
      position: newPos,
      themeMode: newMode
    });
    if (onLiveThemeChange) {
      onLiveThemeChange({
        accentColor: newAccent,
        secondaryColor: newSecondary,
        backgroundUrl: newBg,
        darkness: newDarkness,
        blur: newBlur,
        position: newPos,
        themeMode: newMode
      });
    }
  };

  const handleCancel = () => {
    const initialBg = player?.customBackgroundUrl || stored.backgroundUrl || null;
    const initialDarkness = player?.backgroundDarkness ?? stored.darkness ?? 60;
    const initialBlur = player?.backgroundBlur ?? stored.blur ?? 0;
    const initialPos = player?.backgroundPosition || stored.position || 'center';
    const initialAccent = player?.themeAccentColor || stored.accentColor || '#10b981';
    const initialSecondary = player?.themeSecondaryColor || stored.secondaryColor || '#06b6d4';
    const initialMode = player?.themeMode || stored.themeMode || 'AUTOMATIC';
    updateLivePreview(initialAccent, initialSecondary, initialBg, initialDarkness, initialBlur, initialPos, initialMode);
    onClose();
  };

  // Traitement d'une nouvelle image de fond
  const handleBackgroundFile = (file) => {
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Format non supporté. Choisissez PNG, JPG, WEBP ou GIF animé.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Fichier trop lourd (max 25 Mo).');
      return;
    }

    setBgFile(file);
    setIsExtracting(true);
    setErrorMsg(null);

    // Prévisualisation locale immédiate et extraction de palette
    const localUrl = URL.createObjectURL(file);
    setBgUrl(localUrl);

    extractColorPalette(localUrl)
      .then((result) => {
        if (themeMode === 'AUTOMATIC') {
          setAccentColor(result.dominant);
          setSecondaryColor(result.secondary);
          setExtractedPalette(result.palette || []);
          updateLivePreview(result.dominant, result.secondary, localUrl, darkness, blur, position, themeMode);
        } else {
          updateLivePreview(accentColor, secondaryColor, localUrl, darkness, blur, position, themeMode);
        }
      })
      .catch((e) => {
        console.warn('Erreur extraction palette:', e);
        updateLivePreview(accentColor, secondaryColor, localUrl, darkness, blur, position, themeMode);
      })
      .finally(() => {
        setIsExtracting(false);
      });
  };

  // Traitement de la photo de profil (Avatar avec prévisualisation immédiate)
  const handleAvatarFile = (file) => {
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Pour l\'avatar, choisissez une photo PNG, JPG ou WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Avatar trop lourd (max 5 Mo).');
      return;
    }

    setAvatarFile(file);
    try {
      const localPreview = URL.createObjectURL(file);
      setAvatarUrl(localPreview);
    } catch (_) {
      const reader = new FileReader();
      reader.onload = (e) => setAvatarUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Sauvegarde globale sur le serveur
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      let finalBgUrl = bgUrl;

      // 1. Sauvegarde multipart du fond d'écran si nouveau fichier sélectionné
      if (bgFile) {
        const bgUploadRes = await uploadPlayerBackground(bgFile);
        if (bgUploadRes?.customBackgroundUrl) {
          finalBgUrl = bgUploadRes.customBackgroundUrl;
          setBgUrl(finalBgUrl);
        }
        setBgFile(null);
      }

      // 2. Sauvegarde multipart officielle de l'avatar si nouveau fichier sélectionné
      if (avatarFile) {
        await uploadPlayerAvatar(avatarFile);
        setAvatarFile(null);
      } else if (avatarUrl && avatarUrl !== player?.profileImageUrl && !avatarUrl.startsWith('blob:')) {
        await updatePlayerAvatar(avatarUrl);
      }

      // 3. Sauvegarde des réglages d'apparence et thème
      await updatePlayerAppearance({
        customBackgroundUrl: finalBgUrl && !finalBgUrl.startsWith('blob:') ? finalBgUrl : null,
        backgroundDarkness: darkness,
        backgroundBlur: blur,
        backgroundPosition: position,
        themeMode,
        themeAccentColor: accentColor,
        themeSecondaryColor: secondaryColor
      });

      // Appliquer définitivement
      updateLivePreview(accentColor, secondaryColor, finalBgUrl, darkness, blur, position, themeMode);

      setSavedSuccess(true);
      if (onAppearanceUpdated) {
        onAppearanceUpdated({
          customBackgroundUrl: finalBgUrl,
          backgroundDarkness: darkness,
          backgroundBlur: blur,
          backgroundPosition: position,
          themeMode,
          themeAccentColor: accentColor,
          themeSecondaryColor: secondaryColor,
          profileImageUrl: avatarUrl
        });
      }
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  // Rétablissement du thème par défaut
  const handleRestoreDefault = () => {
    setBgUrl('');
    setDarkness(60);
    setBlur(0);
    setPosition('center');
    setThemeMode('DEFAULT');
    setAccentColor('#10b981');
    setSecondaryColor('#06b6d4');
    setExtractedPalette([]);
    updateLivePreview('#10b981', '#06b6d4', null, 60, 0, 'center', 'DEFAULT');
  };

  if (!isOpen) return null;

  const userLevel = player?.level || 1;
  const isAvatarUnlocked = permissions?.featuresUnlocked?.CUSTOM_AVATAR ?? (userLevel >= 3);
  const isBackgroundUnlocked = permissions?.featuresUnlocked?.CUSTOM_BACKGROUND ?? (userLevel >= 10);
  const isEffectsUnlocked = permissions?.featuresUnlocked?.ADVANCED_BACKGROUND_EFFECTS ?? (userLevel >= 15);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-[#0B1120] border-2 border-[#1E293B] rounded-3xl max-w-2xl w-full text-slate-100 flex flex-col shadow-2xl animate-fade-in max-h-[90vh] h-[85vh] overflow-hidden my-auto">
        {/* Sticky Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] p-4 sm:p-5 shrink-0 bg-[#0B1120] z-20">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2.5 rounded-2xl border"
              style={{
                backgroundColor: `${accentColor}25`,
                borderColor: accentColor,
                color: accentColor
              }}
            >
              <Palette size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Moteur de Thème & Personnalisation Visuelle</h3>
              <p className="text-xs text-slate-400">Fond d'écran dynamique, réglage de lueur, avatar et identité de joueur</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1 min-h-0">
          {/* Message d'erreur éventuel */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1 : FOND D'ÉCRAN DU LOBBY */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#080C14] border border-[#1E293B]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <ImageIcon size={14} className="text-sky-400" />
                Fond d'écran du Lobby (Photo ou GIF animé)
              </label>
              {bgUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setBgUrl('');
                    updateLivePreview(accentColor, secondaryColor, null, darkness, blur, position, themeMode);
                  }}
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} />
                  <span>Supprimer le fond</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
              disabled={!isBackgroundUnlocked}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleBackgroundFile(e.target.files[0]);
                }
              }}
            />

            {!isBackgroundUnlocked ? (
              <div className="border border-amber-500/30 bg-amber-950/15 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Fond d'Écran Personnalisé & GIF</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Niveau 10 Requis
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Votre niveau actuel : <span className="font-bold text-amber-400 font-mono">Niveau {userLevel}</span> / 10
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {Math.min(100, Math.round((userLevel / 10) * 100))}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((userLevel / 10) * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Continuez votre progression en participant à des arènes de trading ou en validant des cours à l'Académie pour débloquer l'importation de fonds d'écran et GIFs animés.
                </p>
              </div>
            ) : !bgUrl ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) handleBackgroundFile(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${isDragging
                    ? 'border-sky-400 bg-sky-950/30'
                    : 'border-[#1E293B] hover:border-slate-500 bg-[#0B1120]'
                  }`}
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                  <Upload size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">Glissez-déposez votre photo ou GIF animé</p>
                  <p className="text-[11px] text-slate-400">ou cliquez pour parcourir votre PC (PNG, JPG, WEBP, GIF jusqu'à 25 Mo)</p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-[#1E293B] bg-black h-36 flex items-center justify-center">
                <img
                  src={resolveMediaUrl(bgUrl)}
                  alt="Aperçu fond d'écran"
                  className="absolute inset-0 w-full h-full object-cover transition-all"
                  style={{
                    filter: blur > 0 ? `blur(${blur}px)` : 'none',
                    objectPosition: position
                  }}
                  onError={(e) => {
                    console.warn('[MODAL] Failed preview img:', bgUrl);
                  }}
                />
                <div
                  className="absolute inset-0 transition-colors pointer-events-none"
                  style={{ backgroundColor: `rgba(8, 12, 20, ${darkness / 100})` }}
                />
                <div className="relative z-10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 backdrop-blur-md shadow-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>Remplacer l'image</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white shadow-lg flex items-center gap-1.5 cursor-pointer transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                    style={{
                      backgroundColor: accentColor,
                      boxShadow: `0 0 15px ${accentColor}60`
                    }}
                  >
                    {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Appliquer ce fond</span>
                  </button>
                </div>
              </div>
            )}

            {/* CURSEURS D'OBSCURITÉ ET DE FLOU */}
            {bgUrl && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Darkness Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Sun size={13} className="text-amber-400" />
                      Obscurité du fond
                    </span>
                    <span className="font-mono text-emerald-400">{darkness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="95"
                    step="5"
                    value={darkness}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDarkness(val);
                      updateLivePreview(accentColor, secondaryColor, bgUrl, val, blur, position, themeMode);
                    }}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Blur Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Layers size={13} className="text-indigo-400" />
                      Flou artistique
                      {!isEffectsUnlocked && (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                          <Lock size={10} /> Niv. 15
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-indigo-400">{blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="2"
                    value={blur}
                    disabled={!isEffectsUnlocked}
                    onChange={(e) => {
                      if (!isEffectsUnlocked) return;
                      const val = parseInt(e.target.value, 10);
                      setBlur(val);
                      updateLivePreview(accentColor, secondaryColor, bgUrl, darkness, val, position, themeMode);
                    }}
                    className={`w-full accent-indigo-500 ${!isEffectsUnlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2 : PALETTE & COULEURS NÉON */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#080C14] border border-[#1E293B]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-400" />
                Mode Thème & Couleurs Néon
              </span>
              <div className="flex items-center gap-1 bg-[#0B1120] p-1 rounded-xl border border-[#1E293B]">
                {[
                  { id: 'AUTOMATIC', label: 'Automatique' },
                  { id: 'MANUAL', label: 'Manuel' },
                  { id: 'DEFAULT', label: 'Défaut' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setThemeMode(m.id);
                      if (m.id === 'DEFAULT') {
                        setAccentColor('#10b981');
                        setSecondaryColor('#06b6d4');
                        updateLivePreview('#10b981', '#06b6d4', bgUrl, darkness, blur, position, 'DEFAULT');
                      } else {
                        updateLivePreview(accentColor, secondaryColor, bgUrl, darkness, blur, position, m.id);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${themeMode === m.id
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pastilles de la palette extraite */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-bold">Accent Primaire :</span>
              {(extractedPalette.length > 0 ? extractedPalette : ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6']).map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setAccentColor(c);
                    updateLivePreview(c, secondaryColor, bgUrl, darkness, blur, position, themeMode);
                  }}
                  className={`w-7 h-7 rounded-lg border-2 transition-transform flex items-center justify-center ${accentColor.toLowerCase() === c.toLowerCase()
                      ? 'scale-110 ring-2 ring-white border-white'
                      : 'border-white/20 hover:scale-105'
                    }`}
                  style={{ backgroundColor: c }}
                >
                  {accentColor.toLowerCase() === c.toLowerCase() && <Check size={12} className="text-white stroke-[3]" />}
                </button>
              ))}

              <input
                type="color"
                value={accentColor}
                onChange={(e) => {
                  setAccentColor(e.target.value);
                  updateLivePreview(e.target.value, secondaryColor, bgUrl, darkness, blur, position, themeMode);
                }}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 ml-1"
                title="Choisir une couleur personnalisée"
              />
            </div>
          </div>

          {/* SECTION 3 : PHOTO DE PROFIL & CADRE DE NIVEAU */}
          <div className="p-4 rounded-2xl bg-[#080C14] border border-[#1E293B] flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <PlayerAvatar
                  user={{
                    ...player,
                    profileImageUrl: avatarUrl
                  }}
                  size="lg"
                  showFrame={true}
                  showBadge={true}
                />
                <div>
                  <p className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <User size={13} className="text-emerald-400" />
                    Photo de Profil du Trader
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Cadre évolutif : <span className="font-bold text-white">Niveau {userLevel}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  disabled={!isAvatarUnlocked}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleAvatarFile(e.target.files[0]);
                  }}
                />
                {isAvatarUnlocked ? (
                  <>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0B1120] hover:bg-slate-800 text-slate-200 border border-[#1E293B] transition-all cursor-pointer"
                    >
                      Changer photo
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-[#1E293B] transition-all"
                        title="Supprimer la photo de profil"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                    <Lock size={12} />
                    <span>Niveau 3 requis</span>
                  </div>
                )}
              </div>
            </div>

            {!isAvatarUnlocked && (
              <div className="pt-2 border-t border-slate-800/60 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Progression vers la photo personnalisée :</span>
                  <span className="font-mono text-amber-400 font-bold">Niveau {userLevel} / 3</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((userLevel / 3) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4 : APERÇU LIVE D'UN BOUTON & CARTE D'ARÈNE */}
          <div className="p-3.5 rounded-2xl bg-[#0B1120] border border-[#1E293B] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={15} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-300">Aperçu en Direct du Thème :</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-md"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 15px ${accentColor}60`
                }}
              >
                Bouton Principal
              </button>
              <div
                className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
                style={{
                  borderColor: `${accentColor}80`,
                  color: accentColor,
                  backgroundColor: `${accentColor}15`
                }}
              >
                Badge Thème
              </div>
            </div>
          </div>

        </div>

        {/* Sticky Actions Footer */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-t border-[#1E293B] bg-[#080C14] shrink-0 sticky bottom-0 z-20">
          <button
            type="button"
            onClick={handleRestoreDefault}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Réinitialiser</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-white shadow-xl transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 20px ${accentColor}70`
              }}
            >
              {savedSuccess ? (
                <>
                  <Check size={15} /> Thème Appliqué & Enregistré !
                </>
              ) : isSaving ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Enregistrement...
                </>
              ) : (
                'Appliquer & Enregistrer'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

