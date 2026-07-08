Este es `kadavra-platforms`: registro interno de KADAVRA (clientes, proyectos, plataformas y
recursos — no un gestor de contraseñas). Repo independiente de la org `kadavra-land`, clonado en
`workspace/platforms` dentro de `kadavra-hq`.

- BRIEF y criterios de aceptación: `docs/BRIEF.md`.
- Notas técnicas de construcción: `NOTES.md`.
- Stack: vanilla HTML/CSS/JS + funciones serverless de Vercel + `middleware.js` como gate de
  acceso. Los datos viven en `data/registry.json` de este mismo repo; las funciones serverless
  leen/escriben ese archivo vía la API de contenidos de GitHub (no hay base de datos real).
- Variables de entorno requeridas en Vercel: `SITE_PASSWORD` (contraseña compartida del gate) y
  `GITHUB_PLATFORMS_TOKEN` (fine-grained PAT con Contents read/write, con alcance limitado
  únicamente a este repo — nunca reusar el PAT amplio de Draco aquí).
