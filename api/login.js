const crypto = require("crypto");

function sessionToken(password) {
  return crypto.createHash("sha256").update(password + ":kadavra-platforms-session").digest("hex");
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

  const { password } = req.body || {};
  if (!password || password !== expected) {
    res.status(401).json({ error: "Contraseña incorrecta" });
    return;
  }

  const token = sessionToken(expected);
  res.setHeader(
    "Set-Cookie",
    `kadavra_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
  );
  res.status(200).json({ ok: true });
};
