# BRIEF — kadavra-platforms

**Clasificación:** internal. Redactado a mano por Draco y Gabo (sin Bellatrix/`project_definition`
todavía — es la excepción prevista para Fase 1).

## Qué es

Registro interno de KADAVRA: qué existe, en qué plataforma, para quién (cliente/KADAVRA/Gabriel),
y en qué ambiente. No es un gestor de contraseñas — no guarda secretos ni punteros a ellos.

## Decisión de modo (Paso 0 de `build.md`)

**Modo build directo** — sin fase de prototipo. Decidido por Gabo: es una herramienta interna, no
un pitch a cliente, y el alcance ya está bien definido de entrada.

## Esquema de datos (`data/registry.json`)

| Campo | Tipo | Notas |
|---|---|---|
| `cliente` | texto libre | Nombre del cliente, o `KADAVRA`, o `Gabriel` |
| `proyecto` | texto libre | Nombre del proyecto |
| `plataforma` | texto libre | GitHub, Supabase, Vercel, Cloudflare, Google Cloud, etc. |
| `cuenta` | texto libre | Cuenta/usuario de acceso en esa plataforma |
| `recurso` | texto libre | Nombre del recurso en la plataforma (org/proyecto/dominio/repo) |
| `ambiente` | enum | `Producción` \| `Prototipo` \| `Sandbox` |
| `descripcion` | texto libre | Para qué sirve |

Sin campo de secreto ni de notas — fuera de alcance a propósito.

## Criterios de aceptación (producción — modo build)

1. **Listado:** la página, protegida por el gate de acceso, muestra una tabla HTML con las 7
   columnas de arriba, leyendo `data/registry.json`.
2. **Alta:** un formulario en la UI agrega un registro nuevo al JSON y lo refleja sin recargar
   manualmente el navegador tras guardar.
3. **Baja:** cada fila tiene una acción para eliminar su registro del JSON.
4. **Ambiente como select:** el formulario de alta usa un `<select>` con las tres opciones fijas,
   no texto libre.
5. **Edición vía chat (plus, no bloqueante para el primer cierre):** Draco puede editar
   `data/registry.json` directamente y pushear; Vercel redeploya solo.
6. **Gate de acceso:** ninguna parte de la tabla o del JSON se sirve sin pasar un gate de
   contraseña compartida. La contraseña vive en una variable de entorno de Vercel, nunca
   hardcodeada.
7. **Seguridad (`code_security.md`, completo por ser modo build):** validación server-side de
   cualquier escritura (no confiar en el formulario del cliente), cero secrets hardcodeados,
   inputs sanitizados antes de escribir al JSON, manejo de errores visible en la UI (no fallos
   silenciosos).
8. **Deploy:** conectado a la cuenta de Vercel de Gabo vía integración de Git (deploy automático
   en cada push a `main`), no CLI manual.

## Fuera de alcance (explícito)

- Autenticación por usuario individual (el gate es una sola contraseña compartida, no cuentas).
- Historial de cambios / auditoría de quién editó qué (se apoya en el historial de git del repo).
- Cualquier campo de secreto, password o token.

## Stack

Vanilla HTML/CSS/JS. `data/registry.json` como almacenamiento. Una función serverless mínima en
Vercel para las escrituras (alta/baja) — el navegador no puede escribir directo a un archivo del
repo. Gate de acceso vía middleware/función de Vercel, con la contraseña como env var.

## Contrato de memoria

Sirius no escribe en `memory/` de kadavra-hq. Deja notas técnicas en `NOTES.md` de este repo.
Draco registra el cierre en `memory/decisions.md` de kadavra-hq al terminar.
