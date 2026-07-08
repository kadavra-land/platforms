const COLUMNS = ["cliente", "proyecto", "plataforma", "cuenta", "recurso", "ambiente", "descripcion"];

const body = document.getElementById("registry-body");
const errorEl = document.getElementById("error");
const dialog = document.getElementById("new-dialog");
const form = document.getElementById("new-form");

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

function renderRows(records) {
  if (!records.length) {
    body.innerHTML = '<tr><td colspan="8">Sin registros todavía.</td></tr>';
    return;
  }
  body.innerHTML = records.map((r) => `
    <tr data-id="${escapeHtml(r.id)}">
      ${COLUMNS.map((c) => `<td>${escapeHtml(r[c])}</td>`).join("")}
      <td><button class="delete-btn" data-id="${escapeHtml(r.id)}">Borrar</button></td>
    </tr>
  `).join("");
}

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
  const data = await res.json();
  renderRows(data);
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
  const payload = Object.fromEntries(new FormData(form).entries());
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
