# 14:03 · Окно обслуживания

[![Первый кадр. Пять промышленных площадок на побережье ждут обновления модели.](https://raw.githubusercontent.com/npapaHAHA/npapaHAHA/main/docs/assets/field.webp)](https://npapahaha.github.io/npapaHAHA/)

Два запроса на последний слот. Пять площадок ждут обновления.

**[Войти в сцену](https://npapahaha.github.io/npapaHAHA/)** · 1 минута

Егор · ИТМО · прикладной ML и бэкенд

## Проекты

<p align="center">
  <a href="https://github.com/npapaHAHA/edge-rollout-lab"><picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/npapaHAHA/npapaHAHA/main/assets/profile/edge-dark.png">
    <img src="https://raw.githubusercontent.com/npapaHAHA/npapaHAHA/main/assets/profile/edge-light.png" width="320" alt="Edge Rollout Lab. Планировщик обновлений повысил среднюю полезность на 20,3% относительно FIFO на синтетическом парке.">
  </picture></a>
  <a href="https://github.com/npapaHAHA/SlotGuard"><picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/npapaHAHA/npapaHAHA/main/assets/profile/slotguard-dark.png">
    <img src="https://raw.githubusercontent.com/npapaHAHA/npapaHAHA/main/assets/profile/slotguard-light.png" width="320" alt="SlotGuard. Календарь ресурсов на .NET и PostgreSQL. В тесте 20 параллельных запросов на один слот дают одну бронь.">
  </picture></a>
</p>
<p align="center">
  <a href="https://github.com/npapaHAHA/support-intent-classifier"><picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/npapaHAHA/npapaHAHA/main/assets/profile/support-dark.png">
    <img src="https://raw.githubusercontent.com/npapaHAHA/npapaHAHA/main/assets/profile/support-light.png" width="320" alt="Support Intent Classifier. 77 тем банковских обращений, 0,909 macro-F1 на тестовой выборке BANKING77.">
  </picture></a>
  <a href="https://github.com/npapaHAHA/repeat-purchase-ml"><picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/npapaHAHA/npapaHAHA/main/assets/profile/retail-dark.png">
    <img src="https://raw.githubusercontent.com/npapaHAHA/npapaHAHA/main/assets/profile/retail-light.png" width="320" alt="Repeat Purchase ML. Прогноз повторной покупки на 30 дней, 0,631 Average Precision на тесте с разбиением по времени.">
  </picture></a>
</p>

<details>
<summary>Как получены результаты</summary>

- **Edge Rollout Lab.** Сравнение с FIFO по суммарной полезности за 36 дней. Среднее пяти прогонов на синтетических данных. [Бенчмарк](https://github.com/npapaHAHA/edge-rollout-lab#benchmark-results)
- **SlotGuard.** Интеграционный тест параллельного бронирования. Один ответ HTTP 201 и 19 ответов HTTP 409. [Локальное демо](https://github.com/npapaHAHA/SlotGuard#быстрый-запуск)
- **Support Intent Classifier.** TF-IDF + LinearSVC на 3 071 отложенном обращении. [Отчёт об оценке](https://github.com/npapaHAHA/support-intent-classifier/blob/main/metrics.json)
- **Repeat Purchase ML.** Признаки в SQL за 90 дней, модель CatBoost и тест на более поздних данных. [Отчёт об оценке](https://github.com/npapaHAHA/repeat-purchase-ml/blob/main/metrics.json)

</details>
