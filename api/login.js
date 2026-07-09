const crypto = require("crypto");

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 600;

function sessionToken(password) {
  return crypto.createHash("sha256").update(password + ":kadavra-platforms-session").digest("hex");
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
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

async function getAttempts(key) {
  const raw = await redisCommand("GET", key);
  return raw ? parseInt(raw, 10) : 0;
}

async function registerFailedAttempt(key) {
  const count = await redisCommand("INCR", key);
  if (count === 1) {
    await redisCommand("EXPIRE", key, WINDOW_SECONDS);
  }
  return count;
}

async function clearAttempts(key) {
  await redisCommand("DEL", key);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: "SITE_PASSWORD no configurado en Vercel" });
    return;
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    res.status(500).json({ error: "Redis no configurado en Vercel" });
    return;
  }

  const attemptsKey = `kadavra-platforms:login-attempts:${clientIp(req)}`;

  try {
    const currentAttempts = await getAttempts(attemptsKey);
    if (currentAttempts >= MAX_ATTEMPTS) {
      res.status(429).json({ error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." });
      return;
    }

    const { password } = req.body || {};
    if (!password || password !== expected) {
      await registerFailedAttempt(attemptsKey);
      res.status(401).json({ error: "Contraseña incorrecta" });
      return;
    }

    await clearAttempts(attemptsKey);
    const token = sessionToken(expected);
    res.setHeader(
      "Set-Cookie",
      `kadavra_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: "Error al conectar con Redis" });
  }
};
