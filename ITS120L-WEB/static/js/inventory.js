let currentPage = 1;
const pageSize = 5;
const tableBody = document.querySelector("#inventoryTable tbody");
let rows = [];
let isEditMode = false;
let selectedRow = null;

// ================================
// 🟢 Fetch Inventory Data
// ================================
async function loadInventory() {
  try {
    const response = await fetch("/get_inventory");
    const data = await response.json();

    tableBody.innerHTML = "";

    if (!data || data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#777;">No inventory data available.</td></tr>`;
      document.getElementById("totalProducts").textContent = 0;
      return;
    }

    // Count totals
    const uniqueProducts = new Set(data.map(item => item.productID));
    document.getElementById("totalProducts").textContent = uniqueProducts.size;

    let surplusCount = 0, deficitCount = 0;
    data.forEach(item => {
      const qty = parseFloat(item.quantity);
      const minT = parseFloat(item.minThreshold);
      const maxT = parseFloat(item.maxThreshold);
      if (!isNaN(qty) && !isNaN(minT) && !isNaN(maxT)) {
        if (qty > maxT) surplusCount++;
        else if (qty < minT) deficitCount++;
      }
    });

    document.getElementById("surplusCount").textContent = surplusCount;
    document.getElementById("deficitCount").textContent = deficitCount;

    // Build table rows
    data.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.inventoryID}</td>
        <td>${item.productID}</td>
        <td>${item.supplierID}</td>
        <td>${item.productName}</td>
        <td>${item.category}</td>
        <td>${item.quantity}</td>
        <td>${item.unit}</td>
        <td>${item.minThreshold}</td>
        <td>${item.maxThreshold}</td>
        <td>${item.lastUpdated || 'N/A'}</td>
      `;

      // Row selection for edit/delete
      tr.addEventListener("click", () => {
        if (selectedRow === tr) {
          tr.classList.remove("selected");
          selectedRow = null;
          editBtn.style.display = "none";
          deleteBtn.style.display = "none";
        } else {
          if (selectedRow) selectedRow.classList.remove("selected");
          tr.classList.add("selected");
          selectedRow = tr;
          editBtn.style.display = "inline-block";
          deleteBtn.style.display = "inline-block";
        }
      });

      tableBody.appendChild(tr);
    });

    rows = Array.from(tableBody.querySelectorAll("tr"));
    renderTable(currentPage);
  } catch (err) {
    console.error("Error loading inventory:", err);
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Failed to load inventory data.</td></tr>`;
  }

  rows = Array.from(tableBody.querySelectorAll("tr"));
  rows.forEach(row => row.dataset.visible = "true"); // all rows visible by default
  renderTable(currentPage);

}

// ================================
// 🟢 Pagination
// ================================
function renderTable(page = 1) {
  const visibleRows = rows.filter(r => r.dataset.visible !== "false");
  const totalRows = visibleRows.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;

  // Hide all rows first
  rows.forEach(row => row.style.display = "none");

  // Show only current page of visible rows
  visibleRows.slice((page - 1) * pageSize, page * pageSize)
             .forEach(row => row.style.display = "");

  document.getElementById("pageInfo").textContent = `Page ${page} of ${totalPages}`;
}


// ================================
// 🟢 Modal Controls
// ================================
const modal = document.getElementById('modal_container');
const addBtn = document.getElementById('addbtn');
const closeBtn = document.getElementById('closebtn');
const saveBtn = document.getElementById('savebtn');
const addProdForm = document.getElementById('addProdForm');

addBtn.addEventListener('click', () => {
  isEditMode = false;
  addProdForm.reset();
  modal.classList.add('show');
});

closeBtn.addEventListener('click', () => {
  modal.classList.remove('show');
});

// ================================
// 🟢 Add / Update Inventory
// ================================
saveBtn.addEventListener('click', async (e) => {
  e.preventDefault();

  const data = {
    supplierID: document.getElementById('supplierID').value,
    prodName: document.getElementById('prodName').value,
    category: document.getElementById('category').value,
    unit: document.getElementById('unit').value,
    quantity: document.getElementById('quantity').value,
    minThreshold: document.getElementById('minThreshold').value,
    maxThreshold: document.getElementById('maxThreshold').value
  };

  if (!data.prodName || !data.quantity || !data.unit || !data.category) {
    alert("Please fill in all required fields.");
    return;
  }

  try {
    const url = isEditMode ? `/update_inventory/${selectedRow.cells[0].textContent}` : "/add_inventory";
    const method = isEditMode ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      alert(isEditMode ? "Inventory updated successfully!" : "Product added successfully!");
      modal.classList.remove('show');
      await loadInventory();
    } else {
      alert("Failed to save product.");
    }
  } catch (err) {
    console.error(err);
    alert("Error saving product.");
  }
});

// ================================
// 🟢 Edit Inventory
// ================================
const editBtn = document.getElementById("editRowBtn");
editBtn.addEventListener("click", () => {
  if (!selectedRow) return alert("Select a row first.");
  isEditMode = true;
  modal.classList.add('show');

  // Prefill modal
  document.getElementById('supplierID').value = selectedRow.cells[2].textContent;
  document.getElementById('prodName').value = selectedRow.cells[3].textContent;
  document.getElementById('category').value = selectedRow.cells[4].textContent;
  document.getElementById('quantity').value = selectedRow.cells[5].textContent;
  document.getElementById('unit').value = selectedRow.cells[6].textContent;
  document.getElementById('minThreshold').value = selectedRow.cells[7].textContent;
  document.getElementById('maxThreshold').value = selectedRow.cells[8].textContent;
});

// ================================
// 🟢 Delete Inventory
// ================================
const deleteBtn = document.getElementById("deleteRowBtn");
deleteBtn.addEventListener("click", async () => {
  if (!selectedRow) return alert("Select a row first.");
  const id = selectedRow.cells[0].textContent;
  if (!confirm(`Delete Inventory ID ${id}?`)) return;

  try {
    const res = await fetch(`/delete_inventory/${id}`, { method: "DELETE" });
    if (res.ok) {
      alert("Deleted successfully!");
      selectedRow = null;
      editBtn.style.display = "none";
      deleteBtn.style.display = "none";
      await loadInventory();
    } else {
      alert("Failed to delete.");
    }
  } catch (err) {
    console.error(err);
  }
});

// ================================
// 🟢 Download CSV
// ================================
document.querySelector(".download-btn").addEventListener("click", () => {
  const csv = ["InventoryID,ProductID,SupplierID,ProductName,Category,Quantity,Unit,MinThreshold,MaxThreshold,LastUpdated"];
  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll("td")).map(td => td.textContent.trim());
    csv.push(cells.join(","));
  });

  const blob = new Blob([csv.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "inventory_data.csv";
  a.click();
  URL.revokeObjectURL(a.href);
});

// ===== inventory.js (filter-related updates + helpers) =====

// predefined lists (you can expand later)
const PREDEFINED_CATEGORIES = [
  "Snacks", "Fruits", "Vegetables", "Beverages", "Dairy",
  "Meat", "Condiments", "Bakery", "Frozen"
];

const PREDEFINED_UNITS = [
  "pcs", "kg", "g", "L", "ml", "packs", "boxes", "bottles", "trays"
];

// element refs for filters
const filtersBtn = document.getElementById("filtersBtn");
const filtersPopup = document.getElementById("filtersPopup");
const categorySelect = document.getElementById("categoryFilter");
const unitSelect = document.getElementById("unitFilter");
const supplierSelect = document.getElementById("supplierFilter");
const applyBtn = document.getElementById("applyFilters");
const clearBtn = document.getElementById("clearFilters");

// safe guards — if any element is missing, silently return
if (filtersBtn && filtersPopup && categorySelect && unitSelect && supplierSelect) {
  // populate category and unit selects with predefined options
  function populateStaticFilters() {
    // categories
    categorySelect.innerHTML = '<option value="">All</option>';
    PREDEFINED_CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });

    // units
    unitSelect.innerHTML = '<option value="">All</option>';
    PREDEFINED_UNITS.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      unitSelect.appendChild(opt);
    });
  }

  // populate suppliers from backend
  async function populateSuppliers() {
    supplierSelect.innerHTML = '<option value="">All</option>';
    try {
      const res = await fetch('/get_suppliers');
      if (!res.ok) return;
      const data = await res.json();
      // data expected: [{supplierID, supplierName, ...}, ...]
      data.forEach(s => {
        const opt = document.createElement('option');
        opt.value = String(s.supplierID);
        opt.textContent = `${s.supplierID} — ${s.supplierName}`;
        supplierSelect.appendChild(opt);
      });
    } catch (err) {
      console.warn('Failed to load suppliers for filter', err);
    }
  }

    // toggling
    filtersBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      filtersPopup.classList.toggle('active');
    });

  // apply filter logic: hides rows not matching
  applyBtn.addEventListener('click', () => {
    const selectedCategory = categorySelect.value;
    const selectedUnit = unitSelect.value;
    const selectedSupplier = supplierSelect.value; // supplierID string or empty
    const qtyCond = document.getElementById("qtyCondition").value;
    const qtyVal = parseFloat(document.getElementById("qtyValue").value);

    // iterate rows in the rendered table (DOM)
    document.querySelectorAll("#inventoryTable tbody tr").forEach(row => {
      // cells indexes in your table:
      // 0 inventoryID, 1 productID, 2 supplierID, 3 prodName, 4 category, 5 quantity, 6 unit, ...
      const category = row.cells[4]?.textContent.trim() || "";
      const unit = row.cells[6]?.textContent.trim() || "";
      const supplierID = (row.cells[2]?.textContent || "").trim();
      const quantity = parseFloat(row.cells[5]?.textContent || "0");

      let show = true;

      if (selectedCategory && category !== selectedCategory) show = false;
      if (selectedUnit && unit !== selectedUnit) show = false;
      if (selectedSupplier && supplierID !== selectedSupplier) show = false;

      if (qtyCond && !isNaN(qtyVal)) {
        if (qtyCond === 'gt' && !(quantity > qtyVal)) show = false;
        if (qtyCond === 'lt' && !(quantity < qtyVal)) show = false;
      }

      row.style.display = show ? "" : "none";
    });
filtersPopup.classList.remove('active');
  });

  clearBtn.addEventListener('click', () => {
    categorySelect.value = "";
    unitSelect.value = "";
    supplierSelect.value = "";
    document.getElementById("qtyCondition").value = "";
    document.getElementById("qtyValue").value = "";
    document.querySelectorAll("#inventoryTable tbody tr").forEach(r => r.style.display = "");
    filtersPopup.classList.remove('active');
  });

  // initialize static and supplier options immediately and whenever you reload inventory
  populateStaticFilters();
  populateSuppliers();

  // expose a function to refresh suppliers from other code if needed
  window.refreshSupplierFilter = populateSuppliers;
}

// Close filter popup when clicking outside
document.addEventListener("click", (e) => {
  if (!filtersPopup.contains(e.target) && !filtersBtn.contains(e.target)) {
    filtersPopup.classList.remove("active");
  }
});


// ================================
// 🟢 Combined Search & Filter Logic
// ================================
const searchInput = document.querySelector('header input[placeholder*="Search"]');

function applySearchAndFilters() {
  const query = searchInput.value.trim().toLowerCase();

  const selectedCategory = categorySelect?.value.toLowerCase();
  const selectedUnit = unitSelect?.value.toLowerCase();
  const selectedSupplier = supplierSelect?.value.toLowerCase();
  const qtyCond = document.getElementById("qtyCondition")?.value;
  const qtyVal = parseFloat(document.getElementById("qtyValue")?.value);

  // Filter rows and return only visible rows
  rows.forEach(row => {
    const inventoryID = row.cells[0]?.textContent.toLowerCase();
    const productID = row.cells[1]?.textContent.toLowerCase();
    const supplierID = row.cells[2]?.textContent.toLowerCase();
    const productName = row.cells[3]?.textContent.toLowerCase();
    const category = row.cells[4]?.textContent.toLowerCase();
    const quantity = parseFloat(row.cells[5]?.textContent || "0");
    const unit = row.cells[6]?.textContent.toLowerCase();

    let show = true;

    // Search
    if (query && !(
        inventoryID.includes(query) ||
        productID.includes(query) ||
        supplierID.includes(query) ||
        productName.includes(query) ||
        category.includes(query)
    )) show = false;

    // Filters
    if (selectedCategory && category !== selectedCategory) show = false;
    if (selectedUnit && unit !== selectedUnit) show = false;
    if (selectedSupplier && supplierID !== selectedSupplier) show = false;
    if (qtyCond && !isNaN(qtyVal)) {
      if (qtyCond === 'gt' && !(quantity > qtyVal)) show = false;
      if (qtyCond === 'lt' && !(quantity < qtyVal)) show = false;
    }

    row.dataset.visible = show ? "true" : "false"; // mark visible rows
  });

  // Update pagination based on visible rows
  currentPage = 1;
  renderTable(currentPage);
}


// Search input live filter
if (searchInput) {
  searchInput.addEventListener('input', applySearchAndFilters);

  // Also trigger search on Enter key
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // prevent form submission if inside a form
      applySearchAndFilters();
    }
  });
}

// Apply button also uses combined logic
applyBtn.addEventListener('click', () => {
  applySearchAndFilters();
  filtersPopup.classList.remove('active');
});

// Clear button resets search + filters
clearBtn.addEventListener('click', () => {
  categorySelect.value = "";
  unitSelect.value = "";
  supplierSelect.value = "";
  document.getElementById("qtyCondition").value = "";
  document.getElementById("qtyValue").value = "";
  if (searchInput) searchInput.value = "";
  rows.forEach(r => r.style.display = "");
  filtersPopup.classList.remove('active');
  currentPage = 1;
  renderTable(currentPage);
});



// ================================
// 🟢 Initialize
// ================================
document.addEventListener("DOMContentLoaded", loadInventory);
