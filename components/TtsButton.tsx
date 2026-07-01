'use client';

import { useTts } from '@/hooks/useTts';

export default function TtsButton({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const { speak, supported } = useTts();
  if (!supported) return null;
  return (
    <button
      type="button"
      aria-label="Произнести"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white ${className}`}
    >
      🔊
    </button>
  );
}
