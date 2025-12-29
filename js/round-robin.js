const historyKey = "rz_tournament_history";

let players = [];
let stats = {};
let matches = [];
let generated = false;

let matchResults = new Map();
let shuffleLocked = false;

const el = (id) => document.getElementById(id);

/* ===============================
   RULES & TOURNAMENT TYPE
================================ */
const officialToggle = el("officialToggle");
const tournamentType = el("tournamentType");
const rulesContent = el("rulesContent");

officialToggle.onchange = updateRules;
tournamentType.onchange = updateRules;

function updateRules() {
  const isOfficial = officialToggle.checked;

  if (tournamentType.value === "roundrobin" && isOfficial) {
    rulesContent.innerHTML = `
      <strong>Round Robin – Official Tournament</strong><br><br>
      Each participant fights every other participant exactly once.
      Rankings are decided by total victories, then losses.<br><br>
      <strong>Allowed equipment:</strong><br>
      • Termis gear<br>
      • Weapon level 1<br>
	  • No enchantment<br>
	  • No buffs<br>
      • No jewels<br>
      • No accessories<br>
      • No costume
    `;
  } else {
    rulesContent.innerHTML = `
      <strong>Round Robin – Unofficial Tournament</strong><br><br>
      A relaxed tournament format where each participant fights every other participant once.<br><br>
      <strong>Allowed equipment:</strong><br>
      Any gear, weapons, jewels, accessories, and costumes are allowed.
    `;
  }
}

updateRules();

/* ===============================
   PARTICIPANTS
================================ */
el("addPlayerBtn").onclick = addPlayer;
el("playerName").addEventListener("keydown", e => {
  if (e.key === "Enter") addPlayer();
});

function addPlayer() {
  const name = el("playerName").value.trim();
  if (!name || players.includes(name)) return;

  players.push(name);
  stats[name] = { w: 0, l: 0 };

  el("playerName").value = "";
  renderPlayers();
  renderRanking();
}

function renderPlayers() {
  el("playerList").innerHTML = "";
  players.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${p}`;
    el("playerList").appendChild(li);
  });
}

/* ===============================
   MATCHES
================================ */
el("generateBtn").onclick = generateMatches;
el("shuffleBtn").onclick = shuffleMatches;

function generateMatches() {
  if (generated || players.length < 2) return;

  generated = true;
  lockRules();

  matches = [];
  const pool = [...players];
  if (pool.length % 2 !== 0) pool.push(null);

  for (let r = 0; r < pool.length - 1; r++) {
    for (let i = 0; i < pool.length / 2; i++) {
      const a = pool[i];
      const b = pool[pool.length - 1 - i];
      if (a && b) matches.push([a, b]);
    }
    const last = pool.pop();
    pool.splice(1, 0, last);
  }

  renderMatches();
}

function shuffleMatches() {
  if (!generated || shuffleLocked) return;
  matches.sort(() => Math.random() - 0.5);
  renderMatches();
}

function renderMatches() {
  const m = el("matches");
  m.innerHTML = "";

  matches.forEach(([a, b]) => {
    const d = document.createElement("div");
    d.className = "match";

    const b1 = document.createElement("button");
    const b2 = document.createElement("button");
    const vs = document.createElement("span");
    vs.className = "vs";
    vs.textContent = "VS";

    b1.textContent = a;
    b2.textContent = b;

    const key = `${a}|${b}`;
    const saved = matchResults.get(key);

    if (saved === a) b1.classList.add("winner");
    if (saved === b) b2.classList.add("winner");

    b1.onclick = () => setWinner(a, b, b1, b2, key);
    b2.onclick = () => setWinner(b, a, b2, b1, key);

    d.append(b1, vs, b2);
    m.appendChild(d);
  });
}

function setWinner(w, l, wb, lb, key) {
  shuffleLocked = true;

  const prev = matchResults.get(key);
  if (prev === w) return;

  if (prev) {
    stats[prev].w--;
    stats[prev === w ? l : w].l--;
  }

  matchResults.set(key, w);
  stats[w].w++;
  stats[l].l++;

  wb.classList.add("winner");
  lb.classList.remove("winner");

  renderRanking();
}

/* ===============================
   LOCK RULES
================================ */
function lockRules() {
  tournamentType.disabled = true;
  officialToggle.disabled = true;
  rulesContent.classList.add("locked");
}

/* ===============================
   RANKING
================================ */
function renderRanking() {
  const ul = el("ranking");
  ul.innerHTML = "";

  [...players]
    .sort((a, b) => stats[b].w - stats[a].w || stats[a].l - stats[b].l)
    .forEach((p, i) => {
      const li = document.createElement("li");

      let medal = "";
      if (i === 0) { li.classList.add("gold"); medal = "🥇 "; }
      else if (i === 1) { li.classList.add("silver"); medal = "🥈 "; }
      else if (i === 2) { li.classList.add("bronze"); medal = "🥉 "; }

      li.innerHTML = `
        <div>${medal}${i + 1}</div>
        <div>${p}</div>
        <div>${stats[p].w}</div>
        <div>${stats[p].l}</div>
        <div>${stats[p].w * 3}</div>
      `;

      ul.appendChild(li);
    });

  el("exportTitle").textContent =
    el("tournamentName").value || "Tournament #";

  el("exportType").textContent =
    officialToggle.checked ? "Official Tournament" : "Unofficial Tournament";

  el("exportDate").textContent =
    el("tournamentDate").value || new Date().toLocaleDateString();
}

/* ===============================
   EXPORT IMAGE (TWEMOJI FIX)
================================ */
/* ===============================
   EXPORT IMAGE (STABLE)
================================ */
el("exportImageBtn").onclick = async () => {
  const exportArea = el("exportArea");

  // Esperar a que todas las imágenes carguen
  const images = exportArea.querySelectorAll("img");
  await Promise.all(
    [...images].map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise(res => {
            img.onload = img.onerror = res;
          })
    )
  );

  html2canvas(exportArea, {
    backgroundColor: "#0b0b10",
    scale: 2,
    useCORS: true,
    allowTaint: false
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = "tournament-ranking.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
};

/* ===============================
   HISTORY SAVE / LOAD
================================ */

el("saveHistoryBtn").onclick = saveHistory;
el("exportHistoryBtn").onclick = exportHistory;
el("importHistoryBtn").onclick = () => el("importFile").click();
el("importFile").onchange = importHistory;

function saveHistory() {
  if (!generated) return;

  const history = loadHistory();

  const ranking = [...players]
    .sort((a, b) => stats[b].w - stats[a].w || stats[a].l - stats[b].l)
    .map((p, i) => ({
      rank: i + 1,
      name: p,
      w: stats[p].w,
      l: stats[p].l,
      points: stats[p].w * 3
    }));

  history.push({
    name: el("tournamentName").value || "Tournament #",
    date: el("tournamentDate").value || new Date().toLocaleDateString(),
    official: officialToggle.checked,
    type: tournamentType.value,
    ranking
  });

  localStorage.setItem(historyKey, JSON.stringify(history));
  renderHistory();
}


function loadHistory() {
  return JSON.parse(localStorage.getItem(historyKey)) || [];
}

function renderHistory() {
  const container = el("history");
  container.innerHTML = "";

  loadHistory().forEach((t, i) => {
    const div = document.createElement("div");
    div.className = "history-card";

    const rows = t.ranking
      .slice(0, 3)
      .map(r => {
        const medal =
          r.rank === 1 ? "🥇" :
          r.rank === 2 ? "🥈" :
          r.rank === 3 ? "🥉" : "";
        return `${medal} ${r.name} – ${r.points} pts`;
      })
      .join("<br>");

    div.innerHTML = `
      <strong>${t.name}</strong><br>
      <small>${t.official ? "Official" : "Unofficial"} – ${t.date}</small>
      <div style="margin:8px 0">${rows}</div>
      <button onclick="deleteHistory(${i})">Delete</button>
    `;

    container.appendChild(div);
  });
}


function deleteHistory(index) {
  const history = loadHistory();
  history.splice(index, 1);
  localStorage.setItem(historyKey, JSON.stringify(history));
  renderHistory();
}

function exportHistory() {
  const data = JSON.stringify(loadHistory(), null, 2);
  const blob = new Blob([data], { type: "application/json" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "raiderz-tournament-history.json";
  a.click();
}

function importHistory(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    localStorage.setItem(historyKey, reader.result);
    renderHistory();
  };
  reader.readAsText(file);
}


/* ===============================
   RESET
================================ */
el("resetBtn").onclick = () => location.reload();







