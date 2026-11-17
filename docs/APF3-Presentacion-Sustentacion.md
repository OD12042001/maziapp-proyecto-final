# Presentación de Sustentación — ETAPA 3 (APF3 · Semana 15)
## MaziApp (Mazi Flow): Implementación SOA, ESB Lógico y Orquestación BPM

---

### Diapositiva 1 — Portada y Objetivo de la Etapa 3
- **Proyecto:** Mazi Flow — Sistema de Gestión de Relaciones de Inversión (SGRI)
- **Curso:** Arquitectura Orientada al Servicio (Semana 15 · Peso 20 %)
- **Objetivo APF3:** Pasar del diseño arquitectónico de la Etapa 2 a una implementación técnica funcional verificable extremo a extremo:
  - Corte vertical implementado: **S01, S06, S12, S13, S15, S16, S17 y S40**.
  - Middleware de integración: **ESB lógico** con patrón *Transactional Outbox*, reintentos, DLQ e idempotencia.
  - Orquestación empresarial: **Saga BPM (`KYC_CIERRE_COMISION`)** con compensación automática.

---

### Diapositiva 2 — Stack Tecnológico Seleccionado (Requisito S1)
- **Aplicación (Frontend):** Angular 21 (Standalone + Signals) + Fundamental NGX + MSAL.
- **API y Servicios:** REST / JSON sobre Node.js 22 + Azure Functions v4 + TypeScript 5 (`strict`) + validación Zod.
- **Documentación y Contratos:** OpenAPI 3.1 (`docs/openapi.yaml`, 51 operaciones) + Swagger UI (`/api/docs`) + Postman v2.1.
- **ESB / Middleware:** Bus lógico transaccional sobre SQL Server (`OutboxEventos`, `OutboxConsumidos`, `IdempotenciaSolicitudes`).
- **Persistencia:** SQL Server 2022 en Docker (`maziapp-sql`, 34 tablas, 23 FK, 43 CHECK, 18 UNIQUE, trigger de solo anexado).

---

### Diapositiva 3 — Diseño Técnico de los Servicios (Requisito S2)
- **S06 Pipeline Comercial (7 endpoints):** Avance secuencial sobre 8 etapas; entrada a `CERRADO_GANADO` exige KYC `VALIDADO` y cierre `REGISTRADO`. Control de concurrencia optimista (`rowsAffected = 1`).
- **S12 / S13 KYC y SLA (8 endpoints):** Checklist de 5 documentos; carga por `ejecutivo_inversion`, validación y dictamen exclusivos de `compliance` (`403` para otros roles); SLA calculado contra `KYC_SLA_DIAS = 15`.
- **S15 Cierres de Inversión (3 endpoints):** `POST /api/cierres` con `Idempotency-Key` obligatoria (SHA-256 canónico del cuerpo: repetición devuelve `201`, cuerpo distinto `422`).
- **S16 / S17 Comisiones y Reversión (3 endpoints + consumidor ESB):** Comisión del **3 % incluido IGV (18 %)** desglosada exactamente (`BaseImponible + ImporteIgv = ImporteTotal`). Reversión auditada dentro de la ventana de 30 días.
- **S40 Auditoría (2 endpoints):** Bitácora inmutable protegida por `TR_AuditoriaEventos_SoloAnexado` y correlacionada con `X-Correlation-Id`.

---

### Diapositiva 4 — Cadena de Integración y ESB Lógico (Requisito S3)
- **Cadena implementada:**
  `SPA Angular 21 → API HTTP (withCors / withAuth / Zod) → Servicio SOA → ESB Lógico → SQL Server 2022`
- **Garantías del ESB Lógico:**
  1. **Outbox transaccional:** El cambio de negocio y el evento se confirman o revierten juntos.
  2. **Despacho seguro:** Reserva con `ROWLOCK, UPDLOCK, READPAST` y arrendamiento de 300 s.
  3. **Tolerancia a fallos:** *Backoff* exponencial ($10\text{ s}, 20\text{ s}, 40\text{ s}\dots$) y paso a cola de fallidos (`MUERTO` / DLQ) tras 5 intentos.
  4. **Efecto exactamente una vez:** Tabla `OutboxConsumidos` por `(OutboxId, Consumidor)`.

---

### Diapositiva 5 — Integración BPM + SOA mediante Saga (Requisito S4)
- **Proceso empresarial `KYC_CIERRE_COMISION`:**
  1. **Paso 1 (S06):** `AperturaYAvancePipeline` ← evento `EtapaCambiada`.
  2. **Paso 2 (S12/S13):** `VerificacionYDictamenKyc` ← evento `KycEstadoCambiado`.
  3. **Paso 3 (S15):** `RegistroCierreInversion` ← evento `CierreGanadoRegistrado`.
  4. **Paso 4 (S16/S17):** `CalculoComision` ← evento `ComisionCalculada` (`COMPLETADA`).
- **Compensaciones BPM verificadas:**
  - Si Compliance **rechaza** el KYC en el Paso 2 → el Paso 2 queda `FALLIDO`, el Paso 1 se marca `COMPENSADO`, la oportunidad pasa automáticamente a `PERDIDA` y la Saga queda `COMPENSADA`.
  - Si Administración/Compliance **revierte** la comisión en S17 → el Paso 4 pasa a `COMPENSADO` y la Saga queda `COMPENSADA`.

---

### Diapositiva 6 — Evidencias Funcionales y Métricas de Calidad (Requisitos S5 y S6)
- **Pruebas automatizadas:**
  - Backend: **91 suites / 841 pruebas unitarias en Jest (`PASS`)** + **88 comprobaciones E2E contra SQL Server 2022 real**.
  - Frontend: **12 suites / 193 pruebas en Vitest (`PASS`)** + vistas `/kyc` y `/comisiones` compiladas sin errores.
- **Demostración en vivo reproducible 100 % en local:**
  - Swagger UI en `http://localhost:7071/api/docs`.
  - Colección Postman v2.1 (`docs/MaziApp-APF3.postman_collection.json`).
  - Ejemplo contable verificado en motor real: Captación `S/ 200,000.00` → Comisión total `S/ 6,000.00` (`Base: S/ 5,084.75` + `IGV: S/ 915.25`).
