# BRIEF â kadavra-platforms

**ClasificaciÃ³n:** internal. Redactado a mano por Draco y Gabo (sin Bellatrix/`project_definition`
todavÃ­a â es la excepciÃ³n prevista para Fase 1).

## QuÃ© es

Registro interno de KADAVRA: quÃ© existe, en quÃ© plataforma, para quiÃ©n (cliente/KADAVRA/Gabriel),
y en quÃ© ambiente. No es un gestor de contraseÃ±as â no guarda secretos ni punteros a ellos.

## DecisiÃ³n de modo (Paso 0 de `build.md`)

**Modo build directo** â sin fase de prototipo. Decidido por Gabo: es una herramienta interna, no
un pitch a cliente, y el alcance ya estÃ¡ bien definido de entrada.

## Esquema de datos (Redis â ver "Stack" abajo; `data/registry.json` queda solo como semilla/fixture)

| Campo | Tipo | Notas |
|---|---|---|
| `cliente` | texto libre | Nombre del cliente, o `KADAVRA`, o `Gabriel` |
| `proyecto` | texto libre | Nombre del proyecto |
| `plataforma` | texto libre | GitHub, Supabase, Vercel, Cloudflare, Google Cloud, etc. |
| `cuenta` | texto libre | Cuenta/usuario de acceso en esa plataforma |
| `recurso` | texto libre | Nombre del recurso en la plataforma (org/proyecto/dominio/repo) |
| `ambiente` | enum | `ProducciÃ³n` \| `Prototipo` \| `Sandbox` |
| `descripcion` | texto libre | Para quÃ© sirve |

Sin campo de secreto ni de notas â fuera de alcance a propÃ³sito.

## Criterios de aceptaciÃ³n (producciÃ³n â modo build)

1. **Listado:** la pÃ¡gina, protegida por el gate de acceso, muestra una tabla HTML con las 7
   columnas de arriba, leyendo del registro en Redis vÃ­a `/api/registry`.
2. **Alta:** un formulario en la UI agrega un registro nuevo y lo refleja sin recargar
   manualmente el navegador tras guardar.
3. **Baja:** cada fila tiene una acciÃ³n para eliminar su registro.
4. **Ambiente como select:** el formulario de alta usa un `<select>` con las tres opciones fijas,
   no texto libre.
5. **EdiciÃ³n vÃ­a chat (plus, no bloqueante para el primer cierre):** Draco puede pedirle a la API
   que agregue/edite/borre un registro directamente, sin pasar por la UI.
6. **Gate de acceso:** ninguna parte de la tabla o los datos se sirve sin pasar un gate de
   contraseÃ±a compartida. La contraseÃ±a vive en una variable de entorno de Vercel, nunca
   hardcodeada.
7. **Seguridad (`code_security.md`, completo por ser modo build):** validaciÃ³n server-side de
   cualquier escritura (no confiar en el formulario del cliente), cero secrets hardcodeados,
   inputs sanitizados antes de escribir, manejo de errores visible en la UI (no fallos
   silenciosos).
8. **Deploy:** conectado a la cuenta de Vercel de Gabo vÃ­a integraciÃ³n de Git (deploy automÃ¡tico
   en cada push a `main`), no CLI manual.

## Fuera de alcance (explÃ­cito)

- AutenticaciÃ³n por usuario individual (el gate es una sola contraseÃ±a compartida, no cuentas).
- Historial de cambios / auditorÃ­a de quiÃ©n editÃ³ quÃ© (se apoya en el historial de git del repo).
- Cualquier campo de secreto, password o token.

## Stack

Vanilla HTML/CSS/JS. **Redis (Upstash, vÃ­a integraciÃ³n de Vercel)** como almacenamiento â se
reutiliza el store `quiniela-kv` que Gabo ya tenÃ­a de otro proyecto (`ay-mundial`), con la llave
`kadavra-platforms:registry` para no chocar con esas otras llaves. `data/registry.json` queda en
el repo solo como semilla/fixture de referencia, no como la fuente de datos en producciÃ³n (se
descartÃ³ el diseÃ±o original de "JSON del repo como DB" porque cada alta/baja generaba un commit y
un redeploy â ver `NOTES.md`). Una funciÃ³n serverless mÃ­nima en Vercel resuelve las escrituras
(alta/baja) â el navegador no puede hablar con Redis directo sin exponer credenciales. Gate de
acceso vÃ­a middleware/funciÃ³n de Vercel, con la contraseÃ±a como env var.

**Nota sobre el stack baseline de KADAVRA:** `code_security.md`/`builder.md` documentan Supabase
como *default* para datos, no como regla tajante. AquÃ­ se usÃ³ Redis en su lugar porque Gabo estaba
cerca del lÃ­mite de proyectos de su plan gratis de Supabase y no querÃ­a pagar todavÃ­a â motivo
real, documentado, no un atajo arbitrario.

## Contrato de memoria

Sirius no escribe en `memory/` de kadavra-hq. Deja notas tÃ©cnicas en `NOTES.md` de este repo.
Draco registra el cierre en `memory/decisions.md` de kadavra-hq al terminar.
