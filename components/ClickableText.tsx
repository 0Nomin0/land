'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTts } from '@/hooks/useTts';
import type { WordLink } from '@/lib/types';

interface Active {
  key: string;
  word: string;
  translation: string | null;
  transcription: string | null;
}

export default function ClickableText({
  body,
  wordLinks,
}: {
  body: string;
  wordLinks: WordLink[];
}) {
  const { speak, supported } = useTts();
  const [active, setActive] = useState<Active | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // карта: нормализованное слово → { перевод, транскрипция } (по surface и по lemma)
  const lookup = useMemo(() => {
    const m = new Map<string, { tr: string; ipa: string | null }>();
    for (const l of wordLinks) {
      const v = { tr: l.translation, ipa: l.transcription ?? null };
      if (l.surface) m.set(norm(l.surface), v);
      if (l.lemma) m.set(norm(l.lemma), v);
    }
    return m;
  }, [wordLinks]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActive(null);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const paragraphs = body.split(/\n+/).filter((p) => p.trim());

  return (
    <div ref={containerRef} className="space-y-4 text-lg leading-relaxed">
      {paragraphs.map((para, pi) => (
        <p key={pi}>
          {para.split(/(\s+)/).map((tok, ti) => {
            if (/^\s+$/.test(tok)) return tok;
            const { pre, core, post } = splitToken(tok);
            if (!core) return <span key={ti}>{tok}</span>;

            const entry = lookup.get(norm(core)) ?? null;
            const translation = entry?.tr ?? null;
            const known = translation !== null;
            const key = `${pi}-${ti}`;
            const isActive = active?.key === key;

            return (
              <span key={ti} className="relative">
                {pre}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(
                      isActive
                        ? null
                        : {
                            key,
                            word: core,
                            translation,
                            transcription: entry?.ipa ?? null,
                          },
                    );
                    if (supported) speak(core);
                  }}
                  className={`cursor-pointer rounded transition ${
                    known
                      ? 'bg-brand/15 text-brand-light hover:bg-brand/30'
                      : 'hover:bg-white/10'
                  } ${isActive ? 'ring-1 ring-brand' : ''}`}
                >
                  {core}
                </span>
                {post}
                {isActive && (
                  <span
                    className="absolute left-1/2 top-full z-20 mt-1 w-max max-w-[220px] -translate-x-1/2 rounded-xl border border-white/15 bg-[#1a1a2e] px-3 py-2 text-sm shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="flex items-center gap-2">
                      <b className="text-white">{core}</b>
                      {supported && (
                        <button
                          onClick={() => speak(core)}
                          className="text-white/60 hover:text-white"
                          aria-label="Произнести"
                        >
                          🔊
                        </button>
                      )}
                    </span>
                    {active?.transcription && (
                      <span className="mt-0.5 block font-mono text-xs text-white/45">
                        {active.transcription}
                      </span>
                    )}
                    <span className="mt-0.5 block text-brand-light">
                      {translation ?? 'перевод недоступен'}
                    </span>
                  </span>
                )}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[.,!?;:»«"'()—–-]/g, '').trim();
}

function splitToken(tok: string): { pre: string; core: string; post: string } {
  const m = tok.match(/^([^\p{L}]*)([\p{L}][\p{L}ß-]*)?([^\p{L}]*)$/u);
  if (!m) return { pre: '', core: tok, post: '' };
  return { pre: m[1] ?? '', core: m[2] ?? '', post: m[3] ?? '' };
}
