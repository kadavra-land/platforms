const COLUMNS = ["cliente", "proyecto", "plataforma", "cuenta", "recurso", "ambiente", "descripcion"];

const body = document.getElementById("registry-body");
const errorEl = document.getElementById("error");
const dialog = document.getElementById("new-dialog");
const form = document.getElementById("new-form");
const filterInputs = document.querySelectorAll("[data-filter]");

let allRecords = [];
let editingId = null;
const filters = {};
const dialogTitle = dialog.querySelector("h2");
const submitBtn = form.querySelector('button[type="submit"]');

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function displayValue(record, column) {
  const value = record[column];
  if (column === "ambiente") {
    return Array.isArray(value) ? value.join(", ") : value;
  }
  return value;
}

function applyFilters(records) {
  return records.filter((r) =>
    COLUMNS.every((c) => {
      const term = (filters[c] || "").trim().toLowerCase();
      if (!term) return true;
      return String(displayValue(r, c) ?? "").toLowerCase().includes(term);
    })
  );
}

function render() {
  const records = applyFilters(allRecords);
  if (!records.length) {
    body.innerHTML = `<tr><td colspan="8">${allRecords.length ? "Sin resultados para este filtro." : "Sin registros todavía."}</td></tr>`;
    return;
  }
  body.innerHTML = records.map((r) => `
    <tr data-id="${escapeHtml(r.id)}">
      ${COLUMNS.map((c) => `<td>${escapeHtml(displayValue(r, c))}</td>`).join("")}
      <td class="row-actions">
        <button class="edit-btn" data-id="${escapeHtml(r.id)}">Editar</button>
        <button class="delete-btn" data-id="${escapeHtml(r.id)}">Borrar</button>
      </td>
    </tr>
  `).join("");
}

filterInputs.forEach((input) => {
  input.addEventListener("input", () => {
    filters[input.dataset.filter] = input.value;
    render();
  });
});

async function loadRegistry() {
  const res = await fetch("/api/registry");
  if (res.status === 401) {
    window.location.href = "/login.html";
    return;
  }
  if (!res.ok) {
    showError("No se pudo cargar el registro. Intenta de nuevo.");
    return;
  }
  clearError();
  allRecords = await res.json();
  render();
}

body.addEventListener("click", async (e) => {
  const deleteBtn = e.target.closest(".delete-btn");
  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    if (!confirm("¿Borrar este registro?")) return;
    deleteBtn.disabled = true;
    const res = await fetch(`/api/registry?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.status === 401) {
      window.location.href = "/login.html";
      return;
    }
    if (!res.ok) {
      showError("No se pudo borrar el registro.");
      deleteBtn.disabled = false;
      return;
    }
    await loadRegistry();
    return;
  }

  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    const record = allRecords.find((r) => r.id === editBtn.dataset.id);
    if (!record) return;
    openDialogForEdit(record);
  }
});

function openDialogForEdit(record) {
  editingId = record.id;
  form.reset();
  form.cliente.value = record.cliente || "";
  form.proyecto.value = record.proyecto || "";
  form.plataforma.value = record.plataforma || "";
  form.cuenta.value = record.cuenta || "";
  form.recurso.value = record.recurso || "";
  form.descripcion.value = record.descripcion || "";
  const selected = new Set(record.ambiente || []);
  form.querySelectorAll('input[name="ambiente"]').forEach((cb) => {
    cb.checked = selected.has(cb.value);
  });
  dialogTitle.textContent = "Editar registro";
  submitBtn.textContent = "Guardar cambios";
  dialog.showModal();
}

document.getElementById("new-btn").addEventListener("click", () => {
  editingId = null;
  form.reset();
  dialogTitle.textContent = "Nuevo registro";
  submitBtn.textContent = "Guardar";
  dialog.showModal();
});

document.getElementById("cancel-btn").addEventListener("click", () => dialog.close());

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const payload = {
    cliente: data.get("cliente"),
    proyecto: data.get("proyecto"),
    plataforma: data.get("plataforma"),
    cuenta: data.get("cuenta"),
    recurso: data.get("recurso"),
    ambiente: data.getAll("ambiente"),
    descripcion: data.get("descripcion"),
  };
  if (!payload.ambiente.length) {
    showError("Selecciona al menos un ambiente.");
    return;
  }
  submitBtn.disabled = true;
  try {
    const url = editingId ? `/api/registry?id=${encodeURIComponent(editingId)}` : "/api/registry";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) {
      window.location.href = "/login.html";
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showError(body.error || "No se pudo guardar el registro.");
      return;
    }
    dialog.close();
    editingId = null;
    clearError();
    await loadRegistry();
  } finally {
    submitBtn.disabled = false;
  }
});

loadRegistry();
