'use client';

import { useCallback, useRef } from 'react';

export function useTts() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback((text: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(`/api/tts?q=${encodeURIComponent(text)}`);
    audioRef.current = audio;
    audio.play().catch(() => {});
  }, []);

  return { speak, supported: true };
}
