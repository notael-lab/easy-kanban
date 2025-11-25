// =========================
// Configurazione
// =========================
const PROJECTS_KEY = "kanbanProjects_v1";
const COMPACT_VIEW_KEY = "kanbanCompactView_v1";

let projects = {};          // { id: { id, name, tasks, columnState, milestones, roadmapScale } }
let currentProjectId = null;

let tasks = [];             // task del progetto corrente
let columnState = {};       // stato colonne del progetto corrente
let milestones = [];        // milestone del progetto corrente
let roadmapScale = "months";

let draggedTaskId = null;
let editingTaskId = null;
let searchTerm = "";
let compactView = false;

// =========================
// Utility dati progetti
// =========================
function getDefaultColumnState() {
  // di default solo "Completato" collassata
  return {
    todo: false,
    inprogress: false,
    pending: false,
    done: true,
  };
}

function getSampleTasks() {
  const today = new Date();
  const addDays = (d) => {
    const n = new Date(today);
    n.setDate(n.getDate() + d);
    return n.toISOString().slice(0, 10);
  };

  return [
    {
      id: "1",
      title: "Impostare repository su GitHub",
      description: "Creare repo, abilitare GitHub Pages (branch main).",
      status: "done",
      dueDate: addDays(-1),
    },
    {
      id: "2",
      title: "Definire colonne Kanban",
      description: "Da fare / In corso / Pending / Completato",
      status: "inprogress",
      dueDate: addDays(1),
    },
    {
      id: "3",
      title: "Gestire attività bloccate",
      description: "Usare la colonna Pending per le attività bloccate.",
      status: "pending",
      dueDate: addDays(2),
    },
    {
      id: "4",
      title: "Rifinire stile Office 365",
      description: "Colori, font, spacing coerenti.",
      status: "todo",
      dueDate: addDays(3),
    },
  ];
}

function getDefaultMilestones() {
  const today = new Date();
  const addDays = (d) => {
    const n = new Date(today);
    n.setDate(n.getDate() + d);
    return n.toISOString().slice(0, 10);
  };

  return [
    {
      id: "m1",
      title: "Kickoff progetto",
      description: "Allineamento iniziale",
      date: addDays(-3),
    },
    {
      id: "m2",
      title: "MVP pronto",
      description: "Prima demo funzionante",
      date: addDays(5),
    },
  ];
}

function ensureColumnStateDefaults(obj) {
  if (!obj || typeof obj !== "object") obj = {};
  ["todo", "inprogress", "pending", "done"].forEach((s) => {
    if (typeof obj[s] === "undefined") {
      obj[s] = s === "done"; // solo done collassata
    }
  });
  return obj;
}

function normalizeProject(p, isDefault = false) {
  if (!p) p = {};
  if (!Array.isArray(p.tasks)) p.tasks = [];
  p.columnState = ensureColumnStateDefaults(p.columnState);
  if (!Array.isArray(p.milestones)) {
    p.milestones = isDefault ? getDefaultMilestones() : [];
  }
  if (!p.roadmapScale) p.roadmapScale = "months";
  return p;
}

// Carica TUTTO (progetti + progetto corrente) da localStorage
function loadData() {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.projects && Object.keys(parsed.projects).length > 0) {
        projects = parsed.projects;

        // normalizza tutti i progetti
        Object.keys(projects).forEach((id) => {
          projects[id] = normalizeProject(projects[id]);
          projects[id].id = id;
        });

        currentProjectId =
          parsed.currentProjectId || Object.keys(projects)[0];

        const current = projects[currentProjectId];
        tasks = Array.isArray(current.tasks) ? current.tasks : [];
        columnState = ensureColumnStateDefaults(current.columnState);
        milestones = Array.isArray(current.milestones)
          ? current.milestones
          : [];
        roadmapScale = current.roadmapScale || "months";
        return;
      }
    }
  } catch (e) {
    console.warn("Impossibile caricare dati progetti", e);
  }

  // Fallback: un progetto demo di default
  const defaultProject = normalizeProject(
    {
      id: "default",
      name: "Progetto demo",
      tasks: getSampleTasks(),
      columnState: getDefaultColumnState(),
      milestones: getDefaultMilestones(),
      roadmapScale: "months",
    },
    true
  );

  projects = { [defaultProject.id]: defaultProject };
  currentProjectId = defaultProject.id;
  tasks = defaultProject.tasks;
  columnState = defaultProject.columnState;
  milestones = defaultProject.milestones;
  roadmapScale = defaultProject.roadmapScale;

  saveData();
}

// Salva TUTTO (progetti + stato corrente) su localStorage
function saveData() {
  if (!currentProjectId) {
    currentProjectId = Object.keys(projects)[0] || "default";
  }
  if (!projects[currentProjectId]) {
    projects[currentProjectId] = normalizeProject(
      {
        id: currentProjectId,
        name: "Progetto " + currentProjectId,
      },
      false
    );
  }

  projects[currentProjectId].tasks = tasks;
  projects[currentProjectId].columnState = ensureColumnStateDefaults(
    columnState
  );
  projects[currentProjectId].milestones = Array.isArray(milestones)
    ? milestones
    : [];
  projects[currentProjectId].roadmapScale = roadmapScale || "months";

  const payload = {
    projects,
    currentProjectId,
  };

  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("Impossibile salvare dati progetti", e);
  }
}

function saveTasks() {
  saveData();
}

function saveColumnState() {
  saveData();
}

// =========================
// Vista compatta (UI prefs)
// =========================
function loadCompactViewPreference() {
  try {
    const v = localStorage.getItem(COMPACT_VIEW_KEY);
    compactView = v === "1";
  } catch (e) {
    compactView = false;
  }
}

function saveCompactViewPreference() {
  try {
    localStorage.setItem(COMPACT_VIEW_KEY, compactView ? "1" : "0");
  } catch (e) {}
}

function applyCompactView() {
  if (compactView) {
    document.body.classList.add("compact-view");
  } else {
    document.body.classList.remove("compact-view");
  }

  const toggle = document.getElementById("compactToggle");
  if (toggle) {
    toggle.checked = compactView;
  }
}

function setupCompactToggle() {
  const toggle = document.getElementById("compactToggle");
  if (!toggle) return;

  toggle.checked = compactView;
  toggle.addEventListener("change", () => {
    compactView = toggle.checked;
    applyCompactView();
    saveCompactViewPreference();
  });
}

// =========================
// Utility varie
// =========================
function formatDate(dateStr) {
  if (!dateStr) return "Nessuna data";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function groupByDate(arr) {
  const map = new Map();
  arr.forEach((t) => {
    const key = t.dueDate || "no-date";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  });
  return map;
}

function isValidDateString(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !Number.isNaN(d.getTime());
}

function statusLabel(status) {
  switch (status) {
    case "todo":
      return "Da fare";
    case "inprogress":
      return "In corso";
    case "pending":
      return "Pending";
    case "done":
      return "Completato";
    default:
      return status;
  }
}

function matchesSearch(task) {
  if (!searchTerm) return true;
  const haystack = (
    (task.title || "") +
    " " +
    (task.description || "") +
    " " +
    statusLabel(task.status)
  ).toLowerCase();
  return haystack.includes(searchTerm);
}

// helper date
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=dom, 1=lun...
  const diff = (day + 6) % 7; // distanza dal lunedì
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date) {
  const s = startOfWeek(date);
  s.setDate(s.getDate() + 6);
  s.setHours(23, 59, 59, 999);
  return s;
}

function startOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfQuarter(date) {
  const d = new Date(date);
  const quarterIndex = Math.floor(d.getMonth() / 3); // 0..3
  return new Date(d.getFullYear(), quarterIndex * 3, 1);
}

function endOfQuarter(date) {
  const d = new Date(date);
  const quarterIndex = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), quarterIndex * 3 + 3, 0, 23, 59, 59, 999);
}

function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Giovedì della settimana determina l'anno ISO
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diff = (d - yearStart) / 86400000 + 1; // giorni dall'inizio dell'anno
  return Math.ceil(diff / 7);
}


// =========================
// Modalità modifica task
// =========================
function enterEditMode(task) {
  editingTaskId = task.id;

  const formTitle = document.getElementById("formTitle");
  const submitBtn = document.getElementById("taskSubmitButton");
  const cancelBtn = document.getElementById("taskCancelEdit");

  const idField = document.getElementById("taskId");
  const titleInput = document.getElementById("taskTitle");
  const descInput = document.getElementById("taskDescription");
  const dateInput = document.getElementById("taskDueDate");
  const statusSelect = document.getElementById("taskStatus");

  idField.value = task.id;
  titleInput.value = task.title;
  descInput.value = task.description || "";
  dateInput.value = task.dueDate || "";
  statusSelect.value = task.status;

  formTitle.textContent = "Modifica attività";
  submitBtn.textContent = "Salva modifiche";
  cancelBtn.classList.remove("hidden");
}

function exitEditMode() {
  editingTaskId = null;

  const form = document.getElementById("taskForm");
  const formTitle = document.getElementById("formTitle");
  const submitBtn = document.getElementById("taskSubmitButton");
  const cancelBtn = document.getElementById("taskCancelEdit");
  const idField = document.getElementById("taskId");

  form.reset();
  idField.value = "";
  document.getElementById("taskStatus").value = "todo";

  formTitle.textContent = "Nuova attività";
  submitBtn.textContent = "Aggiungi attività";
  cancelBtn.classList.add("hidden");
}

// =========================
// Rendering Kanban
// =========================
function renderKanban() {
  const containers = document.querySelectorAll(".kanban-items");
  containers.forEach((c) => {
    c.innerHTML = "";
    c.classList.add("empty");
  });

  const counts = {
    todo: 0,
    inprogress: 0,
    pending: 0,
    done: 0,
  };

  const visibleTasks = tasks.filter(matchesSearch);

  visibleTasks.forEach((task) => {
    const container = document.querySelector(
      `.kanban-items[data-status="${task.status}"]`
    );
    if (!container) return;
    if (counts[task.status] === undefined) counts[task.status] = 0;
    counts[task.status] += 1;
    container.classList.remove("empty");
    container.appendChild(createKanbanCard(task));
  });

  Object.keys(counts).forEach((status) => {
    const el = document.querySelector(`[data-count="${status}"]`);
    if (el) el.textContent = counts[status] ?? 0;
  });
}

function createKanbanCard(task) {
  const card = document.createElement("article");
  card.className = "card";
  card.draggable = true;
  card.dataset.id = task.id;

  // Header: titolo + pulsante elimina
  const header = document.createElement("div");
  header.className = "card-header";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = task.title;

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "icon-button icon-button-danger";
  deleteBtn.title = "Elimina attività";
  deleteBtn.textContent = "x";

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const id = task.id;
    const wasEditing = editingTaskId === id;

    if (!confirm(`Vuoi davvero eliminare l'attività:\n"${task.title}"?`)) {
      return;
    }

    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    if (wasEditing) {
      exitEditMode();
    }
    renderKanban();
    renderTimeline();
  });

  header.appendChild(title);
  header.appendChild(deleteBtn);

  // Descrizione
  const description = document.createElement("p");
  description.className = "card-description";
  description.textContent = task.description || "Nessuna descrizione.";

  // Metadati: data + stato
  const meta = document.createElement("div");
  meta.className = "card-meta";

  const date = document.createElement("span");
  date.textContent = formatDate(task.dueDate);

  const badge = document.createElement("span");
  badge.className = "card-badge";
  badge.textContent = statusLabel(task.status);

  meta.appendChild(date);
  meta.appendChild(badge);

  card.appendChild(header);
  card.appendChild(description);
  card.appendChild(meta);

  // Drag & drop handlers
  card.addEventListener("dragstart", (e) => {
    draggedTaskId = task.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  });

  card.addEventListener("dragend", () => {
    draggedTaskId = null;
  });

  // Doppio click per modificare
  card.addEventListener("dblclick", () => {
    enterEditMode(task);
  });

  return card;
}

function setupKanbanDropzones() {
  const columns = document.querySelectorAll(".kanban-column");

  columns.forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      col.classList.add("drop-target");
    });

    col.addEventListener("dragleave", () => {
      col.classList.remove("drop-target");
    });

    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("drop-target");

      const status = col.dataset.status;
      const id =
        e.dataTransfer.getData("text/plain") || draggedTaskId;

      if (!id || !status) return;

      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) return;

      tasks[idx].status = status;
      saveTasks();
      renderKanban();
      renderTimeline();
    });
  });
}

// =========================
// Colonne collassabili (per progetto)
// =========================
function refreshColumnCollapseUI() {
  const columns = document.querySelectorAll(".kanban-column");

  columnState = ensureColumnStateDefaults(columnState);

  columns.forEach((col) => {
    const toggle = col.querySelector(".column-toggle");
    if (!toggle) return;
    const status = col.dataset.status;
    if (!status) return;

    const collapsed = !!columnState[status];
    col.classList.toggle("collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute(
      "title",
      collapsed ? "Espandi colonna" : "Collassa colonna"
    );
    toggle.textContent = collapsed ? "⯈" : "⯇";
  });
}

function setupColumnCollapse() {
  const columns = document.querySelectorAll(".kanban-column");

  columns.forEach((col) => {
    const toggle = col.querySelector(".column-toggle");
    if (!toggle) return;
    const status = col.dataset.status;
    if (!status) return;

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      columnState = ensureColumnStateDefaults(columnState);
      columnState[status] = !columnState[status];
      saveColumnState();
      refreshColumnCollapseUI();
    });
  });

  refreshColumnCollapseUI();
}

// =========================
// Rendering Timeline (task)
// =========================
function renderTimeline() {
  const container = document.getElementById("timelineContainer");
  container.innerHTML = "";

  const visibleTasks = tasks.filter(matchesSearch);
  const withValidDate = visibleTasks.filter((t) => isValidDateString(t.dueDate));

  if (!withValidDate.length) {
    const p = document.createElement("p");
    p.className = "empty-message";
    p.textContent =
      "Nessuna attività con data di scadenza valida da mostrare in timeline.";
    container.appendChild(p);
    return;
  }

  withValidDate.sort((a, b) => {
    const da = new Date(a.dueDate);
    const db = new Date(b.dueDate);
    return da - db;
  });

  const grouped = groupByDate(withValidDate);

  Array.from(grouped.entries())
    .sort(([d1], [d2]) => new Date(d1) - new Date(d2))
    .forEach(([date, items]) => {
      const group = document.createElement("div");
      group.className = "timeline-group";

      const dot = document.createElement("div");
      dot.className = "timeline-dot";

      const dateLabel = document.createElement("div");
      dateLabel.className = "timeline-date";
      dateLabel.textContent = formatDate(date);

      const itemsContainer = document.createElement("div");
      itemsContainer.className = "timeline-items";

      items.forEach((task) => {
        itemsContainer.appendChild(createTimelineCard(task));
      });

      group.appendChild(dot);
      group.appendChild(dateLabel);
      group.appendChild(itemsContainer);
      container.appendChild(group);
    });
}

function createTimelineCard(task) {
  const card = document.createElement("div");
  card.className = "timeline-card";

  const title = document.createElement("div");
  title.className = "timeline-card-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "timeline-card-meta";

  const status = document.createElement("span");
  status.textContent = statusLabel(task.status);

  const descShort = document.createElement("span");
  descShort.textContent = task.description
    ? task.description.slice(0, 40) + (task.description.length > 40 ? "…" : "")
    : "";

  meta.appendChild(status);
  meta.appendChild(descShort);

  card.appendChild(title);
  card.appendChild(meta);

  return card;
}

// =========================
// Roadmap (Milestone orizzontali)
// =========================
function getValidMilestones() {
  return (milestones || []).filter((m) => isValidDateString(m.date));
}

function createMilestoneChip(m) {
  const chip = document.createElement("div");
  chip.className = "roadmap-milestone";
  chip.dataset.id = m.id;

  // Icona segnalibro (niente testo visibile)
  const iconSpan = document.createElement("span");
  iconSpan.className = "roadmap-milestone-icon";
  iconSpan.textContent = "▲";
  iconSpan.setAttribute("aria-hidden", "true");

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "icon-button icon-button-danger roadmap-milestone-delete";
  delBtn.textContent = "x";
  delBtn.title = "Elimina milestone";

  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!confirm(`Vuoi davvero eliminare la milestone:\n"${m.title}"?`)) {
      return;
    }
    milestones = milestones.filter((x) => x.id !== m.id);
    saveData();
    renderRoadmap();
  });

  chip.appendChild(iconSpan);
  chip.appendChild(delBtn);

  // tooltip con tutte le info
  chip.title = `${m.title} – ${formatDate(m.date)}${
    m.description ? "\n" + m.description : ""
  }`;

  // doppio click per modificare
  chip.addEventListener("dblclick", () => {
    editMilestone(m.id);
  });

  return chip;
}

function editMilestone(id) {
  const m = milestones.find((x) => x.id === id);
  if (!m) return;

  const newTitle = prompt("Titolo milestone:", m.title);
  if (newTitle === null) return;
  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle) return;

  const newDate = prompt(
    "Data milestone (YYYY-MM-DD):",
    m.date || ""
  );
  if (newDate === null) return;
  const dateTrim = newDate.trim();
  if (!isValidDateString(dateTrim)) {
    alert("Data non valida. Formato atteso: YYYY-MM-DD.");
    return;
  }

  const newDesc = prompt(
    "Descrizione (opzionale):",
    m.description || ""
  );
  if (newDesc === null) return;

  m.title = trimmedTitle;
  m.date = dateTrim;
  m.description = newDesc.trim();

  saveData();
  renderRoadmap();
}

function renderRoadmap() {
  const container = document.getElementById("roadmapTimeline");
  const scaleSelect = document.getElementById("roadmapScale");
  if (!container) return;

  container.innerHTML = "";

  if (scaleSelect) {
    scaleSelect.value = roadmapScale;
  }

  const items = getValidMilestones();

  if (!items.length) {
    const p = document.createElement("p");
    p.className = "roadmap-empty";
    p.textContent =
      'Nessuna milestone definita. Usa "+ Milestone" per aggiungerne una.';
    container.appendChild(p);
    return;
  }

  // Ordina per data
  items.sort((a, b) => new Date(a.date) - new Date(b.date));

  let minDate = new Date(items[0].date);
  let maxDate = new Date(items[items.length - 1].date);

  // Piccolo margine
  minDate = addDays(minDate, -7);
  maxDate = addDays(maxDate, 7);

  const cells = [];

  if (roadmapScale === "weeks") {
    let currentStart = startOfWeek(minDate);
    const end = endOfWeek(maxDate);

    while (currentStart <= end) {
      const start = new Date(currentStart);
      const endWeek = endOfWeek(start);

      const weekNumber = getISOWeekNumber(start);
      const label = `W${weekNumber}`; // numero settimana reale

      cells.push({ start, end: endWeek, label, milestones: [] });

      currentStart = addDays(start, 7);
    }
  } else if (roadmapScale === "months") {
    let cursor = startOfMonth(minDate);
    const end = endOfMonth(maxDate);

    while (cursor <= end) {
      const start = new Date(cursor);
      const endMonth = endOfMonth(start);
      const label = start.toLocaleDateString("it-IT", {
        month: "short",
        year: "numeric",
      });
      cells.push({ start, end: endMonth, label, milestones: [] });
      cursor = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    }
  } else if (roadmapScale === "quarters") {
    let cursor = startOfQuarter(minDate);
    const end = endOfQuarter(maxDate);

    while (cursor <= end) {
      const start = new Date(cursor);
      const endQuarter = endOfQuarter(start);
      const quarterIndex = Math.floor(start.getMonth() / 3); // 0..3
      const q = quarterIndex + 1;
      const label = `Q${q} ${start.getFullYear()}`;
      cells.push({ start, end: endQuarter, label, milestones: [] });

      // passa al trimestre successivo
      cursor = new Date(start.getFullYear(), quarterIndex * 3 + 3, 1);
    }
  }

  // Assegna milestone alle celle
  items.forEach((m) => {
    const d = new Date(m.date);
    for (const cell of cells) {
      if (d >= cell.start && d <= cell.end) {
        cell.milestones.push(m);
        break;
      }
    }
  });

  const grid = document.createElement("div");
  grid.className = "roadmap-grid";

  const labelsRow = document.createElement("div");
  labelsRow.className = "roadmap-row roadmap-row-labels";

  const milestonesRow = document.createElement("div");
  milestonesRow.className = "roadmap-row roadmap-row-milestones";

  // Trova la cella corrispondente ad "oggi"
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayCellIndex = -1;

  cells.forEach((cell, index) => {
    const start = new Date(cell.start);
    const end = new Date(cell.end);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (today >= start && today <= end && todayCellIndex === -1) {
      todayCellIndex = index;
    }
  });

  cells.forEach((cell, index) => {
    const labelCell = document.createElement("div");
    labelCell.className = "roadmap-cell roadmap-cell-label";
    labelCell.textContent = cell.label;

    // Tooltip per la scala "weeks": mostra data di inizio settimana (DD-MM-YYYY)
    if (roadmapScale === "weeks" && cell.start instanceof Date) {
      const d = cell.start;
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      labelCell.title = `Inizio settimana: ${dd}-${mm}-${yyyy}`;
    }

    // Evidenzia la label della cella di oggi (opzionale, ma utile)
    if (index === todayCellIndex) {
      labelCell.classList.add("roadmap-cell-today");
    }

    labelsRow.appendChild(labelCell);

    const mCell = document.createElement("div");
    mCell.className = "roadmap-cell roadmap-cell-milestones";

    // Pallino rosso per "oggi"
    if (index === todayCellIndex) {
      const todayMarker = document.createElement("div");
      todayMarker.className = "roadmap-today-marker";
      todayMarker.title = "Oggi";
      mCell.appendChild(todayMarker);
    }

    cell.milestones.forEach((m) => {
      mCell.appendChild(createMilestoneChip(m));
    });

    milestonesRow.appendChild(mCell);
  });

  grid.appendChild(labelsRow);
  grid.appendChild(milestonesRow);
  container.appendChild(grid);

  // Scroll automatico per portare la cella di oggi in vista
  if (todayCellIndex >= 0) {
    const labelCell = labelsRow.children[todayCellIndex];
    if (labelCell) {
      const targetCenter =
        labelCell.offsetLeft +
        labelCell.offsetWidth / 2 -
        container.clientWidth / 2;
      container.scrollLeft = Math.max(0, targetCenter);
    }
  }
}


function setupRoadmapControls() {
  const scaleSelect = document.getElementById("roadmapScale");
  const addBtn = document.getElementById("addMilestoneButton");

  if (scaleSelect) {
    scaleSelect.value = roadmapScale;
    scaleSelect.addEventListener("change", () => {
      roadmapScale = scaleSelect.value || "months";
      saveData();
      renderRoadmap();
    });
  }

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const title = prompt("Titolo della milestone:");
      if (title === null) return;
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      const dateStr = prompt("Data della milestone (YYYY-MM-DD):");
      if (dateStr === null) return;
      const trimmedDate = dateStr.trim();
      if (!isValidDateString(trimmedDate)) {
        alert("Data non valida. Formato atteso: YYYY-MM-DD.");
        return;
      }

      const desc = prompt("Descrizione (opzionale):") || "";

      const newMilestone = {
        id: "m" + Date.now().toString(),
        title: trimmedTitle,
        description: desc.trim(),
        date: trimmedDate,
      };

      milestones.push(newMilestone);
      saveData();
      renderRoadmap();
    });
  }
}

// =========================
// Gestione form
// =========================
function setupForm() {
  const form = document.getElementById("taskForm");
  const titleInput = document.getElementById("taskTitle");
  const descInput = document.getElementById("taskDescription");
  const dateInput = document.getElementById("taskDueDate");
  const statusSelect = document.getElementById("taskStatus");
  const resetBtn = document.getElementById("resetBoard");
  const cancelEditBtn = document.getElementById("taskCancelEdit");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;

    const description = descInput.value.trim();
    const dueDate = dateInput.value || null;
    const status = statusSelect.value || "todo";

    if (editingTaskId) {
      const idx = tasks.findIndex((t) => t.id === editingTaskId);
      if (idx !== -1) {
        tasks[idx] = {
          ...tasks[idx],
          title,
          description,
          status,
          dueDate,
        };
      }
    } else {
      const newTask = {
        id: Date.now().toString(),
        title,
        description,
        status,
        dueDate,
      };
      tasks.push(newTask);
    }

    saveTasks();
    renderKanban();
    renderTimeline();
    exitEditMode();
  });

  cancelEditBtn.addEventListener("click", (e) => {
    e.preventDefault();
    exitEditMode();
  });

  resetBtn.addEventListener("click", () => {
    if (
      confirm(
        "Sei sicuro di voler ripristinare l'esempio iniziale? Questa operazione riguarda SOLO il progetto corrente e tutte le attività attuali verranno perse."
      )
    ) {
      tasks = getSampleTasks();
      columnState = getDefaultColumnState();
      milestones = getDefaultMilestones();
      roadmapScale = "months";
      saveData();
      renderKanban();
      renderTimeline();
      renderRoadmap();
      refreshColumnCollapseUI();
      exitEditMode();
    }
  });
}

// =========================
// Search bar
// =========================
function setupSearchBar() {
  const input = document.getElementById("taskSearch");
  if (!input) return;

  input.addEventListener("input", () => {
    searchTerm = input.value.trim().toLowerCase();
    renderKanban();
    renderTimeline();
  });
}

// =========================
// Switch vista Kanban / Timeline
// =========================
function setupViewSwitcher() {
  const buttons = document.querySelectorAll("[data-view-button]");

  const setActiveButton = (activeBtn) => {
    buttons.forEach((b) => {
      b.setAttribute("data-active", "false");
      b.classList.remove("btn-light");
      b.classList.remove("btn-ghost");
      b.classList.add("btn-ghost");
    });

    activeBtn.setAttribute("data-active", "true");
    activeBtn.classList.remove("btn-ghost");
    activeBtn.classList.add("btn-light");
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.targetView;
      if (!target) return;

      document
        .querySelectorAll(".view")
        .forEach((v) => v.classList.remove("view-active"));
      document.getElementById(target + "View").classList.add("view-active");

      setActiveButton(btn);
    });
  });

  const defaultBtn = document.querySelector(
    '[data-view-button][data-target-view="kanban"]'
  );
  if (defaultBtn) {
    setActiveButton(defaultBtn);
  }
}

// =========================
// Gestione progetti (select + aggiunta)
// =========================
function renderProjectSelect() {
  const select = document.getElementById("projectSelect");
  if (!select) return;

  select.innerHTML = "";

  const ids = Object.keys(projects);
  ids.forEach((id) => {
    const p = projects[id];
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = p.name || id;
    if (id === currentProjectId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function switchProject(newId) {
  if (!projects[newId]) return;

  // salva lo stato del progetto corrente
  saveData();

  currentProjectId = newId;

  const current = normalizeProject(projects[currentProjectId]);
  projects[currentProjectId] = current;

  tasks = Array.isArray(current.tasks) ? current.tasks : [];
  columnState = ensureColumnStateDefaults(current.columnState);
  milestones = Array.isArray(current.milestones) ? current.milestones : [];
  roadmapScale = current.roadmapScale || "months";

  editingTaskId = null;
  exitEditMode();

  searchTerm = "";
  const searchInput = document.getElementById("taskSearch");
  if (searchInput) searchInput.value = "";

  renderProjectSelect();
  renderKanban();
  renderTimeline();
  renderRoadmap();
  refreshColumnCollapseUI();
  saveData(); // per salvare eventuali default colState/milestones/roadmapScale
}

function setupProjectSelector() {
  const select = document.getElementById("projectSelect");
  const addBtn = document.getElementById("addProjectButton");
  if (!select) return;

  renderProjectSelect();

  select.addEventListener("change", () => {
    const newId = select.value;
    if (!newId || newId === currentProjectId) return;
    switchProject(newId);
  });

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const name = prompt("Nome del nuovo progetto:");
      if (!name) return;

      const trimmed = name.trim();
      if (!trimmed) return;

      let idBase = trimmed
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "");
      if (!idBase) {
        idBase = "progetto";
      }
      let id = idBase;
      let suffix = 1;
      while (projects[id]) {
        id = idBase + "-" + suffix++;
      }

      projects[id] = normalizeProject(
        {
          id,
          name: trimmed,
          tasks: [],
          columnState: getDefaultColumnState(),
          milestones: [],
          roadmapScale: "months",
        },
        false
      );

      currentProjectId = id;
      tasks = [];
      columnState = getDefaultColumnState();
      milestones = [];
      roadmapScale = "months";
      searchTerm = "";
      const searchInput = document.getElementById("taskSearch");
      if (searchInput) searchInput.value = "";

      saveData();
      renderProjectSelect();
      renderKanban();
      renderTimeline();
      renderRoadmap();
      refreshColumnCollapseUI();
      exitEditMode();
    });
  }
}

// =========================
// Rinomina / Elimina / Export / Import / Archivia progetto
// =========================
function renameCurrentProject() {
  if (!currentProjectId || !projects[currentProjectId]) return;
  const current = projects[currentProjectId];
  const newName = prompt(
    "Nuovo nome per il progetto:",
    current.name || current.id
  );
  if (!newName) return;
  const trimmed = newName.trim();
  if (!trimmed) return;

  current.name = trimmed;
  saveData();
  renderProjectSelect();
}

function deleteCurrentProject() {
  const ids = Object.keys(projects);
  if (ids.length <= 1) {
    alert(
      "Non puoi eliminare l'unico progetto esistente. Crea prima un altro progetto."
    );
    return;
  }
  const current = projects[currentProjectId];
  const name = current.name || current.id;

  if (
    !confirm(
      `Vuoi davvero eliminare il progetto "${name}"?\nTutte le attività e le milestone collegate andranno perse.`
    )
  ) {
    return;
  }

  delete projects[currentProjectId];

  const newId = Object.keys(projects)[0];
  currentProjectId = newId;
  const p = normalizeProject(projects[newId]);
  projects[newId] = p;

  tasks = Array.isArray(p.tasks) ? p.tasks : [];
  columnState = ensureColumnStateDefaults(p.columnState);
  milestones = Array.isArray(p.milestones) ? p.milestones : [];
  roadmapScale = p.roadmapScale || "months";
  editingTaskId = null;
  exitEditMode();

  searchTerm = "";
  const searchInput = document.getElementById("taskSearch");
  if (searchInput) searchInput.value = "";

  saveData();
  renderProjectSelect();
  renderKanban();
  renderTimeline();
  renderRoadmap();
  refreshColumnCollapseUI();
}

function archiveCompletedTasks() {
  if (!tasks.length) {
    alert("Non ci sono attività da archiviare in questo progetto.");
    return;
  }

  const completedCount = tasks.filter((t) => t.status === "done").length;
  if (!completedCount) {
    alert("Non ci sono attività nello stato 'Completato' da archiviare.");
    return;
  }

  if (
    !confirm(
      `Vuoi archiviare (rimuovere) ${completedCount} attività completate da questo progetto?`
    )
  ) {
    return;
  }

  const editingWasCompleted =
    editingTaskId &&
    tasks.some((t) => t.id === editingTaskId && t.status === "done");

  tasks = tasks.filter((t) => t.status !== "done");

  if (editingWasCompleted) {
    exitEditMode();
  }

  saveData();
  renderKanban();
  renderTimeline();
}

function exportCurrentProjectAsJSON() {
  if (!currentProjectId || !projects[currentProjectId]) return;
  const data = projects[currentProjectId];

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const safeName = (data.name || data.id || "progetto")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

  const a = document.createElement("a");
  a.href = url;
  a.download = `kanban-${safeName || "progetto"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importProjectFromJSON(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const parsed = JSON.parse(text);

      // Caso 1: oggetto progetto esportato
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        Array.isArray(parsed.tasks)
      ) {
        const baseName = parsed.name || parsed.id || "Progetto importato";
        let idBase = (parsed.id || baseName)
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9\-]/g, "");
        if (!idBase) idBase = "progetto-importato";
        let id = idBase;
        let suffix = 1;
        while (projects[id]) {
          id = idBase + "-" + suffix++;
        }

        projects[id] = normalizeProject(
          {
            id,
            name: baseName,
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
            columnState: parsed.columnState,
            milestones: Array.isArray(parsed.milestones)
              ? parsed.milestones
              : [],
            roadmapScale: parsed.roadmapScale || "months",
          },
          false
        );

        currentProjectId = id;
        const current = projects[id];
        tasks = current.tasks;
        columnState = current.columnState;
        milestones = current.milestones;
        roadmapScale = current.roadmapScale;
        searchTerm = "";
        const searchInput = document.getElementById("taskSearch");
        if (searchInput) searchInput.value = "";

        saveData();
        renderProjectSelect();
        renderKanban();
        renderTimeline();
        renderRoadmap();
        refreshColumnCollapseUI();
        exitEditMode();
        alert(`Progetto importato come "${baseName}".`);
        return;
      }

      // Caso 2: lista di task da applicare al progetto corrente
      if (Array.isArray(parsed)) {
        tasks = parsed;
        columnState = getDefaultColumnState();
        milestones = [];
        roadmapScale = "months";
        searchTerm = "";
        const searchInput = document.getElementById("taskSearch");
        if (searchInput) searchInput.value = "";
        saveData();
        renderKanban();
        renderTimeline();
        renderRoadmap();
        refreshColumnCollapseUI();
        exitEditMode();
        alert("Attività importate nel progetto corrente.");
        return;
      }

      alert(
        "JSON non valido: atteso un progetto esportato (con proprietà 'tasks') o un array di attività."
      );
    } catch (err) {
      console.error(err);
      alert("Errore durante la lettura del file JSON.");
    }
  };

  reader.readAsText(file);
}

// =========================
// Menu progetto (⋮)
// =========================
function setupProjectMenu() {
  const btn = document.getElementById("projectMenuButton");
  const menu = document.getElementById("projectMenu");
  const importInput = document.getElementById("projectImportInput");
  if (!btn || !menu || !importInput) return;

  const toggleMenu = (forceHide) => {
    if (forceHide === true) {
      menu.classList.add("hidden");
      return;
    }
    if (menu.classList.contains("hidden")) {
      menu.classList.remove("hidden");
    } else {
      menu.classList.add("hidden");
    }
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  menu.addEventListener("click", (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    if (action === "rename") {
      renameCurrentProject();
    } else if (action === "delete") {
      deleteCurrentProject();
    } else if (action === "cleanDone") {
      archiveCompletedTasks();
    } else if (action === "export") {
      exportCurrentProjectAsJSON();
    } else if (action === "import") {
      importInput.value = "";
      importInput.click();
    }

    toggleMenu(true);
  });

  importInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    importProjectFromJSON(file);
  });

  document.addEventListener("click", (e) => {
    if (!menu.classList.contains("hidden")) {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.add("hidden");
      }
    }
  });
}

// =========================
// Init
// =========================
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  loadCompactViewPreference();

  setupForm();
  setupViewSwitcher();
  setupKanbanDropzones();
  setupColumnCollapse();
  setupProjectSelector();
  setupProjectMenu();
  setupSearchBar();
  setupCompactToggle();
  setupRoadmapControls();
  applyCompactView();

  renderProjectSelect();
  renderKanban();
  renderTimeline();
  renderRoadmap();
});
