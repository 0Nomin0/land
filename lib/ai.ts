import 'server-only';
import type { Level } from './types';

/**
 * Провайдеро-независимый AI-слой. Источник по умолчанию — бесплатный Gemini Flash.
 * Переключение через env AI_PROVIDER = 'gemini' | 'anthropic'.
 * Все функции возвращают строгий JSON (structured output) и бросают AiError при сбое.
 * Кэширование результатов — на стороне вызывающего кода (в БД).
 */

export class AiError extends Error {}

export interface GeneratedWord {
  lemma: string;
  article: string | null;
  translation: string;
  part_of_speech: string;
  example: string;
  transcription: string;
}

export interface GeneratedText {
  title: string;
  body: string;
  image_query: string;
  word_links: {
    surface: string;
    lemma: string;
    translation: string;
    transcription?: string;
  }[];
}

const TIMEOUT_MS = 30_000;

/** Список Gemini-ключей: GEMINI_API_KEYS (через запятую) + GEMINI_API_KEY, без дублей. */
function getGeminiKeys(): string[] {
  const multi = (process.env.GEMINI_API_KEYS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const single = process.env.GEMINI_API_KEY?.trim();
  if (single) multi.push(single);
  return multi.filter((k, i, a) => a.indexOf(k) === i);
}

function provider(): 'gemini' | 'anthropic' {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === 'anthropic' || explicit === 'gemini') return explicit;
  // авто: если есть только ключ Anthropic — берём его, иначе Gemini
  if (getGeminiKeys().length === 0 && process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  return 'gemini';
}

// ── Промпты (общие для провайдеров) ─────────────────────────────────────────

const SYS_TOPICS =
  'Ты помогаешь учить немецкий. По широким интересам пользователя предложи КОНКРЕТНЫЕ ' +
  'точечные подтемы, на основе которых удобно подбирать лексику. Подтемы на русском, коротко, без дублей.';

const SYS_WORDS =
  'Ты — преподаватель немецкого. Подбирай реальную, ЧАСТОТНУЮ повседневную лексику строго под ' +
  'уровень CEFR — самые полезные слова для этого уровня, разные части речи из разных сфер жизни ' +
  '(быт, природа, работа, чувства, общение, путешествия, еда, спорт — вперемешку). ' +
  'Существительные давай с артиклем. Примеры — простые и естественные, под уровень. ' +
  'Слова должны быть максимально РАЗНООБРАЗНЫМИ по теме. ' +
  'Для каждого слова дай transcription — фонетическую транскрипцию в IPA (например [ˈapfl̩]).';

const SYS_TEXT =
  'Ты пишешь ЗАХВАТЫВАЮЩИЕ тексты на немецком строго под уровень CEFR. ' +
  'Стиль: живой, конкретный, как хороший журнал или крутой подкаст — НЕ учебник! ' +
  'Всегда выбирай КОНКРЕТНОЕ событие, яркую личность, удивительный факт или захватывающий момент: ' +
  'если тема «футбол» — реальный матч, легенда, драматичный финал; ' +
  'если «история» — конкретный момент с именами и датами; ' +
  'если «наука» — удивительное открытие или странный факт. ' +
  'НИКАКИХ абстрактных рассуждений типа «Sport ist wichtig»! ' +
  'Обязательно органично используй заданные слова. ' +
  'Для word_links: важные слова в той форме, в какой они стоят в тексте, + transcription (IPA, напр. [ˈapfl̩]). ' +
  'image_query — 2–4 конкретных слова на АНГЛИЙСКОМ для поиска яркой иллюстрации к теме текста.';

function topicsPrompt(interests: string[], level: Level): string {
  return `Уровень: ${level}. Интересы пользователя: ${interests.join(', ')}.\nПредложи 8–14 точечных подтем.`;
}

function wordsPrompt(o: { level: Level; count: number; exclude: string[] }): string {
  return (
    `Уровень: ${o.level}. Дай ${o.count} полезных частотных немецких слов этого уровня ` +
    `(существительные, глаголы, прилагательные — вперемешку).\n` +
    (o.exclude.length
      ? `НЕ включай эти слова (уже известны): ${o.exclude.slice(0, 100).join(', ')}.`
      : '')
  );
}

function textPrompt(o: {
  level: Level;
  topic: string;
  mustIncludeWords: { lemma: string; translation: string }[];
  source?: string;
}): string {
  const words = o.mustIncludeWords.map((w) => w.lemma).join(', ');
  if (o.source) {
    return (
      `Уровень: ${o.level}. Это НОВОСТНОЙ режим, тема: «${o.topic}».\n` +
      `Ниже реальные заголовки новостей — перепиши их в одну СВЯЗНУЮ, простую немецкую ` +
      `новостную заметку строго под уровень ${o.level} (5–8 предложений), сохраняя суть.\n` +
      `Обязательно органично используй эти слова: ${words || '(на усмотрение)'}.\n\n` +
      `Заголовки:\n${o.source}`
    );
  }
  return (
    `Уровень: ${o.level}. Тема: «${o.topic}».\n` +
    `Придумай что-то КОНКРЕТНОЕ и ИНТЕРЕСНОЕ по этой теме — реальное событие, удивительный факт, ` +
    `яркую личность или захватывающий момент. Пиши живо, не скучно!\n` +
    `Обязательно используй эти слова: ${words || '(на усмотрение)'}.\n` +
    `Объём: 6–10 динамичных предложений.`
  );
}

// ── Нормализация результатов ────────────────────────────────────────────────

function cleanWords(words: GeneratedWord[]): GeneratedWord[] {
  return (words ?? [])
    .filter((w) => w && w.lemma && w.translation && String(w.translation).trim().length >= 2)
    .map((w) => {
      let lemma = String(w.lemma).trim();
      let article = w.article ? String(w.article).trim() : null;
      // модель иногда дублирует артикль в начало леммы («der Ball» при article='der')
      const m = lemma.match(/^(der|die|das)\s+(.+)$/i);
      if (m) {
        if (!article) article = m[1].toLowerCase();
        lemma = m[2].trim();
      }
      return {
        lemma,
        article,
        translation: String(w.translation).trim(),
        part_of_speech: String(w.part_of_speech ?? 'other').trim(),
        example: String(w.example ?? '').trim(),
        transcription: String(w.transcription ?? '').trim(),
      };
    });
}

// ── Публичные функции (диспетчеризация) ─────────────────────────────────────

export async function refineTopics(
  interests: string[],
  level: Level,
): Promise<string[]> {
  const raw =
    provider() === 'anthropic'
      ? await anthropicTopics(interests, level)
      : await geminiTopics(interests, level);
  return (raw ?? []).map((t) => String(t).trim()).filter(Boolean).slice(0, 14);
}

export async function generateWords(opts: {
  level: Level;
  count: number;
  exclude: string[];
}): Promise<GeneratedWord[]> {
  const raw =
    provider() === 'anthropic'
      ? await anthropicWords(opts)
      : await geminiWords(opts);
  return cleanWords(raw);
}

export async function generateText(opts: {
  level: Level;
  topic: string;
  mustIncludeWords: { lemma: string; translation: string }[];
  source?: string;
}): Promise<GeneratedText> {
  const r =
    provider() === 'anthropic'
      ? await anthropicText(opts)
      : await geminiText(opts);
  return {
    title: (r.title ?? opts.topic).trim(),
    body: (r.body ?? '').trim(),
    image_query: (r.image_query ?? opts.topic).trim(),
    word_links: (r.word_links ?? []).filter((l) => l && l.surface && l.translation),
  };
}

// ── Gemini ──────────────────────────────────────────────────────────────────

/** Снимает ```json … ``` обёртку, если модель её добавила. */
function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function errCode(e: unknown): number {
  const anyE = e as { status?: number; message?: string };
  if (typeof anyE?.status === 'number') return anyE.status;
  const m = String(anyE?.message ?? '').match(/"code":\s*(\d+)/);
  return m ? Number(m[1]) : 0;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Вызов Gemini с устойчивостью к бесплатному тиру:
 *  - "thinking" отключён (иначе JSON обрезается);
 *  - на временную перегрузку (503) — короткий ретрай;
 *  - на исчерпание квоты (429) — переход к следующей модели (у каждой свой лимит).
 */
// Балансировщик: с какого ключа начинать (чтобы нагрузка размазывалась по ключам).
let keyCursor = 0;
// Кэш клиентов по ключу (чтобы не пересоздавать на каждый вызов).
const clientCache = new Map<string, import('@google/genai').GoogleGenAI>();

async function geminiCall<T>(
  system: string,
  userText: string,
  responseSchema: unknown,
  maxTokens: number,
): Promise<T> {
  const keys = getGeminiKeys();
  if (keys.length === 0) throw new AiError('Gemini-ключ не задан в окружении');

  const { GoogleGenAI } = await import('@google/genai');

  const models = [
    process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
  ].filter((m, i, a) => a.indexOf(m) === i);

  // ротация стартового ключа
  const start = keyCursor++ % keys.length;
  const orderedKeys = keys.map((_, i) => keys[(start + i) % keys.length]);

  let lastErr: unknown;

  // Перебор: ключ → модель (у каждой пары свой бесплатный лимит).
  for (const key of orderedKeys) {
    let ai = clientCache.get(key);
    if (!ai) {
      ai = new GoogleGenAI({ apiKey: key });
      clientCache.set(key, ai);
    }

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await ai.models.generateContent({
            model,
            contents: userText,
            config: {
              systemInstruction: system,
              responseMimeType: 'application/json',
              responseSchema: responseSchema as never,
              temperature: 0.7,
              maxOutputTokens: maxTokens,
              thinkingConfig: { thinkingBudget: 0 },
              httpOptions: { timeout: TIMEOUT_MS },
            },
          });
          const text = res.text;
          if (!text) {
            const reason = res.candidates?.[0]?.finishReason;
            throw new AiError(`пустой ответ${reason ? ` (${reason})` : ''}`);
          }
          return JSON.parse(stripFences(text)) as T;
        } catch (e) {
          lastErr = e;
          const code = errCode(e);
          if (code === 503 && attempt === 0) {
            await sleep(1000); // перегрузка — короткий ретрай той же парой
            continue;
          }
          break; // 429/прочее — следующая модель, затем следующий ключ
        }
      }
    }
  }

  const code = errCode(lastErr);
  if (code === 429) {
    throw new AiError(
      'Достигнут бесплатный лимит Gemini. Подожди немного и попробуй снова.',
    );
  }
  throw new AiError(
    `Ошибка Gemini: ${lastErr instanceof Error ? lastErr.message.slice(0, 120) : 'неизвестно'}`,
  );
}

async function geminiTopics(interests: string[], level: Level): Promise<string[]> {
  const schema = {
    type: 'OBJECT',
    properties: {
      topics: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['topics'],
  };
  const r = await geminiCall<{ topics: string[] }>(
    SYS_TOPICS,
    topicsPrompt(interests, level),
    schema,
    1024,
  );
  return r.topics ?? [];
}

async function geminiWords(opts: {
  level: Level;
  count: number;
  exclude: string[];
}): Promise<GeneratedWord[]> {
  const schema = {
    type: 'OBJECT',
    properties: {
      words: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            lemma: { type: 'STRING' },
            article: { type: 'STRING', nullable: true },
            translation: { type: 'STRING' },
            part_of_speech: { type: 'STRING' },
            example: { type: 'STRING' },
            transcription: { type: 'STRING' },
          },
          required: ['lemma', 'translation', 'part_of_speech', 'example', 'transcription'],
        },
      },
    },
    required: ['words'],
  };
  const r = await geminiCall<{ words: GeneratedWord[] }>(
    SYS_WORDS,
    wordsPrompt(opts),
    schema,
    4096,
  );
  return r.words ?? [];
}

async function geminiText(opts: {
  level: Level;
  topic: string;
  mustIncludeWords: { lemma: string; translation: string }[];
  source?: string;
}): Promise<GeneratedText> {
  const schema = {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      body: { type: 'STRING' },
      image_query: { type: 'STRING' },
      word_links: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            surface: { type: 'STRING' },
            lemma: { type: 'STRING' },
            translation: { type: 'STRING' },
            transcription: { type: 'STRING' },
          },
          required: ['surface', 'lemma', 'translation', 'transcription'],
        },
      },
    },
    required: ['title', 'body', 'image_query', 'word_links'],
  };
  return geminiCall<GeneratedText>(SYS_TEXT, textPrompt(opts), schema, 2048);
}

// ── Anthropic (Claude) ──────────────────────────────────────────────────────

async function anthropicCall<T>(
  system: string,
  userText: string,
  tool: { name: string; description: string; input_schema: unknown },
  maxTokens: number,
): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiError('ANTHROPIC_API_KEY не задан в окружении');

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS });
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5';

  let resp;
  try {
    resp = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      tools: [tool as never],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: userText }],
    });
  } catch (e) {
    throw new AiError(
      `Ошибка Claude: ${e instanceof Error ? e.message : 'неизвестно'}`,
    );
  }

  const block = resp.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new AiError('Claude не вернул структурированный ответ');
  }
  return block.input as T;
}

async function anthropicTopics(interests: string[], level: Level): Promise<string[]> {
  const r = await anthropicCall<{ topics: string[] }>(
    SYS_TOPICS,
    topicsPrompt(interests, level),
    {
      name: 'submit_topics',
      description: 'Вернуть список уточнённых точечных подтем',
      input_schema: {
        type: 'object',
        properties: {
          topics: { type: 'array', items: { type: 'string' } },
        },
        required: ['topics'],
      },
    },
    1024,
  );
  return r.topics ?? [];
}

async function anthropicWords(opts: {
  level: Level;
  count: number;
  exclude: string[];
}): Promise<GeneratedWord[]> {
  const r = await anthropicCall<{ words: GeneratedWord[] }>(
    SYS_WORDS,
    wordsPrompt(opts),
    {
      name: 'submit_words',
      description: 'Вернуть список немецких слов с переводом',
      input_schema: {
        type: 'object',
        properties: {
          words: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                lemma: { type: 'string' },
                article: { type: ['string', 'null'] },
                translation: { type: 'string' },
                part_of_speech: { type: 'string' },
                example: { type: 'string' },
                transcription: { type: 'string' },
              },
              required: ['lemma', 'translation', 'part_of_speech', 'example', 'transcription'],
            },
          },
        },
        required: ['words'],
      },
    },
    2048,
  );
  return r.words ?? [];
}

async function anthropicText(opts: {
  level: Level;
  topic: string;
  mustIncludeWords: { lemma: string; translation: string }[];
  source?: string;
}): Promise<GeneratedText> {
  return anthropicCall<GeneratedText>(
    SYS_TEXT,
    textPrompt(opts),
    {
      name: 'submit_text',
      description: 'Вернуть немецкий текст и ключевые слова с переводом',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          image_query: {
            type: 'string',
            description: '2–4 английских слова для поиска фото',
          },
          word_links: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                surface: { type: 'string' },
                lemma: { type: 'string' },
                translation: { type: 'string' },
                transcription: { type: 'string' },
              },
              required: ['surface', 'lemma', 'translation'],
            },
          },
        },
        required: ['title', 'body', 'image_query', 'word_links'],
      },
    },
    2048,
  );
}
