const crypto = require("crypto");

const REPO = "kadavra-land/platforms";
const FILE_PATH = "data/registry.json";
const GITHUB_API = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;
const REQUIRED_FIELDS = ["cliente", "plataforma", "ambiente"];
const ALLOWED_AMBIENTES = ["Producción", "Prototipo", "Sandbox"];
const ALL_FIELDS = ["cliente", "proyecto", "plataforma", "cuenta", "recurso", "ambiente", "descripcion"];

function sessionToken(password) {
  return crypto.createHash("sha256").update(password + ":kadavra-platforms-session").digest("hex");
}

function isAuthed(req) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return false;
  const cookie = req.headers.cookie || "";
  const expected = `kadavra_session=${sessionToken(password)}`;
  return cookie.split(";").some((c) => c.trim() === expected);
}

function sanitize(value) {
  return String(value ?? "").trim().slice(0, 300);
}

async function readRegistry() {
  const res = await fetch(GITHUB_API, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_PLATFORMS_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
  const json = await res.json();
  const content = Buffer.from(json.content, "base64").toString("utf-8");
  return { records: JSON.parse(content), sha: json.sha };
}

async function writeRegistry(records, sha, message) {
  const content = Buffer.from(JSON.stringify(records, null, 2) + "\n", "utf-8").toString("base64");
  const res = await fetch(GITHUB_API, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_PLATFORMS_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      message,
      content,
      sha,
      committer: { name: "kadavra-platforms bot", email: "draco@kadavra.land" },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub write failed: ${res.status} ${body}`);
  }
}

module.exports = async function handler(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  if (!process.env.GITHUB_PLATFORMS_TOKEN) {
    res.status(500).json({ error: "GITHUB_PLATFORMS_TOKEN no configurado en Vercel" });
    return;
  }

  try {
    if (req.method === "GET") {
      const { records } = await readRegistry();
      res.status(200).json(records);
      return;
    }

    if (req.method === "POST") {
      const input = req.body || {};
      for (const field of REQUIRED_FIELDS) {
        if (!sanitize(input[field])) {
          res.status(400).json({ error: `Falta el campo requerido: ${field}` });
          return;
        }
      }
      if (!ALLOWED_AMBIENTES.includes(input.ambiente)) {
        res.status(400).json({ error: "Ambiente inválido" });
        return;
      }
      const { records, sha } = await readRegistry();
      const record = { id: crypto.randomUUID() };
      for (const field of ALL_FIELDS) record[field] = sanitize(input[field]);
      records.push(record);
      await writeRegistry(records, sha, `Agrega registro: ${record.cliente} / ${record.plataforma}`);
      res.status(201).json(record);
      return;
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) {
        res.status(400).json({ error: "Falta id" });
        return;
      }
      const { records, sha } = await readRegistry();
      const next = records.filter((r) => r.id !== id);
      if (next.length === records.length) {
        res.status(404).json({ error: "Registro no encontrado" });
        return;
      }
      await writeRegistry(next, sha, `Elimina registro: ${id}`);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    res.status(502).json({ error: "Error al conectar con el repositorio" });
  }
};
