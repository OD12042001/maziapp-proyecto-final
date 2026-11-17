# APF3 — Semana 15: Implementación e integración

Rama `main` · Entrega incremental por unidad de trabajo · Backend `npm test` (Jest) · Frontend `npx ng test --watch=false` (Vitest)

Entorno 100 % local: SQL Server 2022 en Docker (`docker-compose.yml`) y autenticación simulada. Sin dependencia de Azure.

## Specs

Requisitos literales de `INDICACION DE PROYECTO.docx`, ETAPA 3 – APF3 (Semana 15, peso 20 %).

- **S1 — Definir tecnología.** «Los estudiantes deben seleccionar las tecnologías que utilizarían»: API REST/SOAP, JSON/XML, base de datos, lenguaje de programación, framework, servidor, ESB o middleware.
- **S2 — Diseño técnico del servicio.** «Para uno o más servicios deberán especificar: Endpoint. Método. Parámetros. Respuesta. Formato de datos.»
- **S3 — Integración.** «Mostrar cómo los servicios interactúan.» Cadena exigida: Aplicación → API → Servicio → ESB → Sistema / Base de datos.
- **S4 — Integración con procesos BPM.** «Relacionar: Proceso empresarial → Servicio SOA», con el ejemplo de un proceso que encadena varios servicios.
- **S5 — Evidencia técnica.** «Evidencia funcional, no necesariamente un sistema completo»: prototipo, API funcionando, Postman, Swagger, capturas, código, diagrama de integración, demostración de consumo de servicios.
- **S6 — Entregable APF3.** Arquitectura técnica; tecnologías seleccionadas; servicios implementados/prototipados; integración; BPM + SOA; evidencias de funcionamiento; explicación técnica.

### Alcance funcional acordado

Corte vertical sobre los servicios ya diseñados en APF2, no los 40: **S01, S02, S06, S12, S13, S15, S16, S17, S40**, más el ESB lógico y la saga BPM que los orquesta.

### Restricciones

- No refactorizar Etapas 1 y 2 salvo que bloquee la Etapa 3.
- Toda evidencia debe poder reproducirse sin Azure: contenedor local + bypass de auth con tres candados.
- `environment.prod.ts` no lleva bypass de autenticación.

## Tasks

| ID | Tarea | Specs | Ruta | Estado |
|----|-------|-------|------|--------|
| T0 | Entorno local: Docker SQL, esquema saneado, seed, bypass de auth, fix de specs, Git | S5 | inline | ✅ `5432bf9` |
| T1 | OpenAPI 3.1 de la superficie existente + documento de arquitectura y selección de tecnologías | S1, S2, S6 | inline | pendiente |
| T2 | S40 Auditoría: tabla, servicio, endpoints, `X-Correlation-Id` | S2, S3 | inline | pendiente |
| T3 | ESB lógico: outbox, reintentos, DLQ, idempotencia, errores RFC 9457 | S3 | inline | pendiente |
| T4 | S06 pipeline + S12/S13 KYC | S2, S3 | inline | pendiente |
| T5 | S15 cierre + S16/S17 comisiones | S2, S3 | inline | pendiente |
| T6 | Saga BPM sobre los servicios implementados | S4 | inline | pendiente |
| T7 | UI mínima de KYC y Comisiones | S5 | inline | pendiente |
| T8 | Evidencias: colección Postman, Swagger UI, pruebas, documento APF3 | S5, S6 | inline | pendiente |

## Log

- **L1** — Solicitud inicial (sesión previa, resumida): auditar el estado real de frontend y backend frente a los requisitos de «ETAPA 3 – APF3», entregar informe y plan por fases antes de escribir código de negocio, y consultar toda ambigüedad entre código y documento.
- **L2** — 2026-11-16, textual: «Hay un cambio de planes positivo que nos va a desbloquear. No tengo acceso al portal de Azure para habilitar la IP, pero mi compañero me acaba de pasar el volcado de la base de datos en el archivo `mazi-sgri.sql`. Vamos a trabajar de forma 100% local para no depender de la nube.» Instrucciones: leer el `.sql`, crear `docker-compose.yml` y apuntar el backend al contenedor; crear `environment.ts` y `environment.prod.ts` con GUID dummy e implementar bypass de autenticación local; corregir el mock del spec; `git init` + `.gitignore`.
- **L3** — 2026-11-16, evidencia de T0: `mazi-sgri.sql` es un volcado T-SQL de Azure SQL con esquema **y datos** (2 167 `INSERT`). Se saneó a `database/init/01-schema.sql` quitando `CREATE/ALTER DATABASE`, `SERVICE_OBJECTIVE`, `MAXSIZE`, `CATALOG_COLLATION`, `LEDGER`, `ENCRYPTION`, `QUERY_STORE` y `COMPATIBILITY_LEVEL 170`. Cargado en SQL Server 2022: 14 tablas, 19 contactos, 1 893 distritos, 3 reportes, 7 roles de reporte. El pool real del backend (`config/sql.ts`) conecta y consulta. `GET /api/contactos` responde 200 con datos.
- **L4** — 2026-11-16, hallazgos de entorno: `SQL_SERVER` no admite la forma `host,puerto` de `sqlcmd`; se agregaron `SQL_PORT` y `SQL_TRUST_CERT` opcionales, sin cambiar el comportamiento por defecto contra Azure. PowerShell 5.1 escribe BOM con `Set-Content -Encoding utf8` y `JSON.parse` lo rechaza; `local.settings.json` se reescribió sin BOM. `CatalogoCiiu` viene vacía en el volcado, por lo que `/api/ciiu` devuelve `[]` con datos reales.
