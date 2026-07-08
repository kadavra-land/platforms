Este es `kadavra-platforms`: registro interno de KADAVRA (clientes, proyectos, plataformas y
recursos — no un gestor de contraseñas). Repo independiente de la org `kadavra-land`, clonado en
`workspace/platforms` dentro de `kadavra-hq`.

- BRIEF y criterios de aceptación: `docs/BRIEF.md`.
- Notas técnicas de construcción: `NOTES.md`.
- Stack: vanilla HTML/CSS/JS + funciones serverless de Vercel + `middleware.js` como gate de
  acceso. Los datos viven en **Redis** (Upstash, store `quiniela-kv` compartido con otro proyecto
  de Gabo, llave `kadavra-platforms:registry`) — `data/registry.json` en este repo es solo
  semilla/fixture de referencia, no la fuente de datos real.
- Variables de entorno requeridas en Vercel: `SITE_PASSWORD` (contraseña compartida del gate) y
  `KV_REST_API_URL` / `KV_REST_API_TOKEN` (inyectadas automáticamente al conectar el store
  `quiniela-kv` a este proyecto — no crearlas a mano).
