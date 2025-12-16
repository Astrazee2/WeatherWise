let currentPage = 1;
const pageSize = 5;

const suppliersTableBody = document.querySelector('.suppliers-table tbody');
let rows = [];
let filteredRows = [];
let selectedRow = null;
let isEditMode = false;

// Buttons
const addbtn = document.getElementById('addSupplierBtn');
const modal_container = document.getElementById('modal_container');
const editBtn = document.getElementById("editRowBtn");
const deleteBtn = document.getElementById("deleteRowBtn");
const closebtn = document.getElementById('closebtn');
const savebtn = document.getElementById('savebtn');
const addSupplierForm = document.getElementById('addSupplierForm');
const searchInput = document.querySelector('header input[placeholder*="Search"]');

addbtn.addEventListener('click', () => modal_container.classList.add('show'));
closebtn.addEventListener('click', () => modal_container.classList.remove('show'));

// Attach click event to a row
function attachRowClick(tr) {
  tr.addEventListener("click", () => {
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
}

// Initialize click listeners for existing rows (Flask-rendered)
function initExistingRows() {
  rows = Array.from(suppliersTableBody.querySelectorAll('tr'));
  rows.forEach(attachRowClick);
    filteredRows = [...rows];
  renderTable(currentPage);
}

// Load suppliers from backend
async function loadSuppliers() {
  try {
    const response = await fetch('/get_suppliers');
    const data = await response.json();
    suppliersTableBody.innerHTML = '';

    if (data.length === 0) {
      suppliersTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No suppliers found.</td></tr>`;
      rows = [];
      filteredRows = [];
      renderTable(currentPage);
      return;
    }

    data.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.supplierID}</td>
        <td>${item.supplierName}</td>
        <td>${item.contactPerson}</td>
        <td>${item.email}</td>
        <td>${item.phone}</td>
        <td>${item.address}</td>
      `;
      attachRowClick(tr);
      suppliersTableBody.appendChild(tr);
    });

    // Update rows and filteredRows AFTER loading data
    rows = Array.from(suppliersTableBody.querySelectorAll('tr'));
    filteredRows = [...rows];

    // Only now attach search listener if it exists
    if (searchInput && !searchInput.dataset.listenerAttached) {
      searchInput.dataset.listenerAttached = "true"; // prevent double attaching
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        filteredRows = rows.filter(row => {
          const text = Array.from(row.cells).map(td => td.textContent.toLowerCase()).join(' ');
          return text.includes(query);
        });
        currentPage = 1;
        renderTable(currentPage);
      });
    }

    renderTable(currentPage);
  } catch (err) {
    console.error('Error loading suppliers:', err);
  }
}


// Pagination
function renderTable(page = 1) {
  if (filteredRows.length === 0) {
    suppliersTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No suppliers found.</td></tr>`;
    document.querySelector('.page-info').textContent = `Page 0 of 0`;
    return;
  }

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  rows.forEach(row => row.style.display = 'none'); // hide all rows
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  filteredRows.slice(start, end).forEach(row => row.style.display = '');
  document.querySelector('.page-info').textContent = `Page ${page} of ${totalPages}`;
}

// Search suppliers
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    filteredRows = rows.filter(row => {
      const text = Array.from(row.cells).map(td => td.textContent.toLowerCase()).join(' ');
      return text.includes(query);
    });
    currentPage = 1;
    renderTable(currentPage);
  });
}

document.getElementById('nextBtn').onclick = () => {
  const totalPages = Math.ceil(filteredRows.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderTable(currentPage);
  }
};
document.getElementById('prevBtn').onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable(currentPage);
  }
};

// Edit supplier
editBtn.addEventListener("click", () => {
  if (!selectedRow) { alert("Please select a row first."); return; }

  isEditMode = true;    
  modal_container.classList.add('show');
  document.getElementById('supplierName').value = selectedRow.cells[1].textContent;
  document.getElementById('contactPerson').value = selectedRow.cells[2].textContent;
  document.getElementById('email').value = selectedRow.cells[3].textContent;
  document.getElementById('phone').value = selectedRow.cells[4].textContent;
  document.getElementById('address').value = selectedRow.cells[5].textContent;
});

// Delete supplier
deleteBtn.addEventListener("click", async () => {
  if (!selectedRow) { alert("Please select a row first."); return; }

  const supplierID = selectedRow.cells[0].textContent;
  if (!confirm(`Are you sure you want to delete supplier ID: ${supplierID}?`)) return;

  try {
    const response = await fetch(`/delete_supplier/${supplierID}`, { method: "DELETE" });
    if (response.ok) {
      alert("Deleted successfully!");
      selectedRow = null;
      editBtn.style.display = "none";
      deleteBtn.style.display = "none";
      await loadSuppliers();
    } else { alert("Failed to delete row."); }
  } catch (err) { console.error(err); alert("Error deleting row."); }
});

// Save or update supplier
savebtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const data = {
    supplierName: document.getElementById('supplierName').value,
    contactPerson: document.getElementById('contactPerson').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value
  };

  if (!data.supplierName || !data.contactPerson || !data.email) {
    alert('Please fill in all required fields.');
    return;
  }

  try {
    let url = '/add_supplier', method = 'POST';
    if (isEditMode && selectedRow) {
      url = `/update_supplier/${selectedRow.cells[0].textContent}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });

    if (response.ok) {  
      alert(isEditMode ? 'Supplier updated successfully!' : 'Supplier added successfully!');
      modal_container.classList.remove('show');
      addSupplierForm.reset();
      selectedRow = null;
      editBtn.style.display = 'none';
      deleteBtn.style.display = 'none';
      isEditMode = false;
      await loadSuppliers();
    } else { alert('Failed to save supplier.'); }
  } catch (err) { console.error(err); alert('Error saving supplier.'); }
});

// Download CSV
document.addEventListener("DOMContentLoaded", () => {
  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      const csvRows = Array.from(suppliersTableBody.querySelectorAll("tr"));
      if (csvRows.length === 0) { alert("No supplier data available to download."); return; }

      const csv = ["SupplierID,SupplierName,ContactPerson,Email,Phone,Address"];
      csvRows.forEach(row => {
        const cells = Array.from(row.querySelectorAll("td")).map(td => td.textContent.trim());
        if (cells.length) csv.push(cells.join(","));
      });

      const blob = new Blob([csv.join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "suppliers_data.csv";
      a.click();
    });
  }

  loadSuppliers(); // fetch and populate table
});
