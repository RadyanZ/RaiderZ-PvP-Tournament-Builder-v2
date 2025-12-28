/* ===============================
   STATE / HELPERS
================================ */
const historyKey = "rz_tournament_history";

let players = [];
let stats = {};
let matches = [];
let generated = false;

const el = (id) => document.getElementById(id);

/* ===============================
   PARTICIPANTS
================================ */
el("addPlayerBtn").onclick = addPlayer;
el("playerName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addPlayer();
});

function addPlayer() {
  const n = el("playerName").value.trim();
  if (!n || players.includes(n)) return;

  players.push(n);
  stats[n] = { w: 0, l: 0 };

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
   MATCHES (ROUND ROBIN)
================================ */
el("generateBtn").onclick = generateMatches;
el("shuffleBtn").onclick = shuffleMatches;

let matchResults = new Map(); // key: "A|B" , value: winner
let shuffleLocked = false;


function generateMatches() {
  if (generated) {
    renderMatches();
    return;
  }
  if (players.length < 2) return;

  generated = true;
  matches = [];

  const pool = [...players];
  const isOdd = pool.length % 2 !== 0;
  const playersRR = isOdd ? [...pool, null] : [...pool];
  const totalRounds = playersRR.length - 1;

  for (let round = 0; round < totalRounds; round++) {
    for (let i = 0; i < playersRR.length / 2; i++) {
      const p1 = playersRR[i];
      const p2 = playersRR[playersRR.length - 1 - i];
      if (p1 && p2) matches.push([p1, p2]);
    }
    // rotate (except first)
    const last = playersRR.pop();
    playersRR.splice(1, 0, last);
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
  const savedWinner = matchResults.get(key);

  if (savedWinner === a) b1.classList.add("winner");
  if (savedWinner === b) b2.classList.add("winner");

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

  // undo previous result
  if (prev) {
    stats[prev].w--;
    const prevLoser = prev === w ? l : w;
    stats[prevLoser].l--;
  }

  // apply new result
  matchResults.set(key, w);
  stats[w].w++;
  stats[l].l++;

  wb.classList.add("winner");
  lb.classList.remove("winner");

  renderRanking();
}

/* ===============================
   RANKING (TABLE-LIKE)
   Requires you to render rows as columns:
   Rank | Name | Victories | Losses | Points

   Expected HTML:
   <div class="ranking-table">
     <div class="ranking-head">
       <div>Rank</div><div>Name</div><div>Victories</div><div>Losses</div><div>Points</div>
     </div>
     <ul id="ranking" class="ranking-list"></ul>
   </div>
================================ */
function renderRanking() {
  const ul = el("ranking");
  ul.innerHTML = "";

  // sort primarily by wins desc, then losses asc, then name asc
  const sorted = [...players].sort((a, b) => {
    const dw = stats[b].w - stats[a].w;
    if (dw !== 0) return dw;
    const dl = stats[a].l - stats[b].l;
    if (dl !== 0) return dl;
    return a.localeCompare(b);
  });

  sorted.forEach((p, i) => {
    let star = "";
   if (i === 0) star = '<i class="fa-solid fa-medal" style="font-size:18px;color:gold"></i>';
   if (i === 1) star = '<i class="fa-solid fa-medal" style="font-size:18px;color:silver"></i>';
   if (i === 2) star = '<i class="fa-solid fa-medal" style="font-size:18px;color:#cd7f32"></i>';

    // Simple points rule: 3 points per win (change if you want)
    const pts = stats[p].w * 3;

    const li = document.createElement("li");
    li.className = `rank-row ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}`;

    li.innerHTML = `
      <div class="col-rank">${i + 1}</div>
      <div class="col-name">${escapeHtml(p)} ${star}</div>
      <div class="col-num">${stats[p].w}</div>
      <div class="col-num">${stats[p].l}</div>
      <div class="col-num">${pts}</div>
    `;

    ul.appendChild(li);
  });

  // Export panel labels
  el("exportTitle").textContent = el("tournamentName").value || "Official Tournament Ranking";
  el("exportDate").textContent = el("tournamentDate").value || new Date().toLocaleDateString();
}

/* ===============================
   EXPORT IMAGE
================================ */
el("exportImageBtn").onclick = () => {
  if (el("ranking").children.length === 0) return alert("Nothing to export");

  html2canvas(el("exportArea"), {
    backgroundColor: "#0b0b10",
    useCORS: true,
  }).then((c) => {
    const a = document.createElement("a");
    a.download = "tournament.png";
    a.href = c.toDataURL();
    a.click();
  });
};

/* ===============================
   HISTORY
================================ */
el("saveHistoryBtn").onclick = saveHistory;
el("resetBtn").onclick = resetTournament;

function saveHistory() {
  if (players.length === 0) return alert("Nothing to save");

  const h = JSON.parse(localStorage.getItem(historyKey) || "[]");

  // store ranking snapshot with w/l
  const rankingSnapshot = [...players]
    .sort((a, b) => stats[b].w - stats[a].w)
    .map((p) => ({ name: p, w: stats[p].w, l: stats[p].l }));

  h.push({
    name: el("tournamentName").value || "Unnamed",
    date: el("tournamentDate").value || new Date().toLocaleDateString(),
    ranking: rankingSnapshot,
  });

  localStorage.setItem(historyKey, JSON.stringify(h));
  renderHistory();
}

function resetTournament() {
  players = [];
  stats = {};
  matches = [];
  generated = false;

  el("playerList").innerHTML = "";
  el("matches").innerHTML = "";
  el("ranking").innerHTML = "";

  el("tournamentName").value = "";
  el("tournamentDate").value = "";
  matchResults.clear();
shuffleLocked = false;
}

function renderHistory() {
  const c = el("history");
  c.innerHTML = "";

  const h = JSON.parse(localStorage.getItem(historyKey) || "[]");

  h.forEach((t, i) => {
    const d = document.createElement("div");
    d.className = "history-card";

    const rankingLines = t.ranking
      .map((r, idx) => `${idx + 1}. ${escapeHtml(r.name)} (${r.w}W-${r.l}L)`)
      .join("<br>");

    d.innerHTML = `
      <button class="danger" style="float:right" onclick="deleteHistory(${i})">Delete</button>
      <strong>${escapeHtml(t.name)}</strong> (${escapeHtml(t.date)})<br>
      ${rankingLines}
    `;

    c.appendChild(d);
  });
}

function deleteHistory(i) {
  const h = JSON.parse(localStorage.getItem(historyKey) || "[]");
  h.splice(i, 1);
  localStorage.setItem(historyKey, JSON.stringify(h));
  renderHistory();
}

/* ===============================
   IMPORT / EXPORT HISTORY FILE
================================ */
el("exportHistoryBtn").onclick = () => {
  const h = localStorage.getItem(historyKey) || "[]";
  const blob = new Blob([h], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "raiderz_history.txt";
  a.click();
};

el("importHistoryBtn").onclick = () => el("importFile").click();

el("importFile").onchange = (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const r = new FileReader();
  r.onload = () => {
    localStorage.setItem(historyKey, String(r.result || "[]"));
    renderHistory();
  };
  r.readAsText(file);
};

/* ===============================
   UTIL
================================ */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* ===============================
   INITIAL RENDER
================================ */
renderHistory();
renderRanking();


