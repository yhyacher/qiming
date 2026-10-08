/* ================== 学霸养成 · 公共脚本 ================== */

/* ---------- 存储 ---------- */
const store = {
  get(key, def) {
    try { return JSON.parse(localStorage.getItem("xh_" + key)) ?? def; }
    catch { return def; }
  },
  set(key, val) { localStorage.setItem("xh_" + key, JSON.stringify(val)); }
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const $ = id => document.getElementById(id);

/* ---------- 深浅色主题（默认浅色，localStorage 记忆） ---------- */
(function initTheme() {
  const root = document.documentElement;
  const btn = $("themeToggle");
  function apply(t) {
    root.dataset.theme = t;
    if (btn) btn.textContent = t === "dark" ? "☀" : "☾";
  }
  apply(store.get("theme", "light"));
  if (btn) btn.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    store.set("theme", next); apply(next);
  });
})();

/* ---------- 滚动显现 ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

/* ---------- 统计（首页 / 修炼场） ---------- */
function renderStats() {
  const t = todayStr();
  const tomatoesToday = store.get("tomato_" + t, 0);
  if ($("pomoToday")) $("pomoToday").textContent = tomatoesToday;
  if ($("pomoTotal")) $("pomoTotal").textContent = store.get("tomato_total", 0);
  if ($("stat-tomatoes")) $("stat-tomatoes").textContent = tomatoesToday;
  const first = store.get("first_day", t);
  if (first === t) store.set("first_day", t);
  const days = Math.floor((new Date(t) - new Date(first)) / 86400000) + 1;
  if ($("stat-days")) $("stat-days").innerHTML = "<small>第</small> " + days + " <small>天</small>";
  let streak = 0; const d = new Date();
  while (store.get("habit_" + d.toISOString().slice(0, 10), false)) { streak++; d.setDate(d.getDate() - 1); }
  if ($("stat-streak")) $("stat-streak").innerHTML = streak + " <small>天</small>";
  if ($("habitStreak")) $("habitStreak").textContent = "🔥 连续 " + streak + " 天";
}

/* ---------- 番茄钟 ---------- */
const FOCUS = 25 * 60, BREAK = 5 * 60, LONG_BREAK = 15 * 60;
let pomoLeft = FOCUS, pomoTimer = null, pomoPhase = "focus", pomoCount = 0;

function renderPomo() {
  if (!$("pomoTime")) return;
  const m = String(Math.floor(pomoLeft / 60)).padStart(2, "0");
  const s = String(pomoLeft % 60).padStart(2, "0");
  $("pomoTime").textContent = m + ":" + s;
  $("pomoMode").textContent = pomoPhase === "focus" ? "专注时间" : "休息时间";
  $("pomoClock").classList.toggle("running", !!pomoTimer);
  $("pomoStart").textContent = pomoTimer ? "暂停" : "开始";
}
function tick() {
  pomoLeft--;
  if (pomoLeft <= 0) {
    clearInterval(pomoTimer); pomoTimer = null;
    if (pomoPhase === "focus") {
      pomoCount++;
      if (pomoCount % 4 === 0) { pomoPhase = "long"; pomoLeft = LONG_BREAK; }
      else { pomoPhase = "break"; pomoLeft = BREAK; }
      const t = todayStr();
      store.set("tomato_" + t, store.get("tomato_" + t, 0) + 1);
      store.set("tomato_total", store.get("tomato_total", 0) + 1);
      beep();
    } else {
      pomoPhase = "focus"; pomoLeft = FOCUS; beep();
    }
  }
  renderPomo(); renderStats();
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    o.start(); o.stop(ctx.currentTime + 0.8);
  } catch {}
}
if ($("pomoStart")) {
  $("pomoStart").addEventListener("click", () => {
    if (pomoTimer) { clearInterval(pomoTimer); pomoTimer = null; }
    else pomoTimer = setInterval(tick, 1000);
    renderPomo();
  });
  $("pomoReset").addEventListener("click", () => {
    clearInterval(pomoTimer); pomoTimer = null;
    pomoPhase = "focus"; pomoLeft = FOCUS; renderPomo();
  });
  renderPomo();
}

/* ---------- 任务清单 ---------- */
function renderTodo() {
  if (!$("todoList")) return;
  const todos = store.get("todos", []);
  const list = $("todoList");
  list.innerHTML = "";
  if (!todos.length) {
    list.innerHTML = '<li class="todo-empty">清单空空如也，写下第一件事吧。</li>';
  } else {
    todos.forEach((item, i) => {
      const li = document.createElement("li");
      li.className = "todo-item" + (item.done ? " done" : "");
      li.innerHTML = '<div class="check">✓</div><span class="text"></span><button class="del">×</button>';
      li.querySelector(".text").textContent = item.text;
      li.querySelector(".check").addEventListener("click", () => {
        todos[i].done = !todos[i].done; store.set("todos", todos); renderTodo();
      });
      li.querySelector(".del").addEventListener("click", () => {
        todos.splice(i, 1); store.set("todos", todos); renderTodo();
      });
      list.appendChild(li);
    });
  }
  const done = todos.filter(t => t.done).length;
  $("todoCount").textContent = "今日 " + todos.length + " 项 · 已完成 " + done + " 项";
}
if ($("todoAdd")) {
  const addTodo = () => {
    const input = $("todoInput");
    const text = input.value.trim();
    if (!text) return;
    const todos = store.get("todos", []);
    todos.push({ text, done: false });
    store.set("todos", todos);
    input.value = ""; renderTodo();
  };
  $("todoAdd").addEventListener("click", addTodo);
  $("todoInput").addEventListener("keydown", e => { if (e.key === "Enter") addTodo(); });
  $("todoClear").addEventListener("click", () => {
    store.set("todos", store.get("todos", []).filter(t => !t.done));
    renderTodo();
  });
  renderTodo();
}

/* ---------- 习惯打卡 ---------- */
const WEEK_CN = ["日", "一", "二", "三", "四", "五", "六"];
function renderHabit() {
  if (!$("habitGrid")) return;
  const grid = $("habitGrid");
  grid.innerHTML = "";
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const key = "habit_" + d.toISOString().slice(0, 10);
    const on = store.get(key, false);
    const future = d > now;
    const isToday = d.toDateString() === now.toDateString();
    const cell = document.createElement("div");
    cell.className = "habit-day" + (on ? " on" : "") + (future ? " future" : "");
    cell.innerHTML = '<span class="d-label">周' + WEEK_CN[d.getDay()] + (isToday ? " ·今" : "") + '</span><span class="d-num">' + d.getDate() + '</span>';
    if (!future) {
      cell.addEventListener("click", () => {
        store.set(key, !store.get(key, false));
        renderHabit(); renderStats();
      });
    }
    grid.appendChild(cell);
  }
}
if ($("habitGrid")) renderHabit();

/* ---------- 工具 Tab（修炼场） ---------- */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tool-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    const panel = document.getElementById("panel-" + tab.dataset.panel);
    if (panel) panel.classList.add("active");
  });
});

/* ---------- 初始化统计 ---------- */
renderStats();
