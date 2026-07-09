# Notas técnicas — kadavra-platforms

**Autor:** Sirius (builder), 2026-07-08. Modo build directo (sin fase de prototipo, decisión de
Gabo).

## Decisiones de arquitectura

- **Primer diseño (descartado): JSON del repo como DB vía GitHub Contents API.** Gabo pidió
  originalmente usar el JSON del repo como "DB" para no meter infraestructura de más. Al
  implementarlo, él mismo notó el problema: cada alta/baja generaba un commit real y, por la
  integración de Git con Vercel, un deploy nuevo por cada cambio de datos — ruido en el historial y
  builds gastados en algo que no toca código. Se descartó antes de llegar a producción.
- **Diseño final: Redis vía Upstash, integración nativa de Vercel.** Se reutiliza el store
  `quiniela-kv` que Gabo ya tenía conectado a otro proyecto suyo (`ay-mundial`, sin relación con
  KADAVRA) — no se creó un store nuevo. Namespacing con la llave `kadavra-platforms:registry` para
  no chocar con lo que ya vive ahí. Todo el registro se guarda como un único JSON serializado bajo
  esa llave (no hay necesidad de un modelo relacional para esta escala).
- **Por qué no Supabase:** Gabo estaba cerca de su límite de proyectos en el plan gratis y no
  quería pagar todavía. `code_security.md`/`builder.md` se actualizaron para que Supabase sea el
  *default*, no una regla obligatoria — este proyecto es el caso real que motivó ese cambio.
- **Por qué no Firebase:** se consideró (Gabo ya lo ha usado antes), pero habría sido meter un
  tercer proveedor de datos al stack por una tabla de un puñado de filas. Queda documentado como
  alternativa aceptada para el futuro, no usada aquí.
- **`data/registry.json` en el repo:** ya no es la fuente de datos en producción. Se conserva como
  semilla/fixture de referencia (los 5 registros reales con los que arrancamos la conversación).
  Los datos reales viven en Redis.
- **Gate de acceso:** una sola contraseña compartida (`SITE_PASSWORD`), no cuentas individuales —
  así lo pidió Gabo, fuera de alcance explícito en el BRIEF. La sesión es una cookie con el hash
  SHA-256 de la contraseña + un salt fijo; no es una solución de nivel bancario, pero es coherente
  con el riesgo real (datos `internal`, no secretos) y evita hardcodear nada.

## Variables de entorno que necesita este proyecto en Vercel

- `SITE_PASSWORD` — contraseña compartida del gate.
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — inyectadas automáticamente por Vercel al conectar el
  store `quiniela-kv` a este proyecto (Storage → quiniela-kv → Connect to Project). No hace falta
  crearlas a mano.

## Pendiente / fuera de este primer cierre

- Edición vía chat directo con Draco: llamar a `/api/registry` (POST/DELETE) autenticado, o pedirle
  a Draco que lo haga por ti — no requiere código adicional, ya funciona por construcción.
- Sin historial de auditoría de quién editó qué (Redis no tiene equivalente al `git log`; si esto
  importa más adelante, habría que agregar un timestamp/autor por registro).

## Deuda técnica (hallazgos menores de QA, sin resolver a propósito — ver `docs/qa/QA-2026-07-08.md`)

No bloquean esta entrega. Si este patrón (Redis + gate de contraseña) se reutiliza en un proyecto
de cliente real, revisar primero — la severidad de cada uno depende del perfil de riesgo del
cliente, no es fija:

1. **Condición de carrera en escrituras concurrentes** (`api/registry.js`): lectura-modificación-
   escritura sobre Redis sin lock. Con más usuarios concurrentes o datos críticos, esto sube de
   "menor" a "importante" o "bloqueante".
2. **Código muerto en `api/registry.js`**: su propio chequeo de auth nunca se alcanza porque
   `middleware.js` ya filtra antes. Solo limpieza, no riesgo — pero vale la pena quitarlo para no
   confundir a quien lea el código después.
3. **Sin logout / invalidación de sesión individual**: la única forma de cerrar sesiones es rotar
   `SITE_PASSWORD` (afecta a todos a la vez). Aceptable aquí (dato `internal`); un cliente con
   requisitos de compliance podría exigir esto desde el día uno.
