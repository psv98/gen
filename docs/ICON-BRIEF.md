# Бриф для внешнего исполнителя иконок

Этот файл можно целиком передать другой модели (или дизайнеру), которая будет рисовать новые иконки для Icon Studio. Готовые иконки приходят ZIP-архивом и проходят через `npm run import-icons`: всё, что нарушает правила ниже, скрипт отклонит и назовёт причину.

## Как устроен процесс

1. Здесь (в этом репозитории) составляется список концепций партии: slug, названия на трёх языках, короткое описание идеи. Пример партии — в конце файла.
2. Исполнитель рисует по 25–50 иконок за раз, по этому брифу, и складывает в папку: `<slug>.svg` + `manifest.json`.
3. Папка упаковывается в ZIP и передаётся в работу.
4. `node scripts/import-icons.mjs batch.zip --category legal --dry` — проверка без записи. Без `--dry` принятые иконки добавляются в `icons-src/<категория>.mjs`.
5. `npm run icons`, `npm run sheets <категория> -- --mode=big` — контактный лист для визуальной проверки. Слабые иконки возвращаются исполнителю с конкретными замечаниями или правятся здесь.
6. `npm run validate-icons`, коммит, деплой. Через MCP новые иконки сразу доступны Claude.

Если категория вырастает больше 50 иконок, в `scripts/validate-icons.mjs` меняются `EXPECTED_TOTAL` и `PER_CATEGORY`.

## Технические требования (строго)

```
viewBox="0 0 24 24", width="24", height="24"
fill="none" stroke="currentColor" stroke-width="1.8"
stroke-linecap="round" stroke-linejoin="round"
```

- Только обводки. Никаких заливок (`fill` у элементов), градиентов, фильтров, масок, `<image>`, `<text>`, `<use>`, `<style>`, `class`, `id`.
- Разрешённые элементы: `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon`.
- У дочерних элементов нет `stroke`, `stroke-width`, `fill`, `style`: всё наследуется от корня, иначе редактор не сможет менять цвет и толщину.
- `transform` допускается только `rotate(угол cx cy)` и `translate(...)`. `scale`, `matrix`, `skew` запрещены: они искажают толщину линии.
- Не превращать обводку в контур (Outline Stroke / Expand). Линия должна оставаться линией.
- Координаты с точностью до 0.1–0.25, без лишних узлов.
- Без групп `<g>` с трансформациями.

## Сетка и пропорции

- Рабочее поле 2–22 по обеим осям. Края 1–2 — только для выступающих мелочей (антенна, ручка). За 1–23 не выходить.
- Крупные фигуры: круг r = 9–9.5, квадрат 18×18 со скруглением 2, вертикальный прямоугольник 14×18, горизонтальный 18×14.
- Документ: лист 14×18 (x 5–19, y 3–21) со скруглением 2 и загнутым углом 5.5.
- Человек: голова r = 2.5–3, плечи — дуга радиусом 4.5–6. Между головой и плечами зазор не меньше 1.5.
- Минимальный просвет между отдельными элементами — 2 единицы. Меньше нельзя: при толщине 1.8 элементы сольются, а при увеличении толщины до 2.4 превратятся в пятно.
- Точки делаются отрезком нулевой длины: `M12 17h.01`.
- Скругления углов 1–2 у прямоугольников, 0.5–1 у мелких деталей.
- Композиция по центру: центр габаритов около (12, 12). Скрипт импорта всё равно доцентрирует, но иконка должна выглядеть уравновешенной.
- Иконка должна читаться в 16 px. Проверка: уменьшите до 16 px, отличается ли она от соседних и понятен ли смысл. Если нет — меньше деталей.

## Стиль

- Спокойная геометрия: прямые, дуги окружностей, мягкие кривые. Без каллиграфии, штриховки и декоративных завитков.
- Одна главная форма и максимум 1–2 уточняющие детали. Бейдж-модификатор (галочка, замок, часы) — круг r = 4 в правом нижнем углу с вырезом в основной форме (зазор 2).
- Без текста и букв, кроме устойчивых знаков: §, %, №, #, $.
- Без брендов, логотипов, флагов реальных стран, гербов, религиозных символов и узнаваемых персонажей.
- Не копировать иконки из Lucide, Heroicons, Tabler, Material, Phosphor и других библиотек — только собственная геометрия.

## Что прислать

```
batch-legal-01.zip
├── manifest.json
├── witness-protection.svg
├── jury-deliberation.svg
└── …
```

`manifest.json` — массив, по объекту на иконку:

```json
[
  {
    "slug": "witness-protection",
    "ru": "Защита свидетелей",
    "uk": "Захист свідків",
    "en": "Witness Protection",
    "description": "Человек в контуре щита",
    "keywords": { "ru": ["свидетель", "защита"], "uk": ["свідок", "захист"], "en": ["witness", "protection"] },
    "tags": ["person", "security"]
  }
]
```

Имя файла совпадает со `slug`: латиница, цифры и дефисы.

## Образцы из библиотеки

Весы правосудия:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3v17M8 20h8M5 7h14"/>
  <path d="M2.5 13 5 7l2.5 6M16.5 13 19 7l2.5 6"/>
  <path d="M2 13h6a3 3 0 0 1-6 0ZM16 13h6a3 3 0 0 1-6 0Z"/>
</svg>
```

Решение суда (документ с бейджем):

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19 11V8.5L13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/>
  <path d="M13.5 3v4a1.5 1.5 0 0 0 1.5 1.5h4"/>
  <path d="M8 12h5M8 15.5h3"/>
  <circle cx="17" cy="17" r="4"/>
  <path d="m15.3 17 1.2 1.2 2.3-2.4"/>
</svg>
```

## Чек-лист перед отправкой

- [ ] viewBox 0 0 24 24, корневые атрибуты как выше
- [ ] нет заливок, текста, картинок, `scale`
- [ ] просветы ≥ 2, ничего не выходит за 1–23
- [ ] читается в 16 px, не путается с соседними
- [ ] slug уникален, есть запись в manifest.json на трёх языках

## Пример следующей партии: право (50 концепций)

| slug | ru | en |
|---|---|---|
| witness-protection | Защита свидетелей | Witness Protection |
| jury-deliberation | Совещание присяжных | Jury Deliberation |
| plea-bargain | Сделка со следствием | Plea Bargain |
| bail | Залог | Bail |
| parole | Условно-досрочное освобождение | Parole |
| probation | Испытательный срок | Probation |
| court-bailiff | Судебный исполнитель | Court Bailiff |
| subpoena-duces | Истребование доказательств | Production Order |
| cross-examination | Перекрёстный допрос | Cross-Examination |
| closing-argument | Заключительная речь | Closing Argument |
| court-transcript | Стенограмма заседания | Court Transcript |
| legal-precedent | Судебный прецедент | Legal Precedent |
| supreme-court | Верховный суд | Supreme Court |
| constitutional-court | Конституционный суд | Constitutional Court |
| arbitration | Арбитраж | Arbitration |
| class-action | Коллективный иск | Class Action |
| cease-and-desist | Требование прекратить нарушение | Cease and Desist |
| non-disclosure | Соглашение о неразглашении | NDA |
| employment-law | Трудовое право | Employment Law |
| labor-dispute | Трудовой спор | Labor Dispute |
| tenant-rights | Права арендатора | Tenant Rights |
| consumer-protection | Защита прав потребителей | Consumer Protection |
| inheritance | Наследство | Inheritance |
| custody | Опека над ребёнком | Child Custody |
| alimony | Алименты | Alimony |
| adoption | Усыновление | Adoption |
| immigration-law | Миграционное право | Immigration Law |
| asylum | Убежище | Asylum |
| extradition | Экстрадиция | Extradition |
| war-crimes | Военные преступления | War Crimes |
| tribunal | Международный трибунал | International Tribunal |
| sanctions-list | Санкционный список | Sanctions List |
| anti-money-laundering | Противодействие отмыванию | Anti-Money Laundering |
| corporate-law | Корпоративное право | Corporate Law |
| shareholders | Права акционеров | Shareholder Rights |
| bankruptcy | Банкротство | Bankruptcy |
| debt-collection | Взыскание долга | Debt Collection |
| tax-dispute | Налоговый спор | Tax Dispute |
| land-dispute | Земельный спор | Land Dispute |
| environmental-law | Экологическое право | Environmental Law |
| media-law | Медиаправо | Media Law |
| defamation | Клевета | Defamation |
| right-to-reply | Право на ответ | Right of Reply |
| access-to-information | Доступ к публичной информации | Access to Information |
| slapp | SLAPP-иск | SLAPP Lawsuit |
| strategic-litigation | Стратегическая тяжба | Strategic Litigation |
| pro-bono | Работа pro bono | Pro Bono |
| legal-clinic | Юридическая клиника | Legal Clinic |
| ombudsman | Омбудсман | Ombudsman |
| ruling-enforcement | Исполнение решения | Enforcement of Judgment |
