# Wortland — изучение немецких слов с AI и интервальным повторением

Веб-приложение: выбираешь уровень и интересные темы → AI уточняет темы и подбирает
слова → учишь их в мини-играх → интервальное повторение (SM-2) не даёт забыть →
читаешь сгенерированные тексты по своим темам с переводом слов по клику и озвучкой.

## Стек

- **Next.js 15** (App Router, TypeScript) — фронт и API в одном проекте
- **SQLite** через встроенный модуль **`node:sqlite`** — без нативной компиляции
- Своя cookie-авторизация (`bcryptjs` + httpOnly-сессии в БД)
- **AI-генерация** слов/тем/текстов с кэшем в БД. Провайдер переключаемый:
  - **Gemini** (по умолчанию, бесплатный) — `@google/genai`
  - **Claude** (опция) — `@anthropic-ai/sdk`
- Tailwind CSS, Web Speech API для озвучки (`de-DE`)

> ⚠️ **Требуется Node.js ≥ 22.5** (для `node:sqlite`). Разрабатывалось на Node 24.
> На сервере проверь: `node -v`. При необходимости обнови через `nvm`.

## Быстрый старт (локально)

```bash
npm install
cp .env.local.example .env.local   # впиши ANTHROPIC_API_KEY и SESSION_SECRET
npm run dev                         # http://localhost:3000
```

Тесты алгоритма повторения:

```bash
npm test        # node --test (lib/srs.test.ts)
```

Засеять словарь без вызова AI (опционально, для офлайн-проверки):

```bash
node scripts/seed.mjs
```

## Переменные окружения (`.env.local`)

| Переменная          | Назначение                                                  |
|---------------------|-------------------------------------------------------------|
| `AI_PROVIDER`       | `gemini` (по умолчанию) или `anthropic`                     |
| `GEMINI_API_KEY`    | Бесплатный ключ: https://aistudio.google.com/apikey         |
| `GEMINI_MODEL`      | По умолчанию `gemini-2.5-flash`                             |
| `ANTHROPIC_API_KEY` | Если `AI_PROVIDER=anthropic`. https://console.anthropic.com |
| `ANTHROPIC_MODEL`   | По умолчанию `claude-haiku-4-5`                            |
| `SESSION_SECRET`    | Любая длинная случайная строка                              |
| `DATABASE_PATH`     | Путь к файлу SQLite, по умолчанию `./data/app.db`          |

> Замечание по Gemini: модель `gemini-2.0-flash` на некоторых бесплатных ключах
> возвращает квоту 0 (429). Рабочие на free-tier: `gemini-2.5-flash` (по умолчанию),
> `gemini-2.5-flash-lite`, `gemini-flash-latest`.

## Деплой на сервер 1 ГБ RAM (Ubuntu + nginx)

`next build` может упасть по OOM на 1 ГБ. Варианты:

**Вариант А — сборка локально, заливка результата (рекомендуется):**
```bash
npm run build         # output: 'standalone' уже включён в next.config.js
# залить на сервер: .next/standalone, .next/static, public (если есть), data/
# запуск на сервере:
node .next/standalone/server.js   # слушает PORT (по умолчанию 3000)
```

**Вариант Б — сборка на сервере со swap:**
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
npm ci && npm run build && npm start
```

nginx уже проксирует на `127.0.0.1:3000` — конфиг менять не нужно.
Cookie сессии ставится с флагом `Secure` в продакшене → сайт должен открываться по
**HTTPS** (через nginx), иначе вход не сохранится.

Бэкап БД: периодически копируй `data/app.db` (cron).

## Структура

```
app/            # страницы и API (App Router)
  (auth)/       # login, register
  (app)/        # авторизованная зона: learn, review, read, dashboard
  onboarding/   # мастер настройки
  api/          # route handlers (auth, ai, session, review, onboarding)
components/     # UI и мини-игры (games/)
hooks/          # useTts
lib/            # db, auth, profile, anthropic, words, srs, session, texts, stats
scripts/        # seed.mjs — наполнение словаря для офлайн-проверки
```

## Как работает повторение (SM-2)

`lib/srs.ts` — чистая функция `schedule(state, grade)`. Оценка 0–5:
провал (<3) сбрасывает интервал, успех увеличивает по ease-фактору. За одну сессию
мини-игр оценки по слову усредняются в один апдейт, чтобы интервал не «улетал».
Слова к повторению — те, у кого `due_at <= now`.
