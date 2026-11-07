import React, { useState, useEffect, useCallback } from 'react';
import CompactCelebration3D from './celebrations/CompactCelebration3D';
import { getPendingCelebrations, markCelebrationDisplayed } from '../../services/api';

/**
 * Central Celebration Queue Manager.
 * Orchestrates celebration events with deduplication, audio sync, and compact 3D visual presentation.
 */
export default function CelebrationManager({ currentUser }) {
  const [queue, setQueue] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);

  // Poll for pending un-displayed events from backend
  const checkPending = useCallback(async () => {
    if (!currentUser) return;
    try {
      const pending = await getPendingCelebrations();
      if (Array.isArray(pending) && pending.length > 0) {
        setQueue((prev) => {
          const existingIds = new Set(prev.map((e) => e.eventId));
          const newEvents = pending.filter((e) => !existingIds.has(e.eventId));
          return [...prev, ...newEvents];
        });
      }
    } catch (_) { }
  }, [currentUser]);

  useEffect(() => {
    checkPending();
    const interval = setInterval(checkPending, 8000);
    return () => clearInterval(interval);
  }, [checkPending]);

  // Advance queue when active event completes
  useEffect(() => {
    if (!activeEvent && queue.length > 0) {
      const next = queue[0];
      setActiveEvent(next);
      setQueue((prev) => prev.slice(1));
    }
  }, [activeEvent, queue]);

  const handleDismiss = async () => {
    if (!activeEvent) return;
    const currentId = activeEvent.eventId;
    setActiveEvent(null);
    try {
      await markCelebrationDisplayed(currentId);
    } catch (_) { }
  };

  // Keyboard shortcut: Escape skips current celebration
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeEvent) {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeEvent]);

  if (!activeEvent) return null;

  return (
    <CompactCelebration3D
      event={activeEvent}
      onDismiss={handleDismiss}
    />
  );
}
