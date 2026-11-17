# APF3 — Arquitectura técnica y selección de tecnologías

Documento de la ETAPA 3 (Semana 15). Cubre el requisito «Definir tecnología» y sirve de
marco para el diseño técnico de servicios, la integración, la relación BPM + SOA y las
evidencias de funcionamiento.

Alcance de esta entrega: corte vertical sobre los servicios **S01, S02, S06, S12, S13,
S15, S16, S17 y S40** del diseño de APF2, más el bus lógico y la saga que los orquesta.
No se reimplementan los 40 servicios.

---

## 1. Selección de tecnologías

| Capa | Tecnología | Versión | Por qué | Alternativa descartada |
|------|-----------|---------|---------|------------------------|
| Interfaz | Angular (standalone, zoneless) | 21.2 | Ya implementado en APF1/APF2; standalone + señales simplifican el estado; sin `zone.js` el render es más predecible | React (reescritura sin valor para la etapa) |
| Componentes | Fundamental NGX | 0.61.7 | Librería corporativa SAP ya usada; accesible y consistente con el branding | Angular Material (otra estética, migración completa) |
| Autenticación | MSAL Angular / Entra ID | 5.x | El tenant ya emite App Roles; el rol viaja en el JWT y el backend no consulta roles en SQL | Auth propia con usuarios y contraseñas (fuera del alcance y riesgo innecesario) |
| API | REST sobre HTTP/JSON | — | Consumo simple desde SPA, cacheable, fácil de documentar en OpenAPI; el dominio no requiere contratos SOAP | SOAP/XML (sin sistema legado que lo exija) |
| Runtime | Azure Functions v4 (Node.js) | 4.x / Node 22 | Modelo serverless, escalado por evento y costo por ejecución; el mismo runtime corre local con Core Tools | Express en contenedor (más superficie operativa) |
| Lenguaje | TypeScript | 5.x | Tipado estático de extremo a extremo; `strict` activo en backend | JavaScript plano (pierde el contrato en compilación) |
| Validación | Zod | 3.23 | Esquemas declarativos que producen errores por campo; una sola definición valida y documenta | Validación manual (duplicación y divergencia) |
| Persistencia | SQL Server | 2022 | El volcado real del sistema es T-SQL; Azure SQL en la nube y el mismo motor en Docker local | PostgreSQL (habría que traducir todo el esquema) |
| Acceso a datos | `mssql` (driver nativo) | 11.0 | Pool reutilizado entre invocaciones; consultas parametrizadas | ORM (oculta el SQL y complica las consultas de reporte) |
| Pruebas backend | Jest + ts-jest | 29.7 | 544 pruebas existentes como red de seguridad | — |
| Pruebas frontend | Vitest + jsdom | 4.0 | Integrado con el builder de Angular 21 | Karma/Jasmine (en desuso) |
| ESB / middleware | Bus lógico en el propio backend | — | Ver §5: el volumen y el equipo no justifican un broker administrado; se implementan los patrones (outbox, reintentos, DLQ, idempotencia) sobre SQL | Azure Service Bus (costo y dependencia de nube para un prototipo académico) |
| Contratos | OpenAPI 3.1 + Swagger UI | 3.1 | Requisito explícito de evidencia («Swagger») y fuente única del contrato | Documentación en Word (se desactualiza) |
| Pruebas de API | Postman (colección versionada) | v2.1 | Evidencia reproducible de consumo | `curl` suelto (no reproducible) |

---

## 2. Arquitectura por capas

```text
┌──────────────────────────────────────────────────────────────┐
│  Aplicación (SPA Angular)                                    │
│  features/ · core/services (HTTP) · core/auth (MSAL)          │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS + JSON + Bearer JWT
┌───────────────────────────▼──────────────────────────────────┐
│  API (Azure Functions v4)                                    │
│  functions/  → ruteo, CORS, auth, validación Zod, respuesta   │
└───────────────────────────┬──────────────────────────────────┘
                            │ llamada en proceso
┌───────────────────────────▼──────────────────────────────────┐
│  Servicios de negocio                                        │
│  services/   → reglas, ownership, transiciones de estado      │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│  ESB lógico                                                  │
│  outbox · reintentos con backoff · DLQ · idempotencia         │
│  correlación (X-Correlation-Id) · contrato de errores         │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│  Repositorios → SQL Server                                   │
│  repositories/  → consultas parametrizadas, transacciones      │
└──────────────────────────────────────────────────────────────┘
```

Regla de dependencia: `functions → services → repositories`. Ninguna capa conoce a la de
arriba. Los repositorios son los únicos que hablan SQL; los servicios son los únicos que
deciden reglas de negocio.

---

## 3. Cadena de integración

La cadena que exige la etapa se materializa así:

| Eslabón | Implementación concreta |
|---------|-------------------------|
| Aplicación | Componente Angular → servicio HTTP tipado (`core/services/*.service.ts`) |
| API | Función HTTP registrada en `functionApp.ts`, con `withAuth` y `withCors` |
| Servicio | Clase de negocio en `services/*`, agnóstica de HTTP |
| ESB | Capa transversal: correlación, idempotencia, outbox, reintentos, DLQ |
| Sistema / BD | Repositorio sobre SQL Server, consultas parametrizadas |

Ejemplo verificable hoy:

```text
ContactosComponent
  → ContactosService.listar()
  → GET /api/contactos
  → getContactos (HTTP) → contacto.service
  → contacto.repository → SELECT ... FROM dbo.Contactos
```

---

## 4. Diseño técnico de servicios

El detalle por endpoint (método, ruta, parámetros, cuerpo, respuestas y formato) vive en
`docs/openapi.yaml`, que es la fuente única del contrato. Convenciones adoptadas:

- **Recurso y método**: rutas en plural y sustantivos (`/contactos`, `/contactos/{id}/direcciones`); el verbo lo da el método HTTP.
- **Formato**: JSON con `camelCase`; fechas en ISO 8601 UTC. Los identificadores `int` viajan como número y los `bigint` (auditoría, outbox) como string, para no perder precisión en JavaScript.
- **Errores**: la forma **realmente implementada**, que es `{ message }` y, en la validación con Zod, `{ message, errors: { fieldErrors, formErrors } }`; el rechazo de autorización responde `{ error: "Forbidden" }`. La forma `application/problem+json` de RFC 9457 **no está implementada** y por eso el contrato no la declara.
- **Correlación**: los endpoints nuevos aceptan y devuelven `X-Correlation-Id`; si no llega, el backend genera uno y lo publica en la respuesta y en la auditoría. La superficie existente todavía no lo hace.
- **Paginación**: los listados existentes devuelven un array sin envoltorio y así quedan documentados. Los listados nuevos devuelven `{ items, page, pageSize, total }` con `pageSize` máximo 100.
- **Idempotencia**: `Idempotency-Key` obligatorio solo en `POST /cierres` y `POST /comisiones/{id}/reversion`, que son los dos efectos irreversibles del corte. Repetir la clave con el mismo cuerpo devuelve la respuesta original; con cuerpo distinto responde `422`.
- **Compatibilidad**: cambios aditivos dentro de la misma versión; un cambio incompatible abre `/v2`.

---

## 5. ESB lógico

**Decisión**: no se incorpora un broker administrado. El bus se implementa como capa
dentro del backend, sobre la misma base de datos, porque:

1. El sistema es un monolito modular con un solo dominio; los «servicios» comparten base.
2. Un broker agrega infraestructura, costo y credenciales que el entorno académico no puede sostener.
3. Los patrones que la etapa necesita demostrar —desacople, reintento, no pérdida de mensajes, trazabilidad— se pueden implementar y **probar** igual sobre SQL.

Componentes:

| Componente | Responsabilidad | Garantía |
|-----------|-----------------|----------|
| Outbox | Registrar el evento en la misma transacción que el cambio de negocio | Ningún evento se pierde si falla el proceso posterior |
| Despachador | Leer pendientes, publicar al consumidor | Procesamiento al menos una vez |
| Reintentos | Backoff exponencial con techo y contador | Fallos transitorios se recuperan |
| DLQ | Mover a cola muerta tras agotar reintentos | Nada se descarta en silencio; queda inspeccionable |
| Idempotencia | Clave por operación + consumidor | Reintentos no duplican efectos |
| Correlación | `X-Correlation-Id` propagado a eventos y logs | Trazabilidad de punta a punta |

---

## 6. Integración BPM + SOA

El proceso de negocio de Mazi Flow se descompone en servicios atómicos orquestados por
una saga. Cada servicio es dueño de su estado; la saga es dueña del orden y de la
compensación.

```text
Proceso: incorporación y cierre de una operación comercial
   │
   ├─ S12 · Verificación KYC ──────────► S13 · Dictamen y habilitación
   │                                        │
   ├─ S01 · Alta de contacto ───────────────┤
   ├─ S02 · Datos complementarios ──────────┤
   │                                        ▼
   ├─ S06 · Pipeline comercial ────► S15 · Cierre de operación
   │                                        │
   │                                        ▼
   └─ S16 / S17 · Cálculo y liquidación de comisiones
                                            │
                                            ▼
                          S40 · Auditoría (transversal a todos los pasos)
```

Reglas de la saga:

- Cada paso publica un evento de dominio y puede compensarse si un paso posterior falla.
- Un dictamen KYC negativo cancela la incorporación y revierte el estado del contacto.
- El cierre (S15) es la frontera de irreversibilidad: no se compensa, se corrige con un movimiento inverso auditado.
- S40 registra actor, servicio, operación, resultado y correlación de cada paso, sin acoplarse a la lógica de negocio.

---

## 7. Seguridad

- Entra ID es la única fuente de verdad de identidad y roles; el JWT validado aporta `oid` y `roles`.
- Cada endpoint declara los App Roles que exige; la autorización se aplica en el backend, nunca solo en la UI.
- El ownership se valida en el servicio: un usuario no puede leer ni modificar registros fuera de su cartera, aunque conozca el identificador.
- El entorno local sustituye la identidad con tres candados simultáneos (`AUTH_DEV_BYPASS`, `NODE_ENV` distinto de producción y ausencia de `WEBSITE_INSTANCE_ID`). El artefacto de producción no incluye el bypass.

---

## 8. Entorno reproducible

```bash
docker compose up -d                    # SQL Server 2022 en localhost:14333
./database/init-local.ps1               # esquema + datos de desarrollo (idempotente)
cd maziapp-backend && npm ci && npm run build && npm start
cd maziapp-frontend && npm ci && npx ng serve
```

Verificación de la cadena completa: la SPA lista contactos leídos del contenedor a través
de la API, sin Azure y sin login.

---

## 9. Estado de implementación

| Capacidad | Estado |
|-----------|--------|
| Contactos, representantes, direcciones, trabajos dependientes, actividad, empresas, ubigeo, CIIU, reportería | Implementado (21 endpoints funcionales + `GET /reportes/{key}`) |
| Esquema y datos locales | Implementado (14 tablas, 2 167 registros del volcado) |
| Esquema APF3: pipeline, KYC, cierres, comisiones, liquidaciones, auditoría, outbox, idempotencia y saga | Implementado (20 tablas, 23 FK, 43 CHECK, 18 UNIQUE; verificado sobre SQL Server real) |
| Catálogos y parámetros APF3 | Implementado (2 monedas, 8 etapas, 5 documentos KYC, 8 parámetros, 2 proyectos) |
| Contrato OpenAPI | Implementado (OpenAPI 3.1.0, 39 rutas / 51 operaciones; válido con Redocly) |
| Implementación backend de S06, S12, S13, S15, S16, S17, S40, ESB y saga | **No iniciada** — espera validación del modelo de datos y del contrato |
| Postman y Swagger UI | Pendiente |

---

## 10. Decisiones abiertas heredadas de APF2

Se implementan parametrizadas, con un valor por defecto sembrado en
`ConfiguracionParametros`, en lugar de quedar fijas en el código:

| Regla | Estado | Materialización |
|-------|--------|-----------------|
| Ventana de reversión de una operación | Abierta (APF2 propone 30–45 días) | `REVERSION_PLAZO_DIAS = 30` |
| Política de reintentos del bus | Abierta | `ESB_MAX_REINTENTOS = 5`, `ESB_BACKOFF_BASE_SEGUNDOS = 10`, `ESB_BACKOFF_MAX_SEGUNDOS = 300` |
| Tasa de comisión e IGV | Abierta | `COMISION_TASA_PORCENTAJE = 3.00`, `COMISION_IGV_PORCENTAJE = 18.00` |
| Plazo de dictamen KYC | Abierta | `KYC_SLA_DIAS = 15` |
| Día de pago de la liquidación | Abierta | `LIQUIDACION_DIA_PAGO = 10` |
| Comisión ya liquidada | Abierta | Rechazar el ajuste y exigir movimiento inverso auditado |
| Dueño de incidencias de integración | Abierta | Operaciones, con escalamiento a desarrollo tras 3 fallos |
