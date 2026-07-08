const COLUMNS = ["cliente", "proyecto", "plataforma", "cuenta", "recurso", "ambiente", "descripcion"];

const body = document.getElementById("registry-body");
const errorEl = document.getElementById("error");
const dialog = document.getElementById("new-dialog");
const form = document.getElementById("new-form");
const filterInputs = document.querySelectorAll("[data-filter]");

let allRecords = [];
const filters = {};

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
      <td><button class="delete-btn" data-id="${escapeHtml(r.id)}">Borrar</button></td>
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
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;
  const id = btn.dataset.id;
  if (!confirm("¿Borrar este registro?")) return;
  btn.disabled = true;
  const res = await fetch(`/api/registry?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (res.status === 401) {
    window.location.href = "/login.html";
    return;
  }
  if (!res.ok) {
    showError("No se pudo borrar el registro.");
    btn.disabled = false;
    return;
  }
  await loadRegistry();
});

document.getElementById("new-btn").addEventListener("click", () => {
  form.reset();
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
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const res = await fetch("/api/registry", {
      method: "POST",
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
    clearError();
    await loadRegistry();
  } finally {
    submitBtn.disabled = false;
  }
});

loadRegistry();
