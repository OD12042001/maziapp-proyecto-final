# APF3 — Modelo de datos y contratos de servicio

Documento de validación de la Fase 1 del corte vertical de la Etapa 3
(Semana 15). Describe el esquema nuevo que se integra al entorno local y el
contrato HTTP que lo expone, **antes** de escribir controladores, servicios o
repositorios.

| Artefacto | Ruta | Estado |
| --- | --- | --- |
| DDL del esquema nuevo | `database/init/03-apf3-schema.sql` | Aplicado y verificado |
| Catálogos y parámetros | `database/init/04-apf3-seed.sql` | Aplicado y verificado |
| Carga del entorno local | `database/init-local.ps1` | Ejecuta 01→04 en orden |
| Contrato HTTP | `docs/openapi.yaml` | Válido (OpenAPI 3.1.0) |
| Implementación backend | `maziapp-backend/src/functions/**` | **No iniciada** |

## 1. Convenciones del modelo

- Esquema único `dbo`; nombres de tabla en `PascalCase` y en plural.
- Claves primarias con prefijo de entidad (`OportunidadId`, `KycExpedienteId`),
  `int IDENTITY(1,1)` salvo auditoría y outbox, que son `bigint` porque crecen
  sin techo funcional.
- Claves foráneas nombradas `FK_<Hija>_<Padre>` y sin cascada (`NO ACTION`):
  ningún borrado se propaga, porque las entidades financieras no se borran.
- Fechas `datetime2(7)` en UTC, con sufijo `Utc` y `DEFAULT SYSUTCDATETIME()`.
  `Liquidaciones.FechaPagoPrevista` es `date` porque es una fecha calendario,
  no un instante.
- Importes `decimal(18,2)`; porcentajes `decimal(5,2)`.
- Identidad del usuario en `uniqueidentifier` (`CreadoId`, `ActualizadoId`,
  `ResponsableId`, `FreelanceId`), que es el `oid` del token de Entra ID. Se
  acompaña de `*Nombre` desnormalizado para que la bitácora siga siendo legible
  si el directorio cambia.
- Enumeraciones cerradas con `CHECK` nombrado (`CK_<Tabla>_<Concepto>`), nunca
  con una tabla catálogo, salvo que el negocio necesite editar los valores.
- Todo el script es idempotente (`IF OBJECT_ID(...) IS NULL` / `IF NOT EXISTS`),
  de modo que `init-local.ps1` se puede repetir sin efectos.

## 2. Inventario verificado

Consultado contra `sys.*` en el contenedor `maziapp-sql`, base `mazi_sqri_qa`:

| Métrica | Total base | Aporte APF3 |
| --- | --- | --- |
| Tablas `dbo` | 34 | **20 nuevas** |
| Claves foráneas | 36 | **23 nuevas** |
| `CHECK` nombrados | 53 | **43 nuevos** |
| Restricciones `UNIQUE` | 26 | **18 nuevas** |
| Vistas | 15 | 1 nueva (`vw_OportunidadResumen`) |
| Disparadores | 1 | 1 nuevo (`TR_AuditoriaEventos_SoloAnexado`) |

## 3. Mapa de relaciones

```
Monedas ─┬─ Oportunidades ─┬─ OportunidadEtapaHistorial
         │                 ├─ KycExpedientes ─── KycDocumentos ─── KycDocumentosRequeridos
         │                 ├─ CierresInversion ─┬─ Comisiones ─┬─ ComisionReversiones
         │                 │                    │              └─ LiquidacionDetalle
         │                 │                    └─ (Proyectos, Monedas)
         │                 └─ SagaInstancias ─── SagaPasos
         ├─ Proyectos ─── CierresInversion
         └─ Liquidaciones ─── LiquidacionDetalle
OutboxEventos ─── OutboxConsumidos
IdempotenciaSolicitudes      (aislada: se consulta por Clave + Endpoint)
AuditoriaEventos             (aislada por diseño: solo anexado)
PipelineEtapas ─── Oportunidades / OportunidadEtapaHistorial
Contactos (existente) ─── Oportunidades / KycExpedientes
```

## 4. Diccionario por dominio

### 4.1 Catálogos y configuración

**`Monedas`** — 4 columnas. PK `MonedaCodigo char(3)`. Siembra `PEN` y `USD`.
Existe para que el monto captado y la comisión declaren su moneda explícita:
**no se convierten importes en la base**.

**`ConfiguracionParametros`** — 9 columnas. PK `ParametroId`.
`Clave` es `UNIQUE`. `TipoDato ∈ {ENTERO, DECIMAL, TEXTO, BOOLEAN, FECHA}`.
`Valor` no vacío. Los servicios leen estos valores en tiempo de ejecución:
ninguno se codifica en el código.

**`PipelineEtapas`** — 7 columnas. PK `EtapaId`. `Codigo` y `Orden` son `UNIQUE`.
Reglas: `Orden > 0`; `PermiteCierre = 0 OR EsFinal = 1`; índice único filtrado
`WHERE PermiteCierre = 1` para garantizar **una sola etapa de cierre**.

### 4.2 S06 — Pipeline comercial

**`Oportunidades`** — 17 columnas. PK `OportunidadId`. FK a `Contactos`,
`PipelineEtapas` (etapa actual) y `Monedas`.
Reglas: `Estado ∈ {ACTIVA, GANADA, PERDIDA}`; `MontoEstimado >= 0`;
`MontoEstimado` y `MonedaCodigo` son **ambos nulos o ambos presentes**;
`GANADA` exige `FechaResultadoUtc`; `PERDIDA` exige `FechaResultadoUtc` y
`MotivoPerdida`. `FechaIngresoEtapaUtc` es la base del cálculo de permanencia.

**`OportunidadEtapaHistorial`** — 10 columnas. PK `HistorialId`. FK a
`Oportunidades`, `PipelineEtapas` por origen (nullable, es nulo en la creación)
y destino. Es la traza auditable del embudo: cada avance inserta una fila con
usuario, motivo y `CorrelationId`.

**`Proyectos`** — 13 columnas. PK `ProyectoId`. `Codigo` es `UNIQUE`.
FK a `Monedas`. `MontoObjetivo >= 0` o nulo. Siembra `PRY-001` (Expansión
retail, 5 000 000 PEN) y `PRY-002` (Capital de trabajo, 2 500 000 PEN).
El cierre de inversión apunta al proyecto que recibe el capital.

### 4.3 S12/S13 — KYC y control de tiempos

**`KycDocumentosRequeridos`** — 7 columnas. PK `DocumentoRequeridoId`.
`Codigo` es `UNIQUE`; `Orden > 0`. Es el checklist configurable: agregar un
documento nuevo no exige tocar código.

**`KycExpedientes`** — 15 columnas. PK `KycExpedienteId`. FK a `Oportunidades`
y `Contactos`. Un expediente por oportunidad (`UNIQUE`).
Reglas: `Estado ∈ {PENDIENTE, EN_PROCESO, VALIDADO, RECHAZADO}`; si el estado
es `VALIDADO` o `RECHAZADO`, `FechaDictamenUtc` es obligatoria (no puede haber
dictamen sin fecha).

**`KycDocumentos`** — 16 columnas. PK `KycDocumentoId`. FK a `KycExpedientes`
y `KycDocumentosRequeridos`. `UNIQUE (KycExpedienteId, DocumentoRequeridoId)`:
un documento del checklist aparece una sola vez por expediente.
Reglas: `Estado ∈ {PENDIENTE, RECIBIDO, VALIDADO, RECHAZADO}`.
`ArchivoReferencia` guarda la referencia al almacenamiento, no el binario.

El SLA no se materializa como columna: se calcula con
`KYC_SLA_DIAS` y `KycExpedientes.FechaInicioUtc`, para que un cambio de
parámetro no obligue a reescribir filas históricas.

### 4.4 S15 — Cierre de inversión

**`CierresInversion`** — 17 columnas. PK `CierreId`. FK a `Oportunidades`,
`Proyectos` y `Monedas`. **`OportunidadId` es `UNIQUE`**: una oportunidad
produce a lo sumo un cierre vigente.
Reglas: `MontoCaptado > 0`; `Estado ∈ {REGISTRADO, ANULADO}`; si es `ANULADO`
exige `FechaAnulacionUtc` y `MotivoAnulacion`. Un cierre anulado conserva la
fila: no se borra, se anula con motivo.

### 4.5 S16/S17 — Comisiones y reversión

**`Comisiones`** — 18 columnas. PK `ComisionId`. FK a `CierresInversion` y
`Monedas`. **`CierreId` es `UNIQUE`**: una comisión por cierre.
Reglas: `MontoCaptado > 0`; `0 < TasaPorcentaje <= 100`;
`0 <= PorcentajeIgv <= 100`; los tres importes positivos; y la regla contable
**`BaseImponible + ImporteIgv = ImporteTotal`** verificada por `CHECK`.
Estado `∈ {PENDIENTE, LIQUIDADA, REVERTIDA}`.

Verificación aritmética contra el ejemplo de APF2 (captación 200 000, tasa 3 %,
IGV 18 %):

| Concepto | Cálculo | Importe |
| --- | --- | --- |
| Comisión total | 200 000 × 3 % | 6 000.00 |
| Base imponible | 6 000 / 1.18 | 5 084.75 |
| IGV | 6 000 − 5 084.75 | 915.25 |

**`ComisionReversiones`** — 12 columnas. PK `ReversionId`. FK a `Comisiones`.
`UNIQUE (ComisionId)`: una comisión se revierte una sola vez.
`MotivoCodigo ∈ {KYC_RECHAZADO, DESEMBOLSO_NO_CONCRETADO}`. Guarda
`EstadoKyc` y `EstadoDesembolso` como evidencia del estado que motivó la
reversión, más `FechaEvaluacionUtc` y `FechaReversionUtc`.

### 4.6 Liquidación a freelance

**`Liquidaciones`** — 17 columnas. PK `LiquidacionId`. FK a `Monedas`.
`UNIQUE (FreelanceId, Anio, Mes, MonedaCodigo)`: una liquidación por persona,
periodo y moneda. Reglas: `2000 <= Anio <= 2100`, `1 <= Mes <= 12`;
`Estado ∈ {ABIERTA, CERRADA, PAGADA}`; totales no negativos con importe total
positivo y **`TotalBase + TotalIgv = TotalImporte`**.

**`LiquidacionDetalle`** — 7 columnas. PK `LiquidacionDetalleId`. FK a
`Liquidaciones` y `Comisiones`. `UNIQUE (ComisionId)`: una comisión se liquida
una sola vez. Guarda el desglose del momento (`ImporteBase`, `ImporteIgv`,
`ImporteTotal`), de modo que un recálculo posterior no altere lo ya pagado.

> S18 (pagos) queda **modelado pero fuera del corte**: las tablas existen para
> que la comisión tenga destino contable, pero no se exponen endpoints.

### 4.7 S40 — Auditoría de solo anexado

**`AuditoriaEventos`** — 16 columnas. PK `EventoId bigint`.
`ServicioCodigo` no vacío; `Resultado ∈ {EXITO, RECHAZO, ERROR}`;
`ValorAnterior`, `ValorNuevo` y `Detalle` deben ser JSON válido o nulos
(`ISJSON`). Registra usuario, rol, correlación, IP y `user-agent`.

El disparador `TR_AuditoriaEventos_SoloAnexado` **rechaza `UPDATE` y `DELETE`**,
incluso para `db_owner`. Es la garantía técnica de que la bitácora no se puede
reescribir. Verificado: un `DELETE` falla con
`AuditoriaEventos es de solo anexado: no admite UPDATE ni DELETE.`

### 4.8 ESB lógico — outbox e idempotencia

**`OutboxEventos`** — 13 columnas. PK `OutboxId bigint`. Patrón *transactional
outbox*: el evento se escribe en la misma transacción que el cambio de negocio.
`IdempotencyKey` es `UNIQUE`. `Payload` debe ser JSON válido. `Intentos >= 0`.
`Estado ∈ {PENDIENTE, EN_PROCESO, PUBLICADO, FALLIDO, MUERTO}`.
`ProximoIntentoUtc` implementa el *backoff* exponencial.

**`OutboxConsumidos`** — 6 columnas. PK `ConsumidoId bigint`. FK a
`OutboxEventos`. `UNIQUE (OutboxId, Consumidor)`: un consumidor procesa cada
evento una sola vez. `Resultado ∈ {PROCESADO, ERROR}`.

**`IdempotenciaSolicitudes`** — 10 columnas. PK `IdempotenciaId bigint`.
`UNIQUE (Clave, Endpoint)`. `HashSolicitud char(64)` (SHA-256 del cuerpo).
`Estado ∈ {EN_PROCESO, COMPLETADA}`; una solicitud `COMPLETADA` debe tener
código y cuerpo de respuesta. Repetir la clave con el mismo hash devuelve la
respuesta original; con hash distinto, `422`.

### 4.9 Saga BPM

**`SagaInstancias`** — 9 columnas. PK `SagaInstanciaId uniqueidentifier`
(generado por la aplicación, no por la base). FK a `Oportunidades`.
`CorrelationId` es `UNIQUE` y es la clave de consulta del endpoint público.
`Proceso` es `UNIQUE` por instancia. `Estado ∈ {EN_CURSO, COMPLETADA, FALLIDA,
COMPENSADA}`; `PasoActual >= 0`.

**`SagaPasos`** — 10 columnas. PK `SagaPasoId bigint`. FK a `SagaInstancias`.
`UNIQUE (SagaInstanciaId, Orden)`; `Orden > 0`.
`Estado ∈ {PENDIENTE, EN_CURSO, COMPLETADO, FALLIDO, COMPENSADO}`.
`Payload` debe ser JSON válido o nulo.

### 4.10 Vista de lectura

`vw_OportunidadResumen` une oportunidad + contacto + etapa + último expediente
KYC + cierre vigente + comisión. Existe para que el tablero del embudo no
reproduzca la lógica de unión en cada consulta.

## 5. Enumeraciones (todas con `CHECK` nombrado)

| Tabla | Columna | Valores |
| --- | --- | --- |
| `Oportunidades` | `Estado` | `ACTIVA`, `GANADA`, `PERDIDA` |
| `KycExpedientes` | `Estado` | `PENDIENTE`, `EN_PROCESO`, `VALIDADO`, `RECHAZADO` |
| `KycDocumentos` | `Estado` | `PENDIENTE`, `RECIBIDO`, `VALIDADO`, `RECHAZADO` |
| `CierresInversion` | `Estado` | `REGISTRADO`, `ANULADO` |
| `Comisiones` | `Estado` | `PENDIENTE`, `LIQUIDADA`, `REVERTIDA` |
| `ComisionReversiones` | `MotivoCodigo` | `KYC_RECHAZADO`, `DESEMBOLSO_NO_CONCRETADO` |
| `Liquidaciones` | `Estado` | `ABIERTA`, `CERRADA`, `PAGADA` |
| `AuditoriaEventos` | `Resultado` | `EXITO`, `RECHAZO`, `ERROR` |
| `OutboxEventos` | `Estado` | `PENDIENTE`, `EN_PROCESO`, `PUBLICADO`, `FALLIDO`, `MUERTO` |
| `OutboxConsumidos` | `Resultado` | `PROCESADO`, `ERROR` |
| `IdempotenciaSolicitudes` | `Estado` | `EN_PROCESO`, `COMPLETADA` |
| `SagaInstancias` | `Estado` | `EN_CURSO`, `COMPLETADA`, `FALLIDA`, `COMPENSADA` |
| `SagaPasos` | `Estado` | `PENDIENTE`, `EN_CURSO`, `COMPLETADO`, `FALLIDO`, `COMPENSADO` |

## 6. Parámetros de negocio sembrados

APF2 dejó estas cifras abiertas. En lugar de codificarlas, se siembran como
datos y el servicio las lee en tiempo de ejecución.

| Clave | Valor | Tipo | Uso |
| --- | --- | --- | --- |
| `KYC_SLA_DIAS` | 15 | ENTERO | Plazo objetivo de dictamen |
| `COMISION_TASA_PORCENTAJE` | 3.00 | DECIMAL | Tasa de comisión del freelance |
| `COMISION_IGV_PORCENTAJE` | 18.00 | DECIMAL | IGV aplicado a la comisión |
| `REVERSION_PLAZO_DIAS` | 30 | ENTERO | Ventana máxima para revertir |
| `LIQUIDACION_DIA_PAGO` | 10 | ENTERO | Día de pago del periodo |
| `ESB_MAX_REINTENTOS` | 5 | ENTERO | Reintentos antes de `MUERTO` |
| `ESB_BACKOFF_BASE_SEGUNDOS` | 10 | ENTERO | Base del backoff exponencial |
| `ESB_BACKOFF_MAX_SEGUNDOS` | 300 | ENTERO | Tope del backoff |

## 7. Contrato HTTP

`docs/openapi.yaml` — OpenAPI **3.1.0**, 39 rutas / 51 operaciones: 22 ya
implementadas (documentadas tal como se comportan hoy) y **29 nuevas**.

### 7.1 Superficie existente (22 operaciones)

| Grupo | Operaciones | Roles |
| --- | --- | --- |
| Contactos | 19 (`/contactos`, actividad, representantes, direcciones, trabajos) | `ejecutivo_inversion` |
| Ubigeo | 1 (`/distritos`) | `ejecutivo_inversion` |
| CIIU | 1 (`/ciiu`) | `ejecutivo_inversion` |
| Reportes | 1 (`/reportes/{key}`) | Cualquier autenticado con autorización por reporte |

### 7.2 Superficie nueva (29 operaciones)

| Servicio | Operaciones | Endpoints | Roles |
| --- | --- | --- | --- |
| **S06** Pipeline | 7 | `GET /pipeline/etapas`, `GET|POST /pipeline/oportunidades`, `GET /pipeline/oportunidades/{id}`, `POST …/avanzar`, `POST …/perder`, `GET …/historial` | `ejecutivo_inversion`; lectura también `direccion_comercial`, `gerencia_general` |
| **S12/S13** KYC | 8 | `GET /kyc/documentos-requeridos`, `GET|POST /kyc/expedientes`, `GET /kyc/expedientes/{id}`, `POST …/documentos`, `PATCH …/documentos/{docId}`, `POST …/dictamen`, `GET …/sla` | `ejecutivo_inversion` + `compliance`; **dictamen solo `compliance`** |
| **S15** Cierre | 3 | `GET|POST /cierres`, `GET /cierres/{id}` | Registro `ejecutivo_inversion`; lectura además `direccion_comercial`, `administracion`, `gerencia_general` |
| **S16/S17** Comisiones | 3 | `GET /comisiones`, `GET /comisiones/{id}`, `POST /comisiones/{id}/reversion` | Lectura: cuatro roles; **reversión `administracion` + `compliance`** |
| **S40** Auditoría | 2 | `GET /auditoria/eventos`, `GET /auditoria/eventos/{id}` | `administracion`, `gerencia_general`, `compliance` |
| **ESB** | 4 | `GET /esb/outbox`, `GET /esb/outbox/fallidos`, `GET /esb/outbox/{id}`, `POST /esb/outbox/procesar` | `administracion` |
| **Saga** | 1 | `GET /sagas/{correlationId}` | Cuatro roles |
| **Proyectos** | 1 | `GET /proyectos` | `ejecutivo_inversion`, `direccion_comercial`, `administracion` |

### 7.3 Reglas transversales del contrato

- Prefijo `/api` en todas las rutas (valor por defecto de Azure Functions;
  `host.json` no redefine `routePrefix`).
- `X-Correlation-Id` en todos los endpoints nuevos; si falta, el backend lo
  genera y lo devuelve en la respuesta y en la auditoría.
- `Idempotency-Key` obligatorio **solo** en `POST /cierres` y
  `POST /comisiones/{id}/reversion`: los dos efectos irreversibles.
- Errores: se documenta la forma **realmente implementada**
  (`{message}` y `{message, errors:{fieldErrors,formErrors}}`), no RFC 9457.
- Listados existentes: array sin envoltorio, documentados como son. Listados
  nuevos: `{items, page, pageSize, total}` con `pageSize` máximo 100.
- Identificadores: `int` como número; `bigint` (auditoría, outbox) como string.

## 8. Supuestos a confirmar

Los siguientes puntos **no están fijados** por el documento de indicaciones de
la Etapa 3. Se eligieron por criterio y se marcan para validación explícita:

1. **Nombres de las 8 etapas del pipeline.** `PROSPECTO → CONTACTADO →
   CALIFICADO → REUNION → COTIZACION → NEGOCIACION → KYC_EN_PROCESO →
   CERRADO_GANADO`. Solo `CERRADO_GANADO` permite cierre. Al ser catálogo,
   renombrar no exige tocar código.
2. **Checklist KYC de 5 documentos.** `DOC_IDENTIDAD`, `FICHA_RUC`,
   `SUSTENTO_FONDOS`, `DECLARACION_PEP`, `CONTRATO_FIRMADO`; los cinco
   obligatorios. Es catálogo, igual que las etapas.
3. **SLA de KYC = 15 días** y **ventana de reversión = 30 días**. Ambos son
   parámetros, no constantes.
4. **Separación de roles entre registro y dictamen.** Hoy el frontend define
   `ROLES_KYC = [FREELANCE]`; el modelo propone que el freelance **cargue** la
   documentación y que **solo `compliance` dicte** el expediente. Es una
   contradicción conocida con el código actual y requiere decisión.
5. **Reversión de comisión** habilitada a `administracion` + `compliance`.
6. **Tasa de comisión 3 % e IGV 18 %.** Sembrados como parámetros.
7. **Un cierre por oportunidad y una comisión por cierre** (`UNIQUE`). Si el
   negocio admite cierres parciales sucesivos, hay que quitar esas restricciones.
8. **Moneda del cierre = moneda de la oportunidad.** No se convierte.

## 9. Fuera de alcance de esta entrega

- Implementación de controladores, servicios y repositorios: **no iniciada a
  propósito**, hasta que se valide este documento.
- S18 (ejecución de pagos y comprobantes): tablas modeladas, endpoints fuera.
- Notificaciones al cliente y envío real de correo.
- Integración con un bus externo: el ESB es lógico (outbox + despacho), no un
  broker desplegado.
- Migración de datos históricos: el esquema nace vacío salvo catálogos.

## 10. Evidencia de verificación

Ejecutado sobre `maziapp-sql` (SQL Server 2022 en Docker, puerto 14333):

- `init-local.ps1` completo, salida 0: crea la base, aplica 01→04 y deja 34
  tablas.
- Cadena funcional completa en una transacción con `ROLLBACK`:
  oportunidad → KYC → cierre → comisión → reversión → liquidación → outbox →
  auditoría → saga. Todas las filas insertadas.
- 9 pruebas negativas rechazadas por la base: monto no positivo, estado fuera
  del dominio, comisión sin desglose contable, doble cierre por oportunidad,
  doble comisión por cierre, doble reversión, `UPDATE`/`DELETE` sobre auditoría
  y `Payload` no JSON.
- Doble aplicación de `04-apf3-seed.sql` sin duplicados (idempotencia).
- `docs/openapi.yaml`: válido con `@redocly/cli lint` (OpenAPI 3.1.0). El único
  aviso restante es que el servidor local apunta a `localhost`, lo cual es
  intencional: documenta el entorno de desarrollo real.
