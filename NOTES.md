# Notas tÃ©cnicas â kadavra-platforms

**Autor:** Sirius (builder), 2026-07-08. Modo build directo (sin fase de prototipo, decisiÃ³n de
Gabo).

## Decisiones de arquitectura

- **Primer diseÃ±o (descartado): JSON del repo como DB vÃ­a GitHub Contents API.** Gabo pidiÃ³
  originalmente usar el JSON del repo como "DB" para no meter infraestructura de mÃ¡s. Al
  implementarlo, Ã©l mismo notÃ³ el problema: cada alta/baja generaba un commit real y, por la
  integraciÃ³n de Git con Vercel, un deploy nuevo por cada cambio de datos â ruido en el historial y
  builds gastados en algo que no toca cÃ³digo. Se descartÃ³ antes de llegar a producciÃ³n.
- **DiseÃ±o final: Redis vÃ­a Upstash, integraciÃ³n nativa de Vercel.** Se reutiliza el store
  `quiniela-kv` que Gabo ya tenÃ­a conectado a otro proyecto suyo (`ay-mundial`, sin relaciÃ³n con
  KADAVRA) â no se creÃ³ un store nuevo. Namespacing con la llave `kadavra-platforms:registry` para
  no chocar con lo que ya vive ahÃ­. Todo el registro se guarda como un Ãºnico JSON serializado bajo
  esa llave (no hay necesidad de un modelo relacional para esta escala).
- **Por quÃ© no Supabase:** Gabo estaba cerca de su lÃ­mite de proyectos en el plan gratis y no
  querÃ­a pagar todavÃ­a. `code_security.md`/`builder.md` se actualizaron para que Supabase sea el
  *default*, no una regla obligatoria â este proyecto es el caso real que motivÃ³ ese cambio.
- **Por quÃ© no Firebase:** se considerÃ³ (Gabo ya lo ha usado antes), pero habrÃ­a sido meter un
  tercer proveedor de datos al stack por una tabla de un puÃ±ado de filas. Queda documentado como
  alternativa aceptada para el futuro, no usada aquÃ­.
- **`data/registry.json` en el repo:** ya no es la fuente de datos en producciÃ³n. Se conserva como
  semilla/fixture de referencia (los 5 registros reales con los que arrancamos la conversaciÃ³n).
  Los datos reales viven en Redis.
- **Gate de acceso:** una sola contraseÃ±a compartida (`SITE_PASSWORD`), no cuentas individuales â
  asÃ­ lo pidiÃ³ Gabo, fuera de alcance explÃ­cito en el BRIEF. La sesiÃ³n es una cookie con el hash
  SHA-256 de la contraseÃ±a + un salt fijo; no es una soluciÃ³n de nivel bancario, pero es coherente
  con el riesgo real (datos `internal`, no secretos) y evita hardcodear nada.

## Variables de entorno que necesita este proyecto en Vercel

- `SITE_PASSWORD` â contraseÃ±a compartida del gate.
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` â inyectadas automÃ¡ticamente por Vercel al conectar el
  store `quiniela-kv` a este proyecto (Storage â quiniela-kv â Connect to Project). No hace falta
  crearlas a mano.

## Pendiente / fuera de este primer cierre

- EdiciÃ³n vÃ­a chat directo con Draco: llamar a `/api/registry` (POST/DELETE) autenticado, o pedirle
  a Draco que lo haga por ti â no requiere cÃ³digo adicional, ya funciona por construcciÃ³n.
- Sin historial de auditorÃ­a de quiÃ©n editÃ³ quÃ© (Redis no tiene equivalente al `git log`; si esto
  importa mÃ¡s adelante, habrÃ­a que agregar un timestamp/autor por registro).
