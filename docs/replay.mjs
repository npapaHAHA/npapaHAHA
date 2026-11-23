export const DURATION = 60;
export const ROLLOUT_START = 24;
export const PLAN_NAMES = Object.freeze({ fifo: "FIFO", bandwidth: "С учётом канала", gain: "Сначала прирост" });
export const BUDGETS = Object.freeze([70, 115, 170]);

export const CHAPTERS = Object.freeze([
  {
    id: "brief", at: 0, label: "Окно открыто", title: "До закрытия окна — 60 секунд",
    caption: "Пять площадок ждут обновления модели. У операторов остался один слот обслуживания.",
  },
  {
    id: "booking", at: 10, label: "Гонка за слот", title: "Два оператора. Один свободный слот.",
    caption: "Оба запроса входят в систему одновременно. Успешной может быть только одна бронь.",
  },
  {
    id: "rollout", at: ROLLOUT_START, label: "Раскатка", title: "Окно открыто. Модели выходят в сеть.",
    caption: "Смените стратегию или лимит канала, чтобы посмотреть вторую версию событий.",
  },
  {
    id: "result", at: 54, label: "Два исхода", title: "Одна сеть. Разные результаты.",
    caption: "Сравните накопленную полезность и объём трафика при одинаковом лимите.",
  },
]);

export function clampTime(value) {
  return Number.isFinite(value) ? Math.min(DURATION, Math.max(0, value)) : 0;
}

export function chapterAt(seconds) {
  return CHAPTERS.findLast(chapter => seconds >= chapter.at) ?? CHAPTERS[0];
}

export function replayDay(seconds, dayCount) {
  const elapsed = Math.max(0, clampTime(seconds) - ROLLOUT_START);
  return Math.min(dayCount, Math.floor(dayCount * elapsed / (DURATION - ROLLOUT_START)));
}

export function readSceneUrl(url) {
  const query = new URL(url).searchParams;
  const plan = query.get("plan");
  const budget = Number(query.get("cap"));
  const inspection = query.get("trace");
  return {
    resume: query.has("t") || query.has("trace") || query.get("compare") === "1",
    time: clampTime(Number(query.get("t"))),
    plan: plan === "gain" ? plan : "bandwidth",
    budget: BUDGETS.includes(budget) ? budget : 115,
    compare: query.get("compare") === "1",
    inspection: CHAPTERS.some(chapter => chapter.id === inspection) ? inspection : null,
  };
}

export function sceneUrl(location, state) {
  const url = new URL(location);
  url.search = "";
  url.hash = "";
  url.searchParams.set("t", clampTime(state.time).toFixed(1));
  url.searchParams.set("cap", state.budget.toString());
  url.searchParams.set("plan", state.plan);
  if (state.compare) url.searchParams.set("compare", "1");
  if (state.inspection && CHAPTERS.some(chapter => chapter.id === state.inspection)) {
    url.searchParams.set("trace", state.inspection);
  }
  return url.href;
}

export function timecode(value) {
  const seconds = Math.floor(clampTime(value));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function wallClock(value) {
  const seconds = Math.floor(clampTime(value));
  return `14:${(3 + Math.floor(seconds / 60)).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
