# Деплой Wortland на сервер

> Эту инструкцию можно целиком отдать Claude Code на сервере — она пошаговая.
> Сервер: Ubuntu, 1 ядро / 1 ГБ RAM, nginx уже проксирует другой Next.js-сайт на
> `127.0.0.1:3000`. Поэтому Wortland поднимаем на **новом порту 3001** и отдельном
> домене/поддомене.

## 0. Требования

- **Node.js ≥ 22.5** (приложение использует встроенный `node:sqlite`). Проверь:
  ```bash
  node -v
  ```
  Если меньше 22.5 — поставь через nvm:
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.bashrc
  nvm install 22
  nvm alias default 22
  ```

## 1. Доставить код на сервер

Git-репозитория пока нет, поэтому копируем напрямую (с локальной машины),
**исключая** тяжёлое и секретное:

```bash
# с локальной машины (Windows: можно через WSL/rsync или scp)
rsync -av --exclude node_modules --exclude .next --exclude data --exclude .env.local \
  ./ ubuntu@SERVER:/home/ubuntu/wortland/
```

(или просто заархивируй папку без `node_modules/.next/data/.env.local` и распакуй на сервере в `/home/ubuntu/wortland`)

## 2. Переменные окружения

Создай `/home/ubuntu/wortland/.env.local`:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEYS=ключ1,ключ2,ключ3,ключ4
GEMINI_MODEL=gemini-2.5-flash-lite
UNSPLASH_ACCESS_KEY=твой_ключ
SESSION_SECRET=длинная_случайная_строка
# Абсолютный путь к БД — чтобы переживала пересборки
DATABASE_PATH=/home/ubuntu/wortland-data/app.db

# Коды доступа для 3 аккаунтов (СМЕНИ перед деплоем!)
# При первом запуске БД сама создаёт 3 аккаунта с этими кодами.
# Если не задать — коды генерируются рандомно и выводятся в лог один раз.
ACCOUNT_CODE_1=придумай_код1
ACCOUNT_CODE_2=придумай_код2
ACCOUNT_CODE_ADMIN=придумай_секретный_код_админа
```

> **Нет регистрации** — войти можно только по коду доступа. Регистрация отключена.
> Управление аккаунтами — через `/admin` (только для `ACCOUNT_CODE_ADMIN`):
> добавлять аккаунты, банить/разбанивать.

```bash
mkdir -p /home/ubuntu/wortland-data
```

## 3. Сборка

На 1 ГБ RAM `next build` может упасть по OOM. Вариант со swap (одноразово):

```bash
cd /home/ubuntu/wortland
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile     # включить swap
npm ci
npm run build                                       # output: 'standalone' уже в next.config.js
```

> Альтернатива: собрать `npm run build` **локально** и скопировать на сервер папки
> `.next/standalone`, `.next/static` (и `public`, если появится). Тогда сервер не
> тратит память на сборку.

Standalone-сервер ждёт статику рядом с собой — скопируй её:

```bash
cp -r .next/static .next/standalone/.next/static
# public пока нет; если появится: cp -r public .next/standalone/public
cp .env.local .next/standalone/.env.local
```

## 4. Запуск через systemd

Создай `/etc/systemd/system/wortland.service`:

```ini
[Unit]
Description=Wortland
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/wortland/.next/standalone
# путь к node (из nvm — узнай через `which node`)
ExecStart=/home/ubuntu/.nvm/versions/node/v22.x.x/bin/node server.js
Environment=PORT=3001
Environment=HOSTNAME=127.0.0.1
Environment=NODE_ENV=production
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wortland
sudo systemctl status wortland      # должно быть active (running)
curl -I http://127.0.0.1:3001       # 200/307
```

## 5. nginx (новый поддомен) + HTTPS

⚠️ Сессионная cookie ставится с флагом `Secure` в проде — сайт **обязан** работать
по HTTPS, иначе вход не сохранится.

`/etc/nginx/sites-available/wortland`:

```nginx
server {
    server_name wortland.ТВОЙ-ДОМЕН.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/wortland /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# выпустить TLS-сертификат
sudo certbot --nginx -d wortland.ТВОЙ-ДОМЕН.com
```

## 6. Обновление версии

```bash
# скопировать новый код (как в шаге 1), затем:
cd /home/ubuntu/wortland
npm ci && npm run build
cp -r .next/static .next/standalone/.next/static
cp .env.local .next/standalone/.env.local
sudo systemctl restart wortland
```

## 7. Бэкап БД

```bash
# cron: ежедневная копия
cp /home/ubuntu/wortland-data/app.db /home/ubuntu/wortland-data/app.$(date +%F).db
```

## Частые проблемы

- **502 от nginx** → сервис не запущен: `journalctl -u wortland -e`.
- **«node:sqlite is not defined»** → Node < 22.5, обнови (шаг 0).
- **Вход не сохраняется** → сайт открыт по HTTP, нужен HTTPS (шаг 5).
- **AI «лимит исчерпан»** → добавь ещё ключей в `GEMINI_API_KEYS` (через запятую).
- **Сборка убита (Killed)** → не хватило RAM: включи swap (шаг 3) или собирай локально.
