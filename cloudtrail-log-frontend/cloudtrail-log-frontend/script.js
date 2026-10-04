// ============================================================
// CloudTrail Organization Log Dashboard - script.js
// CHANGE THE API URL HERE if your Spring Boot runs elsewhere:
const API_BASE_URL = "http://localhost:8080/api";
// ============================================================
// The frontend only talks to the Spring Boot REST API.
// It never connects to AWS or MySQL directly and holds no secrets.

const PAGE_SIZE = 10;
let usingDemo = true;      // true when backend is unreachable
let allLogs = [], filteredLogs = [], allAccounts = [], currentPage = 1;

// ---------- DEMO DATA (used only when backend is offline) ----------
const DEMO_ACCOUNTS = [
  { accountId: "100000000001", accountName: "Development", region: "ap-south-1", status: "ACTIVE" },
  { accountId: "100000000002", accountName: "Testing", region: "ap-south-1", status: "ACTIVE" },
  { accountId: "100000000003", accountName: "Production", region: "ap-south-1", status: "ACTIVE" }
];
function buildDemoLogs() {
  const events = [["ConsoleLogin","signin.amazonaws.com"],["CreateBucket","s3.amazonaws.com"],["DeleteBucket","s3.amazonaws.com"],
    ["PutObject","s3.amazonaws.com"],["RunInstances","ec2.amazonaws.com"],["StopInstances","ec2.amazonaws.com"]];
  const users = ["admin","user1","devops"], regions = ["ap-south-1","us-east-1","eu-west-1"];
  const logs = [];
  for (let i = 1; i <= 36; i++) {
    const acc = DEMO_ACCOUNTS[i % 3], ev = events[i % events.length];
    const t = new Date(Date.now() - i * 17 * 60000);
    logs.push({ id: i, eventId: "evt-" + String(i).padStart(3, "0"), accountId: acc.accountId, accountName: acc.accountName,
      eventName: ev[0], eventSource: ev[1], username: users[i % 3], userType: i % 3 === 0 ? "Root" : "IAMUser",
      region: regions[i % 3 === 2 ? 1 : 0], sourceIp: "192.168.1." + (10 + i), eventTime: t.toISOString().slice(0, 19),
      resourceName: ev[0].includes("Bucket") ? "demo-bucket-" + i : "N/A",
      status: i % 7 === 0 ? "FAILED" : "SUCCESS",
      errorCode: i % 7 === 0 ? "AccessDenied" : "", errorMessage: i % 7 === 0 ? "User is not authorized" : "" });
  }
  return logs;
}
const DEMO_LOGS = buildDemoLogs();

// ---------- REUSABLE API FUNCTION ----------
// Returns the JSON response, or throws an Error with a friendly message.
async function apiGet(path) {
  let response;
  try { response = await fetch(API_BASE_URL + path); }
  catch (e) { throw new Error("Cannot reach the Spring Boot backend at " + API_BASE_URL + ". Is it running?"); }
  if (!response.ok) throw new Error("Server error " + response.status + " while calling " + path);
  return response.json();
}
// Try the backend; use demo data if it fails.
async function loadOrDemo(path, demoValue) {
  try { const d = await apiGet(path); usingDemo = false; return d; }
  catch (e) { usingDemo = true; return demoValue; }
}

// ---------- SMALL HELPERS ----------
const $ = id => document.getElementById(id);
function showMessage(text, type) {
  const m = $("message"); m.textContent = text; m.className = "message " + type;
}
function hideMessage() { $("message").className = "message hidden"; }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function statusTag(s) { return '<span class="st ' + esc(s) + '">' + esc(s) + "</span>"; }
function fmtTime(t) { return t ? String(t).replace("T", " ") : "-"; }
function ago(t) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(t)) / 60000));
  return mins < 1 ? "just now" : mins < 60 ? mins + " min ago" : Math.round(mins / 60) + " hr ago";
}
function countBy(list, key) { const r = {}; list.forEach(x => r[x[key]] = (r[x[key]] || 0) + 1); return r; }
function drawBars(el, counts, bad) {
  const entries = Object.entries(counts), max = Math.max(1, ...entries.map(e => e[1]));
  $(el).innerHTML = entries.length ? entries.map(([k, v]) =>
    '<div class="bar-row"><span class="bar-label">' + esc(k) + '</span><div class="bar-track"><div class="bar-fill ' +
    (bad && k === "FAILED" ? "bad" : "") + '" style="width:' + (v / max * 100) + '%"></div></div><b>' + v + "</b></div>").join("")
    : '<div class="empty">No data</div>';
}
function fillSelect(id, values, firstLabel) {
  const sel = $(id); sel.innerHTML = '<option value="">' + firstLabel + "</option>" +
    [...new Set(values)].sort().map(v => '<option value="' + esc(v) + '">' + esc(v) + "</option>").join("");
}
function setMode() {
  const b = $("modeBadge"); b.textContent = usingDemo ? "Demo Data" : "Live Backend Data";
  b.className = "badge " + (usingDemo ? "demo" : "live");
  document.querySelectorAll(".statBadge").forEach(x => { x.textContent = usingDemo ? "Demo Data" : "Backend Data"; x.className = "badge statBadge " + (usingDemo ? "demo" : "live"); });
  $("trailNote").textContent = usingDemo ? "Demo values - not real AWS CloudTrail measurements." : "";
  if (usingDemo) showMessage("Spring Boot backend not reachable. Showing demo data only.", "info"); else hideMessage();
}

// ---------- NAVIGATION ----------
document.querySelectorAll(".sidebar a").forEach(a => a.addEventListener("click", e => {
  e.preventDefault(); showPage(a.dataset.page);
}));
function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  $("page-" + name).classList.remove("hidden");
  document.querySelectorAll(".sidebar a").forEach(a => a.classList.toggle("active", a.dataset.page === name));
}

// ---------- DASHBOARD ----------
async function loadDashboard() {
  const demoStats = {
    totalAccounts: DEMO_ACCOUNTS.length, totalLogs: DEMO_LOGS.length,
    todayLogs: DEMO_LOGS.filter(l => l.eventTime.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    failedEvents: DEMO_LOGS.filter(l => l.status === "FAILED").length, trailStatus: "ACTIVE", lastEvent: "17 min ago" };
  const s = await loadOrDemo("/dashboard/stats", demoStats);
  $("statAccounts").textContent = s.totalAccounts; $("statLogs").textContent = s.totalLogs;
  $("statToday").textContent = s.todayLogs; $("statFailed").textContent = s.failedEvents;
  $("statTrail").textContent = s.trailStatus; $("statLast").textContent = s.lastEvent;
  $("trailStatus").textContent = s.trailStatus; $("trailLast").textContent = s.lastEvent;
  $("dbStatus").textContent = usingDemo ? "UNKNOWN (backend offline)" : "CONNECTED (via Spring Boot)";

  $("recentBody").innerHTML = '<tr><td colspan="6" class="empty">Loading...</td></tr>';
  const recent = await loadOrDemo("/logs/recent", DEMO_LOGS.slice(0, 5));
  $("recentBody").innerHTML = recent.length ? recent.map(l => "<tr><td>" + esc(l.eventId) + "</td><td>" + esc(l.accountName) +
    "</td><td>" + esc(l.eventName) + "</td><td>" + esc(l.username) + "</td><td>" + esc(fmtTime(l.eventTime)) + "</td><td>" +
    statusTag(l.status) + "</td></tr>").join("") : '<tr><td colspan="6" class="empty">No logs found</td></tr>';
}
function drawStats() {
  drawBars("chartAccount", countBy(allLogs, "accountName")); drawBars("chartEvent", countBy(allLogs, "eventName"));
  drawBars("chartRegion", countBy(allLogs, "region")); drawBars("chartStatus", countBy(allLogs, "status"), true);
}

// ---------- ACCOUNTS ----------
async function loadAccounts() {
  $("accountsBody").innerHTML = '<tr><td colspan="7" class="empty">Loading...</td></tr>';
  allAccounts = await loadOrDemo("/accounts", DEMO_ACCOUNTS);
  $("accountsBody").innerHTML = allAccounts.length ? allAccounts.map(a => {
    const mine = allLogs.filter(l => l.accountId === a.accountId);
    const last = mine.length ? ago(mine.map(l => l.eventTime).sort().pop()) : "-";
    return "<tr><td>" + esc(a.accountId) + "</td><td>" + esc(a.accountName) + "</td><td>" + esc(a.region) + "</td><td>" + statusTag(a.status) +
      "</td><td>" + (a.totalLogs ?? mine.length) + "</td><td>" + esc(a.lastActivity || last) +
      '</td><td><button onclick="viewAccountLogs(\'' + esc(a.accountId) + '\')">View Logs</button></td></tr>';
  }).join("") : '<tr><td colspan="7" class="empty">No accounts found</td></tr>';
}
async function viewAccountLogs(accountId) {
  const logs = await loadOrDemo("/logs/account/" + encodeURIComponent(accountId), allLogs.filter(l => l.accountId === accountId));
  $("accountLogsPanel").classList.remove("hidden");
  $("accountLogsTitle").textContent = "Logs for Account: " + accountId;
  const today = new Date().toISOString().slice(0, 10);
  $("accTotal").textContent = logs.length;
  $("accToday").textContent = logs.filter(l => String(l.eventTime).slice(0, 10) === today).length;
  $("accFailed").textContent = logs.filter(l => l.status === "FAILED").length;
  $("accLatest").textContent = logs.length ? ago(logs.map(l => l.eventTime).sort().pop()) : "-";
  $("accountLogsBody").innerHTML = logs.length ? logs.map(l => "<tr><td>" + esc(l.id) + "</td><td>" + esc(l.eventName) + "</td><td>" + esc(l.username) +
    "</td><td>" + esc(l.region) + "</td><td>" + esc(fmtTime(l.eventTime)) + "</td><td>" + statusTag(l.status) +
    '</td><td><button onclick="viewDetails(' + Number(l.id) + ')">View Details</button></td></tr>').join("")
    : '<tr><td colspan="7" class="empty">No logs found</td></tr>';
  $("accountLogsPanel").scrollIntoView({ behavior: "smooth" });
}

// ---------- LOGS TABLE ----------
async function loadLogs() {
  $("logsBody").innerHTML = '<tr><td colspan="11" class="empty">Loading logs...</td></tr>';
  allLogs = await loadOrDemo("/logs", DEMO_LOGS);
  fillSelect("fAccount", allLogs.map(l => l.accountId), "All Accounts");
  fillSelect("fRegion", allLogs.map(l => l.region), "All Regions");
  fillSelect("fEvent", allLogs.map(l => l.eventName), "All Events");
  fillSelect("rAccount", allLogs.map(l => l.accountId), "All Accounts");
  fillSelect("rEvent", allLogs.map(l => l.eventName), "All Event Types");
  applyFilters();
}
function applyFilters() {
  const kw = $("fSearch").value.trim().toLowerCase(), acc = $("fAccount").value, reg = $("fRegion").value,
        st = $("fStatus").value, ev = $("fEvent").value, d = $("fDate").value;
  filteredLogs = allLogs.filter(l =>
    (!kw || [l.eventName, l.accountId, l.username, l.eventSource].some(v => String(v).toLowerCase().includes(kw))) &&
    (!acc || l.accountId === acc) && (!reg || l.region === reg) && (!st || l.status === st) &&
    (!ev || l.eventName === ev) && (!d || String(l.eventTime).slice(0, 10) === d));
  currentPage = 1; renderLogs();
}
function renderLogs() {
  const pages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  const rows = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  $("logsBody").innerHTML = rows.length ? rows.map(l => "<tr><td>" + esc(l.id) + "</td><td>" + esc(l.accountId) + "</td><td>" + esc(l.accountName) +
    "</td><td>" + esc(l.eventName) + "</td><td>" + esc(l.eventSource) + "</td><td>" + esc(l.username) + "</td><td>" + esc(l.region) +
    "</td><td>" + esc(l.sourceIp) + "</td><td>" + esc(fmtTime(l.eventTime)) + "</td><td>" + statusTag(l.status) +
    '</td><td><button onclick="viewDetails(' + Number(l.id) + ')">View Details</button></td></tr>').join("")
    : '<tr><td colspan="11" class="empty">No logs found</td></tr>';
  $("pageInfo").textContent = "Page " + currentPage + " of " + pages + " (" + filteredLogs.length + " logs)";
  $("prevPage").disabled = currentPage <= 1; $("nextPage").disabled = currentPage >= pages;
}
$("btnSearch").onclick = applyFilters;
$("btnReset").onclick = () => { ["fSearch","fAccount","fRegion","fStatus","fEvent","fDate"].forEach(i => $(i).value = ""); applyFilters(); };
$("prevPage").onclick = () => { currentPage--; renderLogs(); };
$("nextPage").onclick = () => { currentPage++; renderLogs(); };

// ---------- LOG DETAILS MODAL ----------
async function viewDetails(id) {
  const log = await loadOrDemo("/logs/" + id, allLogs.find(l => l.id === id));
  if (!log) return showMessage("Log not found.", "err");
  const fields = [["Event ID","eventId"],["Account ID","accountId"],["Account Name","accountName"],["Event Name","eventName"],["Event Source","eventSource"],
    ["Username","username"],["User Type","userType"],["AWS Region","region"],["Source IP","sourceIp"],["Event Time","eventTime"],
    ["Resource Name","resourceName"],["Event Status","status"],["Error Code","errorCode"],["Error Message","errorMessage"]];
  $("modalBody").innerHTML = fields.map(f => '<div class="detail-row"><b>' + f[0] + "</b><span>" + esc(log[f[1]] || "-") + "</span></div>").join("") +
    "<h4>Full Event JSON</h4><pre>" + esc(log.eventJson || JSON.stringify({ eventName: log.eventName, eventSource: log.eventSource,
      awsRegion: log.region, sourceIPAddress: log.sourceIp }, null, 2)) + "</pre>";
  $("modal").classList.remove("hidden");
}
$("closeModal").onclick = () => $("modal").classList.add("hidden");
$("modal").onclick = e => { if (e.target.id === "modal") $("modal").classList.add("hidden"); };

// ---------- REPORTS ----------
async function generateReport() {
  // Try backend report first; otherwise compute from the loaded logs.
  const q = new URLSearchParams({ from: $("rFrom").value, to: $("rTo").value, accountId: $("rAccount").value,
    eventName: $("rEvent").value, status: $("rStatus").value });
  let r;
  try { r = await apiGet("/reports/summary?" + q); usingDemo = false; }
  catch (e) {
    usingDemo = true;
    const list = allLogs.filter(l => (!$("rFrom").value || l.eventTime.slice(0, 10) >= $("rFrom").value) &&
      (!$("rTo").value || l.eventTime.slice(0, 10) <= $("rTo").value) && (!$("rAccount").value || l.accountId === $("rAccount").value) &&
      (!$("rEvent").value || l.eventName === $("rEvent").value) && (!$("rStatus").value || l.status === $("rStatus").value));
    r = { totalEvents: list.length, successfulEvents: list.filter(l => l.status === "SUCCESS").length,
      failedEvents: list.filter(l => l.status === "FAILED").length, perAccount: countBy(list, "accountName"),
      perRegion: countBy(list, "region"), perEventType: countBy(list, "eventName") };
  }
  $("rTotal").textContent = r.totalEvents; $("rOk").textContent = r.successfulEvents; $("rFail").textContent = r.failedEvents;
  drawBars("rAcc", r.perAccount || {}); drawBars("rReg", r.perRegion || {}); drawBars("rEvt", r.perEventType || {});
  setMode();
}
$("btnReport").onclick = generateReport;

// ---------- TEST LOG API ----------
$("btnTestApi").onclick = async () => {
  const btn = $("btnTestApi"); btn.disabled = true; btn.textContent = "Testing...";
  showMessage("Contacting Log API...", "info");
  try {
    const r = await apiGet("/logs/test");
    showMessage("CloudTrail Log API Connected Successfully (" + (r.message || r.status) + ")", "ok");
  } catch (e) {
    showMessage("Unable to connect to Log API. Please check the Spring Boot backend.", "err");
  }
  btn.disabled = false; btn.textContent = "Test Log API";
};

// ---------- ARCHITECTURE DEMO ----------
$("btnDemo").onclick = async () => {
  const steps = ["AWS Account generates activity", "CloudTrail records the event", "Organization Trail collects the event",
    "Log is stored centrally", "Spring Boot API retrieves the log", "Frontend displays the event"];
  const boxIndex = [0, 1, 2, 3, 4, 6], boxes = document.querySelectorAll("#flow .box");
  const out = $("demoSteps"); out.innerHTML = ""; $("btnDemo").disabled = true;
  for (let i = 0; i < steps.length; i++) {
    boxes.forEach(b => b.classList.remove("active")); boxes[boxIndex[i]].classList.add("active");
    out.innerHTML += "<div>Step " + (i + 1) + ": " + steps[i] + "</div>";
    await new Promise(r => setTimeout(r, 900));
  }
  boxes.forEach(b => b.classList.remove("active"));
  out.innerHTML += '<div style="color:#2e7d32">CloudTrail Event Successfully Aggregated</div>';
  $("btnDemo").disabled = false;
};

// ---------- START ----------
(async function init() {
  await loadLogs();        // logs first (other sections reuse them)
  await loadAccounts();
  await loadDashboard();
  drawStats();
  await generateReport();
  setMode();
})();
