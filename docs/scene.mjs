import { CHAPTERS, DURATION, PLAN_NAMES, ROLLOUT_START, chapterAt, clampTime, readSceneUrl, replayDay, sceneUrl, timecode, wallClock } from "./replay.mjs";

const byId = id => document.getElementById(id);
const stage = byId("stage");
const startButton = byId("start");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
const slotTest = "https://github.com/npapaHAHA/SlotGuard/blob/abea429a986803f5118d31179357d0d6815ab797/tests/SlotGuard.Tests/BookingTests.cs#L14-L42";
const scheduler = "https://github.com/npapaHAHA/edge-rollout-lab/blob/608ba70e6842fe61f9691ac32889afba7475c9bb/edge_rollout/scheduler.py";
const benchmark = "https://github.com/npapaHAHA/edge-rollout-lab/blob/608ba70e6842fe61f9691ac32889afba7475c9bb/reports/benchmark.json";

const positions = {
  harbor: { name: "Порт", x: 22, y: 55 },
  ridge: { name: "Гребень", x: 84, y: 27 },
  terminal: { name: "Терминал", x: 81, y: 70 },
  plant: { name: "Энергоблок", x: 61, y: 47 },
  remote: { name: "Релейная", x: 24, y: 31 },
};

const state = {
  ...readSceneUrl(window.location.href),
  entered: false,
  playing: false,
};

let data;
let frameId;
let lastFrame;
let lastDraw = -1;
let returnFocus;
let inspectedSite;
const feeds = {};
const chapterButtons = new Map();

function addChapters() {
  for (const chapter of CHAPTERS) {
    const button = document.createElement("button");
    const stamp = document.createElement("code");
    stamp.textContent = timecode(chapter.at);
    button.type = "button";
    button.className = "chapter";
    button.append(stamp, document.createTextNode(chapter.label));
    button.addEventListener("click", () => {
      if (chapter.id === "result") state.compare = true;
      seek(chapter.id === "result" ? DURATION : chapter.at);
      if (chapter.id === "brief") {
        closeInspector(false);
      } else {
        showInspector(chapter.id, button);
      }
    });
    chapterButtons.set(chapter.id, button);
    byId("chapters").append(button);
  }
}

function makeFeed(id) {
  const element = byId(`feed-${id}`);
  const markerSurface = element.querySelector("[data-markers]");
  const marks = data.sites.map((site, index) => {
    const position = positions[site.id];
    const button = document.createElement("button");
    const count = document.createElement("span");
    count.className = "marker-count";
    button.type = "button";
    button.className = "marker";
    button.style.setProperty("--px", `${position.x}%`);
    button.style.setProperty("--py", `${position.y}%`);
    button.append(document.createTextNode(position.name), count);
    button.addEventListener("click", () => {
      inspectedSite = { id, index };
      showInspector("site", button);
    });
    markerSurface.append(button);
    return { button, count, name: position.name, site };
  });
  return {
    element, marks, markerSurface,
    label: element.querySelector("[data-feed-label]"),
    readout: element.querySelector("[data-feed-data]"),
    devices: element.querySelector("[data-devices]"),
    traffic: element.querySelector("[data-traffic]"),
    utility: element.querySelector("[data-utility]"),
  };
}

function getFrames() {
  const day = replayDay(state.time, data.dayCount);
  const plans = data.plans[state.budget];
  return { day, a: plans.fifo[day], b: plans[state.plan][day] };
}

function drawFeed(feed, snapshot) {
  feed.devices.textContent = snapshot.devices;
  feed.traffic.textContent = number.format(snapshot.traffic);
  feed.utility.textContent = number.format(snapshot.utility);
  for (const [index, mark] of feed.marks.entries()) {
    const installed = snapshot.sites[index];
    mark.count.textContent = `${installed}/${mark.site.devices}`;
    mark.button.dataset.state = installed === mark.site.devices ? "done" : installed ? "active" : "waiting";
    mark.button.setAttribute("aria-label", `${mark.name}. Модель получили ${installed} из ${mark.site.devices} устройств`);
  }
}

function render() {
  if (!state.entered) return;
  const chapter = chapterAt(state.time);
  const rollout = state.time >= ROLLOUT_START;
  const split = rollout && state.compare;
  const { day, a, b } = getFrames();

  stage.dataset.phase = chapter.id;
  stage.classList.toggle("is-split", split);
  stage.style.setProperty("--camera", chapter.id === "booking" ? "1.19" : "1");
  feeds.a.markerSurface.hidden = !rollout;
  feeds.a.readout.hidden = !rollout;
  feeds.a.label.hidden = !split;
  feeds.b.element.hidden = !split;
  byId("booking-stream").hidden = chapter.id !== "booking";
  if (chapter.id === "booking") {
    byId("request-a").textContent = state.time < 14 ? "Отправка" : "HTTP 201";
    byId("request-b").textContent = state.time < 14 ? "Отправка" : "HTTP 409";
  }
  byId("plan-controls").hidden = !rollout;
  byId("variant-name").textContent = PLAN_NAMES[state.plan];
  byId("compare").setAttribute("aria-pressed", String(state.compare));
  byId("compare").textContent = state.compare ? "Только FIFO" : "Сравнить планы";

  byId("scene-time").textContent = wallClock(state.time);
  byId("transport-time").textContent = `${timecode(state.time)} / 01:00`;
  const timeline = byId("timeline");
  timeline.value = state.time.toFixed(1);
  timeline.setAttribute("aria-valuetext", `${Math.floor(state.time)} секунд из ${DURATION}`);

  if (byId("chapter-title").textContent !== chapter.title) {
    byId("chapter-title").textContent = chapter.title;
    byId("chapter-caption").textContent = chapter.caption;
    for (const [id, button] of chapterButtons) {
      if (id === chapter.id) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    }
  } else if (!chapterButtons.get(chapter.id).hasAttribute("aria-current")) {
    chapterButtons.get(chapter.id).setAttribute("aria-current", "step");
  }

  if (rollout) {
    drawFeed(feeds.a, a);
    if (split) drawFeed(feeds.b, b);
    const result = split && a.utility > 0 ? ` · ${percent.format(b.utility / a.utility - 1)}` : "";
    byId("simulation-day").textContent = `День ${day} / ${data.dayCount}${result}`;
  }
}

function setPlaying(playing) {
  state.playing = playing;
  cancelAnimationFrame(frameId);
  lastFrame = undefined;
  const playButton = byId("play");
  const label = playing ? "Пауза" : state.time === DURATION ? "Повторить" : "Продолжить";
  playButton.dataset.state = playing ? "playing" : "paused";
  playButton.setAttribute("aria-label", label);
  byId("play-label").textContent = label;
  if (playing) frameId = requestAnimationFrame(tick);
}

function tick(timestamp) {
  lastFrame ??= timestamp;
  state.time = clampTime(state.time + (timestamp - lastFrame) / 1000);
  lastFrame = timestamp;
  const tenth = Math.floor(state.time * 10);
  if (tenth !== lastDraw) {
    lastDraw = tenth;
    render();
  }
  if (state.time === DURATION) setPlaying(false);
  else frameId = requestAnimationFrame(tick);
}

function seek(time) {
  state.time = clampTime(time);
  setPlaying(false);
  render();
}

function asTrace(kind) {
  if (kind === "booking") return {
    project: "SlotGuard / ASP.NET Core + PostgreSQL",
    title: "Одна бронь из двадцати запросов",
    description: "В сцене видны два оператора. Интеграционный тест отправляет 20 запросов и проверяет, что в базе появилась одна активная бронь. Ограничение в PostgreSQL запрещает пересекающиеся брони одного ресурса.",
    source: slotTest,
    lines: [
      ["Запрос A", "Свободный слот забронирован", "HTTP 201"],
      ["Запрос B", "Слот уже занят", "HTTP 409", "conflict"],
      ["Ещё 18", "Конфликт по тому же интервалу", "HTTP 409", "conflict"],
      ["PostgreSQL", "Активная бронь на этот слот", "1 запись"],
    ],
  };

  const { day, a, b } = getFrames();
  if (kind === "site" && inspectedSite) {
    const { id, index } = inspectedSite;
    const site = data.sites[index];
    const frame = id === "a" ? a : b;
    const installed = frame.sites[index];
    return {
      project: "Edge Rollout Lab / Синтетический парк",
      title: positions[site.id].name,
      description: `День ${day} из ${data.dayCount}. Лимит площадки и общий лимит сети действуют одновременно. Счётчик показывает устройства, которые получили хотя бы одну версию модели.`,
      source: `${scheduler}#L67-L112`,
      lines: [
        ["Модель", "Устройства с установленной моделью", `${installed} / ${site.devices}`],
        ["Площадка", "Дневной лимит", `${site.limit} МБ`],
        ["Сеть", "Общий лимит всех площадок", `${state.budget} МБ`],
      ],
    };
  }

  if (kind === "result") return {
    project: `Edge Rollout Lab / Seed ${data.seed}`,
    title: "Что изменил выбор планировщика",
    description: "Полезность накапливается по дням. Для каждого устройства учитываются приоритет и точность установленной модели на отложенных данных. Оба плана используют один парк и один сетевой лимит.",
    source: `${scheduler}#L67-L117`,
    lines: [
      ["FIFO", "Накопленная полезность", number.format(a.utility)],
      [PLAN_NAMES[state.plan], "Накопленная полезность", number.format(b.utility)],
      ["Трафик", "FIFO и выбранный план", `${number.format(a.traffic)} / ${number.format(b.traffic)} МБ`],
      ["Разница", "Полезность выбранного плана к FIFO", a.utility > 0 ? percent.format(b.utility / a.utility - 1) : "0%"],
    ],
  };

  return {
    project: "Edge Rollout Lab / Планировщик",
    title: kind === "brief" ? "Парк в начале прогона" : "Как планируется раскатка",
    description: "FIFO ставит доступные обновления в порядке очереди. Другие стратегии оценивают, сколько пользы принесёт обновление конкретному устройству. Версия с учётом канала перебирает разные веса размера пакета.",
    source: kind === "brief" ? benchmark : `${scheduler}#L216-L232`,
    lines: [
      ["Парк", "Устройства на пяти площадках", String(data.deviceCount)],
      ["Модели", "Версии выходят в разные дни", "3 версии"],
      ["Канал", "Лимит для обеих версий событий", `${state.budget} МБ/день`],
    ],
  };
}

function refreshInspector() {
  if (!state.inspection) return;
  const view = asTrace(state.inspection);
  byId("inspector-project").textContent = view.project;
  byId("inspector-title").textContent = view.title;
  byId("inspector-description").textContent = view.description;
  byId("inspector-source").href = view.source;
  byId("trace").replaceChildren(...view.lines.map(([label, text, detail, tone]) => {
    const row = document.createElement("div");
    const key = document.createElement("code");
    const description = document.createElement("span");
    const value = document.createElement("strong");
    row.className = "trace-line";
    row.setAttribute("role", "listitem");
    if (tone) row.dataset.tone = tone;
    key.textContent = label;
    description.textContent = text;
    value.textContent = detail;
    row.append(key, description, value);
    return row;
  }));
}

function showInspector(kind, trigger, scroll = true) {
  setPlaying(false);
  state.inspection = kind;
  returnFocus = trigger;
  refreshInspector();
  const inspector = byId("inspector");
  inspector.hidden = false;
  if (scroll) {
    inspector.scrollIntoView({ block: "nearest", behavior: motion.matches ? "instant" : "smooth" });
    byId("inspector-source").focus({ preventScroll: true });
  }
}

function closeInspector(restoreFocus = true) {
  state.inspection = null;
  byId("inspector").hidden = true;
  if (restoreFocus) returnFocus?.focus({ preventScroll: true });
}

async function enter(autoplay) {
  if (state.entered || startButton.disabled) return;
  startButton.disabled = true;
  byId("load-error").hidden = true;
  try {
    const response = await fetch("./data/replays.json");
    if (!response.ok) throw new Error(`Replay data returned ${response.status}`);
    data = await response.json();
    feeds.a = makeFeed("a");
    feeds.b = makeFeed("b");
  } catch {
    startButton.disabled = false;
    byId("load-error").textContent = "Не загрузились данные прогона. Попробуйте войти ещё раз.";
    byId("load-error").hidden = false;
    return;
  }
  state.entered = true;
  byId("opening").hidden = true;
  byId("scene-caption").hidden = false;
  byId("console").hidden = false;
  byId("plan").value = state.plan;
  byId("budget").value = String(state.budget);
  render();
  setPlaying(autoplay && !motion.matches);
  if (autoplay) byId("play").focus({ preventScroll: true });
  if (state.inspection) showInspector(state.inspection, null, false);
}

async function copyScene() {
  const url = sceneUrl(window.location.href, state);
  const field = byId("share-url");
  const feedback = byId("share-result");
  feedback.hidden = false;
  try {
    await navigator.clipboard.writeText(url);
    field.hidden = true;
    feedback.textContent = "Ссылка на текущий момент скопирована.";
  } catch {
    field.value = url;
    field.hidden = false;
    field.focus();
    field.select();
    feedback.textContent = "Ссылка на текущий момент выделена для копирования.";
  }
}

addChapters();
startButton.addEventListener("click", () => enter(true));
byId("play").addEventListener("click", () => {
  if (state.time === DURATION) seek(0);
  if (!state.playing && state.inspection) closeInspector(false);
  setPlaying(!state.playing);
});
byId("timeline").addEventListener("input", event => {
  closeInspector(false);
  seek(Number(event.currentTarget.value));
});
byId("booking-hotspot").addEventListener("click", event => showInspector("booking", event.currentTarget));
byId("close-inspector").addEventListener("click", () => closeInspector());
byId("share").addEventListener("click", copyScene);
byId("compare").addEventListener("click", () => {
  state.compare = !state.compare;
  render();
});
byId("plan").addEventListener("change", event => {
  state.plan = event.currentTarget.value;
  state.compare = true;
  render();
  refreshInspector();
});
byId("budget").addEventListener("change", event => {
  state.budget = Number(event.currentTarget.value);
  state.compare = true;
  render();
  refreshInspector();
});

if (state.resume) enter(false);
