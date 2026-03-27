// ════════════════════════════════════
//  EXPENSE TRACKER — script.js
// ════════════════════════════════════

const USERS = [
  { username: "admin",   password: "1234", role: "Administrator" },
  { username: "staff",   password: "1234", role: "Staff Member"   },
  { username: "student", password: "1234", role: "Student"        }
];

const CATEGORIES = ["Food","Transport","Shopping","Health","Entertainment","Education","Other"];

const CAT_ICONS = {
  Food: "🍔", Transport: "🚌", Shopping: "🛍️",
  Health: "💊", Entertainment: "🎬", Education: "📚", Other: "📦"
};

// ── AUTH ────────────────────────────
function getLoggedUser() {
  return JSON.parse(sessionStorage.getItem("expenseUser") || "null");
}

function requireAuth() {
  if (!getLoggedUser()) {
    window.location.href = "login.html";
    return null;
  }
  return getLoggedUser();
}

function logout() {
  sessionStorage.removeItem("expenseUser");
  window.location.href = "login.html";
}

// ── STORAGE ─────────────────────────
function getExpenses() {
  const user = getLoggedUser();
  if (!user) return [];
  return JSON.parse(localStorage.getItem(`expenses_${user.username}`) || "[]");
}

function saveExpenses(list) {
  const user = getLoggedUser();
  if (!user) return;
  localStorage.setItem(`expenses_${user.username}`, JSON.stringify(list));
}

function addExpense(expense) {
  const list = getExpenses();
  expense.id = Date.now().toString();
  list.unshift(expense);
  saveExpenses(list);
}

function deleteExpense(id) {
  let list = getExpenses();
  list = list.filter(e => e.id !== id);
  saveExpenses(list);
}

function updateExpense(id, data) {
  let list = getExpenses();
  const idx = list.findIndex(e => e.id === id);
  if (idx !== -1) list[idx] = { ...list[idx], ...data };
  saveExpenses(list);
}

// ── UTILS ────────────────────────────
function formatCurrency(n) {
  return "₹" + parseFloat(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function badgeClass(cat) {
  const map = {
    Food:"badge-food", Transport:"badge-transport", Shopping:"badge-shopping",
    Health:"badge-health", Entertainment:"badge-entertainment",
    Education:"badge-education", Other:"badge-other"
  };
  return map[cat] || "badge-other";
}

function showToast(msg, type = "success") {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.innerHTML = `<span>${type === "success" ? "✓" : "✗"}</span> ${msg}`;
  t.style.borderColor = type === "success" ? "var(--teal)" : "var(--danger)";
  t.style.color       = type === "success" ? "var(--teal)" : "var(--danger)";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

// ── SIDEBAR RENDER ───────────────────
function renderSidebar(activePage) {
  const user = getLoggedUser();
  if (!user) return;

  const initials = user.username[0].toUpperCase();

  const navItems = [
    { id: "dashboard",   label: "Dashboard",   icon: "📊", href: "dashboard.html"    },
    { id: "add-expense", label: "Add Expense",  icon: "➕", href: "add-expense.html"  },
  ];

  const nav = navItems.map(n => `
    <a href="${n.href}" class="nav-item ${activePage === n.id ? "active" : ""}">
      <span class="nav-icon">${n.icon}</span> ${n.label}
    </a>
  `).join("");

  return `
    <div class="sidebar-logo">💰<span>Expense</span>Track</div>
    <div class="sidebar-user">
      <div class="user-avatar">${initials}</div>
      <div class="user-name">${user.username}</div>
      <div class="user-role">${user.role}</div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-label">Menu</div>
      ${nav}
    </nav>
    <div class="sidebar-footer">
      <button class="btn btn-ghost" style="width:100%" onclick="logout()">🚪 Logout</button>
    </div>
  `;
}

// ── LOGIN PAGE ───────────────────────
function initLogin() {
  if (getLoggedUser()) { window.location.href = "dashboard.html"; return; }

  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();
    const uname = document.getElementById("username").value.trim().toLowerCase();
    const pass  = document.getElementById("password").value;
    const err   = document.getElementById("errorMsg");

    const found = USERS.find(u => u.username === uname && u.password === pass);
    if (found) {
      sessionStorage.setItem("expenseUser", JSON.stringify(found));
      window.location.href = "dashboard.html";
    } else {
      err.style.display = "block";
      err.textContent = "Invalid username or password. Try again.";
      document.getElementById("password").value = "";
    }
  });
}

// ── DASHBOARD ────────────────────────
function initDashboard() {
  const user = requireAuth();
  if (!user) return;

  document.getElementById("sidebar").innerHTML = renderSidebar("dashboard");

  const expenses = getExpenses();
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();

  const monthly = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const total       = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const monthTotal  = monthly.reduce((s, e) => s + parseFloat(e.amount), 0);
  const avgPerEntry = expenses.length ? total / expenses.length : 0;

  document.getElementById("statTotal").textContent   = formatCurrency(total);
  document.getElementById("statMonth").textContent   = formatCurrency(monthTotal);
  document.getElementById("statAvg").textContent     = formatCurrency(avgPerEntry);
  document.getElementById("statCount").textContent   = expenses.length + " entries";
  document.getElementById("statMonthCount").textContent = monthly.length + " this month";

  renderChart(expenses);
  renderTable(expenses, "All");

  // Category filter
  const catSel = document.getElementById("catFilter");
  CATEGORIES.forEach(c => {
    const opt = document.createElement("option"); opt.value = c; opt.textContent = c;
    catSel.appendChild(opt);
  });
  catSel.addEventListener("change", () => renderTable(getExpenses(), catSel.value));
}

function renderChart(expenses) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  const last6 = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6.push({ label: months[d.getMonth()], month: d.getMonth(), year: d.getFullYear(), total: 0 });
  }
  expenses.forEach(e => {
    const d = new Date(e.date);
    const slot = last6.find(s => s.month === d.getMonth() && s.year === d.getFullYear());
    if (slot) slot.total += parseFloat(e.amount);
  });

  const max = Math.max(...last6.map(s => s.total), 1);
  const container = document.getElementById("chartBars");
  container.innerHTML = last6.map(s => `
    <div class="bar-group">
      <div class="bar" style="height:${Math.round((s.total / max) * 120)}px"
           title="${s.label}: ${formatCurrency(s.total)}"></div>
      <span class="bar-label">${s.label}</span>
    </div>
  `).join("");
}

function renderTable(expenses, filter) {
  const tbody = document.getElementById("expenseBody");
  const totalEl = document.getElementById("tableTotal");

  let list = filter === "All" ? expenses : expenses.filter(e => e.category === filter);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5">
      <div class="empty-state">
        <div class="empty-icon">💸</div>
        <div class="empty-text">No expenses found. <a href="add-expense.html" style="color:var(--teal)">Add one!</a></div>
      </div>
    </td></tr>`;
    totalEl.textContent = formatCurrency(0);
    return;
  }

  const total = list.reduce((s, e) => s + parseFloat(e.amount), 0);
  totalEl.textContent = formatCurrency(total);

  tbody.innerHTML = list.map(e => `
    <tr>
      <td><strong>${e.name}</strong>${e.note ? `<br><small style="color:var(--muted)">${e.note}</small>` : ""}</td>
      <td class="amount-cell" style="color:var(--teal)">${formatCurrency(e.amount)}</td>
      <td><span class="category-badge ${badgeClass(e.category)}">${CAT_ICONS[e.category] || "📦"} ${e.category}</span></td>
      <td style="color:var(--muted)">${formatDate(e.date)}</td>
      <td class="actions-cell">
        <button class="btn btn-danger" onclick="handleDelete('${e.id}')">🗑 Delete</button>
      </td>
    </tr>
  `).join("");
}

function handleDelete(id) {
  if (!confirm("Delete this expense?")) return;
  deleteExpense(id);
  const catSel = document.getElementById("catFilter");
  renderTable(getExpenses(), catSel ? catSel.value : "All");
  renderChart(getExpenses());
  // refresh stats
  const expenses = getExpenses();
  const now = new Date();
  const monthly = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  document.getElementById("statTotal").textContent  = formatCurrency(expenses.reduce((s,e)=>s+parseFloat(e.amount),0));
  document.getElementById("statMonth").textContent  = formatCurrency(monthly.reduce((s,e)=>s+parseFloat(e.amount),0));
  document.getElementById("statCount").textContent  = expenses.length + " entries";
  showToast("Expense deleted.");
}

// ── ADD EXPENSE ──────────────────────
function initAddExpense() {
  const user = requireAuth();
  if (!user) return;

  document.getElementById("sidebar").innerHTML = renderSidebar("add-expense");

  const catSel = document.getElementById("expCategory");
  CATEGORIES.forEach(c => {
    const opt = document.createElement("option"); opt.value = c; opt.textContent = c;
    catSel.appendChild(opt);
  });

  // Set today's date
  document.getElementById("expDate").value = new Date().toISOString().split("T")[0];

  const form = document.getElementById("addExpenseForm");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const name     = document.getElementById("expName").value.trim();
    const amount   = parseFloat(document.getElementById("expAmount").value);
    const category = document.getElementById("expCategory").value;
    const date     = document.getElementById("expDate").value;
    const note     = document.getElementById("expNote").value.trim();

    if (!name || !amount || !category || !date) {
      showToast("Please fill all required fields.", "error"); return;
    }
    if (amount <= 0) {
      showToast("Amount must be greater than 0.", "error"); return;
    }

    addExpense({ name, amount, category, date, note });
    showToast("Expense added successfully! ✨");
    form.reset();
    document.getElementById("expDate").value = new Date().toISOString().split("T")[0];
  });
}

// ── AUTO-INIT based on page ──────────
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "login")       initLogin();
  if (page === "dashboard")   initDashboard();
  if (page === "add-expense") initAddExpense();
});
