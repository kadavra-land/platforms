const crypto = require("crypto");

const REDIS_KEY = "kadavra-platforms:registry";
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

async function redisCommand(...args) {
  const res = await fetch(process.env.KV_REST_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const json = await res.json();
  return json.result;
}

async function readRegistry() {
  const raw = await redisCommand("GET", REDIS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeRegistry(records) {
  await redisCommand("SET", REDIS_KEY, JSON.stringify(records));
}

module.exports = async function handler(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    res.status(500).json({ error: "Redis (KV_REST_API_URL / KV_REST_API_TOKEN) no configurado en Vercel" });
    return;
  }

  try {
    if (req.method === "GET") {
      const records = await readRegistry();
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
      const records = await readRegistry();
      const record = { id: crypto.randomUUID() };
      for (const field of ALL_FIELDS) record[field] = sanitize(input[field]);
      records.push(record);
      await writeRegistry(records);
      res.status(201).json(record);
      return;
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) {
        res.status(400).json({ error: "Falta id" });
        return;
      }
      const records = await readRegistry();
      const next = records.filter((r) => r.id !== id);
      if (next.length === records.length) {
        res.status(404).json({ error: "Registro no encontrado" });
        return;
      }
      await writeRegistry(next);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    res.status(502).json({ error: "Error al conectar con Redis" });
  }
};
