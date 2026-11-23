# Привет, я Егор

**ИТМО · Прикладной ML и бэкенд**

Собираю ML-сервисы на Python и пишу бэкенд на .NET. Мне интересно, как модель работает на новых данных и как сервис ведёт себя при одновременных запросах.

## Edge Rollout Lab

Симулятор парка edge-устройств. Сравниваю модели классификации инцидентов и планирую, как доставлять обновления при ограниченной пропускной способности сети.

На синтетическом парке из **180 устройств** планировщик с учётом лимитов трафика показал **на 20,3% больше суммарной полезности**, чем FIFO, в среднем за пять прогонов.

[Код и запуск](https://github.com/npapaHAHA/edge-rollout-lab) · [Результаты бенчмарка](https://github.com/npapaHAHA/edge-rollout-lab#benchmark-results)

[![Бенчмарк Edge Rollout Lab. Слева сравнение классификаторов на новых площадках, справа сравнение стратегий раскатки.](https://raw.githubusercontent.com/npapaHAHA/edge-rollout-lab/main/reports/benchmark.png)](https://github.com/npapaHAHA/edge-rollout-lab#benchmark-results)

## Другие проекты

- **[SlotGuard](https://github.com/npapaHAHA/SlotGuard)** — календарь для бронирования помещений и оборудования на ASP.NET Core и PostgreSQL. Интеграционный тест проверяет, что из **20 одновременных запросов** на один слот проходит ровно один. [Скриншот календаря](https://github.com/npapaHAHA/SlotGuard/blob/main/docs/screenshots/calendar.png)
- **[Support Intent Classifier](https://github.com/npapaHAHA/support-intent-classifier)** — FastAPI-сервис, который определяет одну из **77 тем** банковского обращения. Модель TF-IDF + LinearSVC получила **0,909 macro-F1** на тестовой выборке BANKING77.
- **[Repeat Purchase ML](https://github.com/npapaHAHA/repeat-purchase-ml)** — прогноз повторной покупки на ближайшие 30 дней. Считаю признаки в SQL и проверяю CatBoost на более поздних данных.
