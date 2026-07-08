# Notas técnicas — kadavra-platforms

**Autor:** Sirius (builder), 2026-07-08. Modo build directo (sin fase de prototipo, decisión de
Gabo).

## Decisiones de arquitectura

- **Por qué serverless + GitHub API en vez de una base de datos real:** Gabo pidió explícitamente
  usar el JSON del repo como "DB" para no meter infraestructura de más en una herramienta interna.
  El navegador no puede escribir archivos del repo directamente, así que `api/registry.js` hace de
  intermediario: lee/escribe `data/registry.json` vía la API de contenidos de GitHub. Cada alta o
  baja desde la UI genera un commit real en este repo.
- **Por qué un token de GitHub separado (`GITHUB_PLATFORMS_TOKEN`) y no el PAT de Draco:** el PAT
  de `draco-kad` tiene alcance a *todos* los repos de la org — meterlo en una función serverless
  pública (aunque esté detrás del gate de contraseña) sería un radio de exposición innecesario. Este
  token debe ser un fine-grained PAT nuevo, con Contents read/write, limitado únicamente al repo
  `kadavra-land/platforms`.
- **Gate de acceso:** una sola contraseña compartida (`SITE_PASSWORD`), no cuentas individuales —
  así lo pidió Gabo, fuera de alcance explícito en el BRIEF. La sesión es una cookie con el hash
  SHA-256 de la contraseña + un salt fijo; no es una solución de nivel bancario, pero es coherente
  con el riesgo real (datos `internal`, no secretos) y evita hardcodear nada.
- **Latencia esperada:** como las escrituras son commits reales a GitHub, hay un pequeño delay
  (típicamente <2s) entre guardar y ver el cambio reflejado — no hace falta esperar un redeploy
  completo de Vercel porque las lecturas también van directo contra la API de GitHub, no contra el
  bundle estático.

## Pendiente / fuera de este primer cierre

- Edición vía chat directo con Draco (editar el JSON y pushear manualmente) — funciona por
  construcción ya que Draco tiene push al repo, no requiere código adicional.
- Sin historial de auditoría más allá de `git log` del repo.
