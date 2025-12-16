document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("storeProfileForm");
  const progressFill = document.querySelector(".progress-fill");
  const progressText = document.querySelector(".progress-text");

  // Load existing store data
  fetch("/get_store_profile")
    .then((res) => res.json())
    .then((data) => {
      if (!data) return;
      for (let key in data) {
        const el = document.querySelector(`[name=${key}]`);
        if (el && data[key] !== null) {
          el.value = data[key];
          if (key === "emailAddress") el.disabled = true;
        }
      }
      updateSidebarSummary();
      updateProgress();
    })
    .catch((err) => console.error("Error loading store profile:", err));

  // Save profile
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const json = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/update_store_profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const result = await res.json();
      alert(result.message || "Saved!");
      updateSidebarSummary(); // refresh sidebar after save
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile.");
    }
  });

  // Profile completion logic
  const requiredFields = form.querySelectorAll("[required]");
  requiredFields.forEach((f) =>
    f.addEventListener("input", () => {
      updateProgress();
      updateSidebarSummary();
    })
  );

  function updateProgress() {
    const filled = [...requiredFields].filter(
      (f) => f.value.trim() !== ""
    ).length;
    const total = requiredFields.length;
    const percent = Math.round((filled / total) * 100);
    progressFill.style.width = percent + "%";
    progressText.textContent = `${filled}/${total}`;
  }

  // --- NEW: Sidebar summary updater ---
  function updateSidebarSummary() {
    const storeName = document.getElementById("storeName").value.trim() || "—";
    const storeType =
      document.getElementById("storeType").options[
        document.getElementById("storeType").selectedIndex
      ].text || "—";
    const storeCode = document.getElementById("storeCode").value.trim() || "—";
    const branch =
      document.getElementById("branchLocation").value.trim() || "—";
    const first = document.getElementById("firstName").value.trim();
    const last = document.getElementById("lastName").value.trim();
    const manager = first || last ? `${first} ${last}`.trim() : "—";
    const contact =
      document.getElementById("contactNumber").value.trim() || "—";

    // --- Update name and type header ---
    document.getElementById("summaryStoreName").textContent = storeName;
    document.getElementById("summaryStoreType").textContent = storeType;

    // --- Update store details ---
    document.getElementById("summaryStoreCode").textContent = storeCode;
    document.getElementById("summaryBranchLocation").textContent = branch;
    document.getElementById("summaryManager").textContent = manager;
    document.getElementById("summaryContact").textContent = contact;
  }

  document.getElementById("resetBtn").addEventListener("click", async () => {
    if (!confirm("Reset all store info to default?")) return;
    const res = await fetch("/reset_store", { method: "POST" });
    const result = await res.json();
    alert(result.message);
    location.reload();
  });

  // --- DISCARD CHANGES (Revert to last saved data) ---
  document.getElementById("discardBtn").addEventListener("click", async () => {
    if (
      !confirm(
        "Discard all unsaved changes and revert to the last saved version?"
      )
    )
      return;

    try {
      const res = await fetch("/get_store_profile");
      const data = await res.json();

      if (!data) {
        alert("No store data found.");
        return;
      }

      // Refill form fields with DB data
      for (let key in data) {
        const el = document.querySelector(`[name=${key}]`);
        if (el) {
          el.value = data[key] || "";
        }
      }

      // Refresh sidebar + progress
      updateSidebarSummary();
      updateProgress();

      alert("Reverted to last saved version.");
    } catch (err) {
      console.error("Error discarding changes:", err);
      alert("Failed to discard changes.");
    }
  });

  // --- Export Store Data ---
  document
    .getElementById("exportDataBtn")
    .addEventListener("click", async () => {
      try {
        const res = await fetch("/export_store_data");
        if (!res.ok) throw new Error("Export failed");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "WeatherWise_StoreProfile.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        alert(
          "Failed to export store data, make sure all basic information fields are filled: "
        );
      }
    });
});
