# MCP-сервер Icon Studio

Сервер даёт Claude доступ к библиотеке: Claude находит иконку по смыслу (на русском, украинском или английском) и получает готовый SVG нужного цвета, толщины и размера, при желании с фоном или как PNG. Так иконки можно ставить в презентации, документы, макеты и HTML-страницы, которые делает Claude.

## Инструменты

| Инструмент | Что делает |
|---|---|
| `search_icons` | Поиск по смыслу, ID или slug; фильтр по категории. Возвращает ID, названия, ключевые слова, ссылку на SVG. |
| `get_icon` | Одна иконка: SVG с цветом, толщиной, размером, фоном и формой фона; `format: "png"` добавляет PNG-картинку, `"original"` — исходный файл 24×24. |
| `get_icons` | Несколько иконок одним стилем — для единого набора на слайдах. |
| `build_sprite` | SVG-спрайт с `<symbol>` для сайтов. |
| `list_categories` | Категории и количество иконок. |

## Вариант 1. Локально: Claude Desktop или Claude Code

Нужны Node.js 22.18+ и клон репозитория.

```bash
git clone https://github.com/psv98/gen.git
cd gen
npm --prefix mcp install
npm run mcp:test        # проверка: вызывает все инструменты
```

Claude Code:

```bash
claude mcp add icon-studio -- node /полный/путь/gen/mcp/src/stdio.mjs
```

Claude Desktop — в `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "icon-studio": {
      "command": "node",
      "args": ["/полный/путь/gen/mcp/src/stdio.mjs"]
    }
  }
}
```

После перезапуска в списке инструментов появится `icon-studio`.

## Вариант 2. Удалённо: коннектор в claude.ai

Для claude.ai (в том числе в проектах и при работе с дизайном) нужен сервер, доступный по HTTPS. GitHub Pages для этого не подходит: он отдаёт только статические файлы, а MCP-серверу нужно выполнять код. Подойдёт любой хостинг Node.js; в репозитории есть готовый `render.yaml` для Render.com:

1. На render.com: New → Blueprint → выбрать репозиторий `psv98/gen`.
2. Render соберёт `mcp/` и запустит `node mcp/src/http.mjs`. Переменная `ICON_STUDIO_MCP_TOKEN` сгенерируется автоматически: её значение — ключ доступа.
3. Адрес коннектора: `https://<имя-сервиса>.onrender.com/mcp?token=<ICON_STUDIO_MCP_TOKEN>`.
4. В claude.ai: Settings → Connectors → Add custom connector → вставить адрес. На тарифе Team добавить коннектор для всей организации может администратор.

Проверить сервер: `https://<имя-сервиса>.onrender.com/health` должен вернуть `{"ok":true}`.

На бесплатном тарифе Render сервис засыпает после простоя, и первый запрос после паузы занимает 30–60 секунд.

Переменные окружения:

| Переменная | Назначение |
|---|---|
| `PORT` | Порт HTTP-сервера (по умолчанию 8787). |
| `ICON_STUDIO_MCP_TOKEN` | Если задан, сервер принимает запросы только с этим токеном (`?token=` или `Authorization: Bearer`). |
| `ICON_STUDIO_REGISTRY_URL` | Брать каталог по ссылке, например `https://psv98.github.io/gen/api/registry.json`, а не из файлов репозитория. Тогда новые иконки появляются в MCP сразу после деплоя сайта. |
| `ICON_STUDIO_PUBLIC_URL` | Адрес сайта для ссылок `svg_url` (по умолчанию `https://psv98.github.io/gen/`). |

## Примеры запросов к Claude

- «Подбери из Icon Studio 6 иконок для слайда о правовой помощи журналистам, синие #1E4FD8, толщина 2».
- «Найди иконку “свидетель” и вставь её PNG 256 px на светлом круглом фоне».
- «Сделай SVG-спрайт из иконок категории finance для сайта».
