let currentPage = 1;
const pageSize = 5;
const ordersTableBody = document.querySelector(".orders-table tbody");
let rows = [];
let selectedRow = null;
let isEditMode = false;

// ================================
// Element references
// ================================
const addBtn = document.getElementById("newOrderBtn");
const newOrderModal = document.getElementById("newOrderModal");
const closeBtn = document.getElementById("closebtn");
const saveBtn = document.getElementById("savebtn");
const editBtn = document.getElementById("editRowBtn");
const deleteBtn = document.getElementById("deleteRowBtn");
const addOrderForm = document.getElementById("newOrderForm");
const searchInput = document.querySelector('header input[placeholder*="Search"]');

// ================================
// Open/Close modals
// ================================
addBtn.addEventListener("click", () => newOrderModal.classList.add("show"));
closeBtn.addEventListener("click", () => newOrderModal.classList.remove("show"));

// ================================
// Load orders
// ================================
async function loadOrders() {
  try {
    const response = await fetch("/load_schedules");
    const data = await response.json();
    ordersTableBody.innerHTML = "";

    if (!data.length) {
      ordersTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No orders found.</td></tr>`;
      return;
    }

    // Count totals
    let totalOTW = 0, totalReturned = 0, totalDelivered = 0;
    data.forEach((item) => {
      const status = item.schedStatus?.trim().toLowerCase();
      if (status === "on the way") totalOTW++;
      else if (status === "returned") totalReturned++;
      else if (status === "delivered") totalDelivered++;
    });
    document.getElementById("totalOTW").textContent = totalOTW;
    document.getElementById("totalReturned").textContent = totalReturned;
    document.getElementById("totalDelivered").textContent = totalDelivered;
    document.getElementById("totalOrders").textContent = data.length;

    // Render each order
    data.forEach((item) => {
      const tr = document.createElement("tr");
      let nextBtn = "";
      if (item.schedStatus === "On the way") {
        nextBtn = `<button class="cycle-btn" data-next="Delivered">Mark Delivered</button>`;
      } else if (item.schedStatus === "Delivered") {
        nextBtn = `<button class="cycle-btn" data-next="Returned">Mark Returned</button>`;
      } else if (item.schedStatus === "Returned") {
        nextBtn = `<button class="cycle-btn" data-next="On the way">Mark On the Way</button>`;
      }

      tr.innerHTML = `
        <td>${item.scheduleID}</td>
        <td>${item.productID}</td>
        <td>${item.supplierID}</td>
        <td>${item.prodName}</td>
        <td>${item.orderQuantity}</td>
        <td>${item.buyingPrice}</td>
        <td>${item.deliveryDate}</td>
        <td>${item.schedStatus}</td>
        <td class="actions">
          <button class="view-btn">View</button>
          <button class="edit-btn">Edit</button>
          ${nextBtn}
          <button class="delete-btn">Delete</button>
        </td>
      `;

      ordersTableBody.appendChild(tr);

      // Row selection
      tr.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON") return;
        if (selectedRow === tr) {
          tr.classList.remove("selected");
          selectedRow = null;
          editBtn.style.display = "none";
          deleteBtn.style.display = "none";
        } else {
          if (selectedRow) selectedRow.classList.remove("selected");
          selectedRow = tr;
          tr.classList.add("selected");
          editBtn.style.display = "inline-block";
          deleteBtn.style.display = "inline-block";
        }
      });

      // View
      tr.querySelector(".view-btn").addEventListener("click", () => showOrderDetails(item));

      // Edit
      tr.querySelector(".edit-btn").addEventListener("click", () => {
        isEditMode = true;
        selectedRow = tr;
        newOrderModal.classList.add("show");
        document.getElementById("productID").value = item.productID;
        document.getElementById("supplierID").value = item.supplierID;
        document.getElementById("orderQuantity").value = item.orderQuantity;
        document.getElementById("buyingPrice").value = item.buyingPrice;
        document.getElementById("deliveryDate").value = item.deliveryDate;
        document.getElementById("status").value = item.schedStatus;
      });

      // Delete
      tr.querySelector(".delete-btn").addEventListener("click", async () => {
        if (!confirm(`Delete schedule ID ${item.scheduleID}?`)) return;
        try {
          const res = await fetch(`/delete_schedule/${item.scheduleID}`, { method: "DELETE" });
          if (res.ok) {
            alert("Deleted successfully!");
            await loadOrders();
          } else alert("Failed to delete order.");
        } catch (err) {
          console.error(err);
          alert("Error deleting order.");
        }
      });

      // Cycle (status change)
      tr.querySelector(".cycle-btn")?.addEventListener("click", async (e) => {
        const nextStatus = e.target.getAttribute("data-next");
        if (!confirm(`Change status of schedule ID ${item.scheduleID} to "${nextStatus}"?`)) return;
        const normalizedDate = (() => {
          const d = new Date(item.deliveryDate);
          if (!isNaN(d)) return d.toISOString().split("T")[0];
          const match = item.deliveryDate.match(/\d{4}-\d{2}-\d{2}/);
          return match ? match[0] : item.deliveryDate;
        })();
        try {
          let endpoint = "";
          if (nextStatus === "Delivered") endpoint = `/mark_delivered/${item.scheduleID}`;
          else if (nextStatus === "Returned") endpoint = `/mark_returned/${item.scheduleID}`;
          else if (nextStatus === "On the way") endpoint = `/mark_ontheway/${item.scheduleID}`;
          if (!endpoint) return;
          const res = await fetch(endpoint, { method: "POST" });
          if (res.ok) {
            alert(`Status changed to "${nextStatus}"`);
            await loadOrders();
          } else alert("Failed to update status.");
        } catch (err) {
          console.error(err);
          alert("Error updating status.");
        }
      });
    });

    // Set rows and initial visibility
    rows = Array.from(ordersTableBody.querySelectorAll("tr"));
    rows.forEach(row => row.dataset.visible = "true"); // All rows visible by default
    renderOrdersTable(currentPage); // Initial render
  } catch (err) {
    console.error("Error loading orders:", err);
  }
}

// ================================
// Save or update order
// ================================
saveBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const data = {
    productID: document.getElementById("productID").value,
    supplierID: document.getElementById("supplierID").value,
    orderQuantity: document.getElementById("orderQuantity").value,
    buyingPrice: document.getElementById("buyingPrice").value,
    deliveryDate: document.getElementById("deliveryDate").value,
    schedStatus: document.getElementById("status")?.value || "On the way",
  };
  if (Object.values(data).some((v) => !v)) {
    alert("Please fill in all required fields.");
    return;
  }
  try {
    let url = "/add_schedule";
    let method = "POST";
    if (isEditMode && selectedRow) {
      const scheduleID = selectedRow.cells[0].textContent;
      url = `/update_schedule/${scheduleID}`;
      method = "PUT";
    }
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      alert(isEditMode ? "Order updated successfully!" : "Order added!");
      newOrderModal.classList.remove("show");
      addOrderForm.reset();
      selectedRow = null;
      editBtn.style.display = "none";
      deleteBtn.style.display = "none";
      isEditMode = false;
      await loadOrders();
    } else alert("Failed to save order.");
  } catch (err) {
    console.error(err);
    alert("Error saving order.");
  }
});

// ================================
// Pagination
// ================================
function renderOrdersTable(page = 1) {
  const visibleRows = rows.filter(r => r.dataset.visible !== "false");
  const totalRows = visibleRows.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;

  // Hide all rows first
  rows.forEach(row => row.style.display = "none");

  // Show only current page of visible rows
  visibleRows.slice((page - 1) * pageSize, page * pageSize).forEach(row => row.style.display = "");

  document.querySelector(".page-info").textContent = `Page ${page} of ${totalPages}`;
}

document.getElementById("nextBtn").onclick = () => {
  const visibleRows = rows.filter(r => r.dataset.visible !== "false");
  if (currentPage * pageSize < visibleRows.length) {
    currentPage++;
    renderOrdersTable(currentPage);
  }
};
document.getElementById("prevBtn").onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderOrdersTable(currentPage);
  }
};

// ================================
// Combined Search & Filter Logic
// ================================
function applySearchAndFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const statusVal = document.getElementById("statusFilter")?.value || "";
  const qtyCond = document.getElementById("orderQtyCondition")?.value || "";
  const qtyVal = parseFloat(document.getElementById("orderQtyValue")?.value || "0");
  const priceCond = document.getElementById("priceCondition")?.value || "";
  const priceVal = parseFloat(document.getElementById("priceValue")?.value || "0");
  const supplierVal = document.getElementById("supplierFilter")?.value || "";

  rows.forEach(row => {
    const scheduleID = row.cells[0]?.textContent.toLowerCase();
    const productID = row.cells[1]?.textContent.toLowerCase();
    const supplierID = row.cells[2]?.textContent.toLowerCase();
    const prodName = row.cells[3]?.textContent.toLowerCase();
    const orderQty = parseFloat(row.cells[4]?.textContent || "0");
    const buyingPrice = parseFloat(row.cells[5]?.textContent || "0");
    const status = row.cells[7]?.textContent.toLowerCase();

    let show = true;

    // Search
    if (query && !(
        scheduleID.includes(query) ||
        productID.includes(query) ||
        supplierID.includes(query) ||
        prodName.includes(query) ||
        orderQty.toString().includes(query) ||
        buyingPrice.toString().includes(query) ||
        status.includes(query)
    )) show = false;

    // Filters
    if (statusVal && status !== statusVal.toLowerCase()) show = false;
    if (qtyCond === "gt" && !(orderQty > qtyVal)) show = false;
    if (qtyCond === "lt" && !(orderQty < qtyVal)) show = false;
    if (priceCond === "gt" && !(buyingPrice > priceVal)) show = false;
    if (priceCond === "lt" && !(buyingPrice < priceVal)) show = false;
    if (supplierVal && supplierID !== supplierVal.toLowerCase()) show = false;

    row.dataset.visible = show ? "true" : "false";
  });

  currentPage = 1;
  renderOrdersTable(currentPage);
}

// Live search
if (searchInput) {
  searchInput.addEventListener('input', applySearchAndFilters);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applySearchAndFilters();
    }
  });
}

// ================================
// Filters Popup
// ================================
const filtersBtn = document.getElementById("filtersBtn");
const filtersPopup = document.getElementById("filtersPopup");
const applyFiltersBtn = document.getElementById("applyFilters");
const clearFiltersBtn = document.getElementById("clearFilters");

filtersBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  filtersPopup.classList.toggle("active");
});

document.addEventListener("click", (e) => {
  if (!filtersPopup.contains(e.target) && e.target !== filtersBtn) {
    filtersPopup.classList.remove("active");
  }
});

// Apply Filters
applyFiltersBtn.addEventListener("click", () => {
  applySearchAndFilters(); // Re-run combined logic
  filtersPopup.classList.remove("active");
});

// Clear Filters
clearFiltersBtn.addEventListener("click", () => {
  document.getElementById("statusFilter").value = "";
  document.getElementById("orderQtyCondition").value = "";
  document.getElementById("orderQtyValue").value = "";
  document.getElementById("priceCondition").value = "";
  document.getElementById("priceValue").value = "";
  document.getElementById("supplierFilter").value = "";
  if (searchInput) searchInput.value = ""; // Also clear search
  rows.forEach(r => r.dataset.visible = "true"); // Reset visibility
  currentPage = 1;
  renderOrdersTable(currentPage);
  filtersPopup.classList.remove("active");
});

// ================================
// Order History
// ================================
const orderHistoryBtn = document.getElementById("orderHistoryBtn");
const orderHistoryModal = document.getElementById("orderHistoryModal");
const closeOrderHistoryBtn = document.getElementById("closeOrderHistory");

orderHistoryBtn.addEventListener("click", async () => {
  orderHistoryModal.style.display = "block";
  const tbody = orderHistoryModal.querySelector("tbody");
  tbody.innerHTML = "";

  try {
    const res = await fetch("/order_history");
    const data = await res.json();
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No order history.</td></tr>`;
      return;
    }
    data.forEach((order) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${order.scheduleID}</td>
        <td>${order.productID}</td>
        <td>${order.supplierID}</td>
        <td>${order.createdDate}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading order history:", err);
  }
});

closeOrderHistoryBtn.addEventListener("click", () => {
  orderHistoryModal.style.display = "none";
});

// ================================
// Download Orders
// ================================
const downloadBtn = document.getElementById("downloadOrdersBtn");
downloadBtn.addEventListener("click", () => {
  const csv = ["ScheduleID,ProductID,SupplierID,ProductName,OrderQty,BuyingPrice,DeliveryDate,Status"];
  const visibleRows = rows.filter(r => r.dataset.visible !== "false");
  visibleRows.forEach((row) => {
    const values = Array.from(row.cells).slice(0, 8).map((td) => td.textContent.trim());
    csv.push(values.join(","));
  });
  const blob = new Blob([csv.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "orders.csv";
  a.click();
  URL.revokeObjectURL(a.href);
});

// ================================
// Show order details
// ================================
function showOrderDetails(order) {
  const modal = document.getElementById("orderDetailsModal");
  const content = document.getElementById("orderDetailsContent");
  const pricePerProduct = order.orderQuantity > 0 ? (order.buyingPrice / order.orderQuantity).toFixed(2) : "N/A";

  content.innerHTML = `
    <p><strong>Product Name:</strong> ${order.prodName}</p>
    <p><strong>Quantity:</strong> ${order.orderQuantity}</p>
    <p><strong>Price per Product:</strong> ₱${pricePerProduct}</p>
    <p><strong>Category:</strong> ${order.category}</p>
    <p><strong>Date of Delivery:</strong> ${order.deliveryDate}</p>
  `;
  modal.classList.add("show");
}

document.getElementById("closeDetailsModal").addEventListener("click", () =>
  document.getElementById("orderDetailsModal").classList.remove("show")
);

// ================================
// Initialize
// ================================
document.addEventListener("DOMContentLoaded", async () => {
  await loadOrders();
});
