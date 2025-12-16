// static/js/dashboard.js
// Responsible for fetching dashboard aggregates and rendering charts/tables
document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
});

let salesChart = null;
let orderChart = null;

async function initDashboard() {
  await loadStats();
  await loadInventoryTable();
  await loadTopSellingTable();
  await loadRecentOrders();
  await drawCharts();
  // refresh periodically every 60 seconds (optional)
  setInterval(() => {
    loadStats();
    loadInventoryTable();
    loadRecentOrders();
    updateCharts();
  }, 60000);
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

async function loadStats() {
  try {
    const data = await fetchJSON("/dashboard_stats");
    // Update cards
    document.querySelector("#card-revenue .value").textContent = formatCurrency(data.revenue || 0);
    document.querySelector("#card-profit .value").textContent = formatCurrency(data.profit_estimate || 0);
    document.querySelector("#card-inventory .value").textContent = (data.total_inventory_items || 0) + " units";
    document.querySelector("#card-products .value").textContent = (data.top_selling?.length || 0) + " top items";

    // small stat details
    document.querySelector("#card-revenue .meta").textContent = `${data.ai_forecast_count || 0} forecasts`;
    document.querySelector("#card-inventory .meta").textContent = `${data.low_stock_count || 0} low-stock items`;

    // fill top selling list (sidebar widget)
    populateTopSellingList(data.top_selling || []);
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}

function formatCurrency(n) {
  // Format numeric values to a nice currency-like string (no locale dependence)
  return "₱" + Number(n || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function populateTopSellingList(items) {
  const tbody = document.querySelector("#top-selling-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Sort by sold descending (optional, keeps “top” on top)
  const sorted = [...items].sort((a, b) => b.sold - a.sold);

  sorted.forEach(it => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(it.product || "Unknown")}</td>
      <td>${it.sold}</td>
    `;
    tbody.appendChild(tr);
  });
}


async function loadInventoryTable() {
  try {
    const inventory = await fetchJSON("/get_inventory");
    const t = document.querySelector("#inventory-table tbody");
    if (!t) return;
    t.innerHTML = "";
    inventory.slice(0, 8).forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(row.productName || "N/A")}</td>
        <td>${row.quantity ?? 0} ${escapeHtml(row.unit || "")}</td>
        <td>${row.minThreshold ?? ""}</td>
        <td>${row.lastUpdated ?? ""}</td>
      `;
      t.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading inventory:", err);
  }
}

async function loadTopSellingTable() {
  // top selling is included in /api/dashboard_stats; we already populate a small list,
  // but if you want a full table, call /api/dashboard_stats again or re-use previously fetched object
}

async function loadRecentOrders() {
  try {
    const ord = await fetchJSON("/order_history");
    const t = document.querySelector("#recent-orders tbody");
    if (!t) return;
    t.innerHTML = "";
    ord.slice(0, 8).forEach(r => {
      const prodName = r.prodName || "Unknown";  // Use prodName from backend, fallback if missing
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(prodName)}</td>
        <td>${r.createdDate || ""}</td>
      `;
      t.appendChild(tr);
    });
  } catch (err) {
    console.error("Error fetching recent orders:", err);
  }
}

async function drawCharts() {
  // Sales Chart - example uses order_history to build time-series
  try {
    const orders = await fetchJSON("/order_history");
    const labels = orders.slice(0, 12).map(o => o.createdDate || "");
    const values = orders.slice(0, 12).map(o => Number(o.productID || 0)); // placeholder: productID as numeric value
    const ctx = document.getElementById("salesChart").getContext("2d");
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels.reverse(),
        datasets: [{
          label: "Orders (recent)",
          data: values.reverse(),
          fill: false,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true }
        }
      }
    });
  } catch (err) {
    console.error("Error drawing sales chart:", err);
  }

  // Order Summary Chart - distribution of statuses from schedules
  try {
    const res = await fetchJSON("/load_schedules");
    const statusCounts = {};
    res.forEach(r => {
      const s = r.schedStatus || "Unknown";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);

    const ctx2 = document.getElementById("orderChart").getContext("2d");
    if (orderChart) orderChart.destroy();
    orderChart = new Chart(ctx2, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          label: "Order Status",
          data: data,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });
  } catch (err) {
    console.error("Error drawing order chart:", err);
  }
}

async function updateCharts() {
  // simple wrapper to redraw charts (could be more efficient by updating data)
  await drawCharts();
}

// minimal escaping utility
function escapeHtml(unsafe) {
  if (unsafe == null) return "";
  return unsafe.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
