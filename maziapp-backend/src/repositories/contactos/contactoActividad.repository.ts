import { getPool, sql } from "../../config/sql";

/**
 * Repository de Actividad (laboral/económica) -- Fase Actividad.
 *
 * IMPORTANTE -- distinto de dbo.Actividades (schema_v2_Contactos_
 * propuesto.sql, bitácora de interacciones LLAMADA/WHATSAPP/CORREO/
 * REUNION/OTRO). Este repository trabaja sobre dbo.ContactoActividad
 * (1:1, Grado de instrucción/Profesión para NATURAL, CIIU para
 * JURIDICA) -- ver schema_v6_CatalogoCiiu_propuesto.sql /
 * schema_v7_ActividadContacto_propuesto.sql.
 *
 * 🔐 ETAPA 3 (arquitectura independiente de Trabajos Dependientes,
 * patrón Direcciones): este repository YA NO escribe en
 * dbo.ContactoTrabajoDependiente -- esa responsabilidad es
 * EXCLUSIVA de trabajoDependiente.repository.ts (Etapa 2), la única
 * fuente de ESCRITURA para esa tabla desde ahora. `findTrabajosByContacto`/
 * `toDomainTrabajo` (lectura) se dejan aquí TEMPORALMENTE, sin
 * modificar su comportamiento, por si algún llamador legado todavía
 * los necesita durante la transición -- ya NO los invoca
 * `contactoActividad.service.ts` (ver obtenerActividad, que dejó de
 * incluir `trabajos` en su respuesta). La nueva fuente de verdad para
 * leer Trabajos Dependientes es
 * GET /api/contactos/{contactoId}/trabajos-dependientes
 * (trabajoDependiente.repository.ts::findTrabajosByContacto, que
 * además filtra `Activo = 1` y ya conoce las columnas `Activo`/
 * `FechaModificacion` de la Etapa 1 -- estas dos funciones NO son la
 * misma, aunque tengan el mismo nombre).
 *
 * Mismo patrón que el resto del módulo Contactos: todo valor de
 * usuario viaja como parámetro `.input(...)`, nunca concatenado en el
 * texto de la query.
 */

interface ContactoActividadRow {
  ContactoId: number;
  GradoInstruccion: string | null;
  ProfesionOcupacion: string | null;
  CiiuId: number | null;
  CiiuCodigo: string | null; // resuelto por LEFT JOIN a dbo.CatalogoCiiu
  CiiuDescripcion: string | null; // idem
  CreadoFecha: Date;
  CreadoNombre: string | null;
  CreadoCorreo: string | null;
  CreadoId: string | null;
  ActualizadoFecha: Date | null;
  ActualizadoNombre: string | null;
  ActualizadoCorreo: string | null;
  ActualizadoId: string | null;
}

// 🔐 Igual que Direcciones resuelve Distrito/Provincia/Departamento por
// JOIN (nunca reconstruidos en el Frontend) -- CiiuCodigo/CiiuDescripcion
// se resuelven aquí (LEFT JOIN a dbo.CatalogoCiiu, ver SELECT abajo),
// nunca en el Frontend. `null` para NATURAL (CiiuId siempre NULL) o si
// el código todavía no fue asignado.
function toDomainActividad(row: ContactoActividadRow) {
  return {
    contactoId: String(row.ContactoId),
    gradoInstruccion: row.GradoInstruccion,
    profesionOcupacion: row.ProfesionOcupacion,
    ciiuId: row.CiiuId,
    ciiuCodigo: row.CiiuCodigo,
    ciiuDescripcion: row.CiiuDescripcion,
    creado: {
      fecha: row.CreadoFecha ? row.CreadoFecha.toISOString() : null,
      nombre: row.CreadoNombre,
      correo: row.CreadoCorreo,
      id: row.CreadoId,
    },
    actualizado: row.ActualizadoFecha
      ? {
          fecha: row.ActualizadoFecha.toISOString(),
          nombre: row.ActualizadoNombre,
          correo: row.ActualizadoCorreo,
          id: row.ActualizadoId,
        }
      : null,
  };
}

export type ContactoActividadDomain = ReturnType<typeof toDomainActividad>;

// 🔍 Fila de Actividad de un contacto, o null si todavía no la guardó
// (primer ingreso a la pestaña, antes de cualquier "Guardar").
export async function findActividadByContacto(
  contactoId: number,
): Promise<ContactoActividadDomain | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("contactoId", sql.Int, contactoId).query(`
      SELECT
        ca.ContactoId, ca.GradoInstruccion, ca.ProfesionOcupacion, ca.CiiuId,
        ciiu.Codigo AS CiiuCodigo, ciiu.Descripcion AS CiiuDescripcion,
        ca.CreadoFecha, ca.CreadoNombre, ca.CreadoCorreo, ca.CreadoId,
        ca.ActualizadoFecha, ca.ActualizadoNombre, ca.ActualizadoCorreo, ca.ActualizadoId
      FROM dbo.ContactoActividad ca
      LEFT JOIN dbo.CatalogoCiiu ciiu ON ciiu.CiiuId = ca.CiiuId
      WHERE ca.ContactoId = @contactoId
    `);

  const row = result.recordset[0];

  return row ? toDomainActividad(row) : null;
}

interface TrabajoDependienteRow {
  Id: number;
  ContactoId: number;
  EmpresaContactoId: number | null;
  EmpresaNombreLibre: string | null;
  EmpresaRazonSocial: string | null; // resuelto por LEFT JOIN cuando EmpresaContactoId no es NULL
  Cargo: string;
  Desde: Date;
  Hasta: Date | null;
  CreadoFecha: Date;
  CreadoNombre: string | null;
  CreadoId: string | null;
}

function toIsoDate(value: Date | null): string | null {
  if (!value) return null;
  // 📌 Columnas DATE de SQL Server llegan como Date en UTC medianoche --
  // se recorta a "YYYY-MM-DD" (mismo formato que envía el Frontend en
  // `desde`/`hasta`, validado como z.string().date() en el validator),
  // nunca se expone la hora ni el offset.
  return value.toISOString().slice(0, 10);
}

// 🔐 El nombre de la Empresa NUNCA se expone al Frontend como los dos
// campos técnicos de la tabla (EmpresaContactoId/EmpresaNombreLibre
// por separado) -- se resuelve aquí en un único objeto conceptual
// `empresa`, exactamente lo que la Ficha Contacto necesita para
// mostrar una sola columna "Empresa" en la tabla de Trabajos
// dependientes, sin que el Frontend tenga que decidir cuál de los dos
// campos leer.
//
// ⚠️ NO USADA por contactoActividad.service.ts desde la Etapa 3 (ver
// nota de archivo arriba) -- se conserva temporalmente junto con
// `findTrabajosByContacto` únicamente por compatibilidad; sigue
// cubierta por su propia suite de tests
// (contactoActividad.repository.test.ts, sección "lecturas").
function toDomainTrabajo(row: TrabajoDependienteRow) {
  return {
    id: String(row.Id),
    contactoId: String(row.ContactoId),
    empresa: row.EmpresaContactoId
      ? {
          tipo: "CONTACTO" as const,
          contactoId: String(row.EmpresaContactoId),
          nombre: row.EmpresaRazonSocial ?? "",
        }
      : {
          tipo: "LIBRE" as const,
          contactoId: null,
          nombre: row.EmpresaNombreLibre ?? "",
        },
    cargo: row.Cargo,
    desde: toIsoDate(row.Desde),
    hasta: toIsoDate(row.Hasta),
    creado: {
      fecha: row.CreadoFecha ? row.CreadoFecha.toISOString() : null,
      nombre: row.CreadoNombre,
    },
  };
}

export type TrabajoDependienteDomain = ReturnType<typeof toDomainTrabajo>;

const SELECT_TRABAJO_CON_EMPRESA = `
  SELECT
    td.Id, td.ContactoId, td.EmpresaContactoId, td.EmpresaNombreLibre,
    emp.RazonSocial AS EmpresaRazonSocial,
    td.Cargo, td.Desde, td.Hasta, td.CreadoFecha, td.CreadoNombre, td.CreadoId
  FROM dbo.ContactoTrabajoDependiente td
  LEFT JOIN dbo.Contactos emp ON emp.Id = td.EmpresaContactoId
`;

// 📋 Trabajos dependientes de un contacto, más recientes primero.
//
// ⚠️ NO USADA por contactoActividad.service.ts desde la Etapa 3 -- ver
// nota de archivo arriba. Conservada temporalmente por compatibilidad;
// NO filtra `Activo = 1` ni conoce `FechaModificacion` (esta tabla,
// vista desde este archivo legado, es la de antes de la Etapa 1). La
// fuente de verdad actual es
// trabajoDependiente.repository.ts::findTrabajosByContacto.
export async function findTrabajosByContacto(
  contactoId: number,
): Promise<TrabajoDependienteDomain[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("contactoId", sql.Int, contactoId)
    .query(`
      ${SELECT_TRABAJO_CON_EMPRESA}
      WHERE td.ContactoId = @contactoId
      ORDER BY td.Id DESC
    `);

  return result.recordset.map(toDomainTrabajo);
}

export interface ActividadNaturalGuardar {
  gradoInstruccion: string;
  profesionOcupacion: string;
}

export interface ActividadJuridicaGuardar {
  ciiuId: number;
}

export interface ActorAuditoria {
  id: string;
  nombre: string;
  correo: string;
}

/**
 * 💾 Guarda la Actividad (upsert de dbo.ContactoActividad) dentro de
 * una transacción SQL.
 *
 * 🔐 ETAPA 3 (arquitectura independiente de Trabajos Dependientes,
 * patrón Direcciones): esta función YA NO inserta en
 * dbo.ContactoTrabajoDependiente -- esa tabla ahora se escribe
 * EXCLUSIVAMENTE desde trabajoDependiente.repository.ts (Etapa 2).
 * Antes de esta etapa, `guardarActividadConTrabajos` también recibía
 * `trabajosNuevos` e insertaba uno por cada elemento, en la misma
 * transacción que el upsert de Actividad; esa responsabilidad fue
 * retirada por completo (nunca "dos fuentes de escritura" para la
 * misma tabla). El nombre de la función se conserva sin cambios
 * (cambio mínimo, evita tocar innecesariamente a sus llamadores) aun
 * cuando ya no maneja "trabajos" -- lo único que persiste es la
 * Actividad.
 *
 * Se mantiene como transacción SQL explícita (`sql.Transaction`),
 * aunque ahora sea una única sentencia lógica (UPDATE-then-INSERT
 * como upsert): sigue siendo la forma más simple de que el paso 1
 * (UPDATE) y su eventual INSERT de respaldo se traten como una sola
 * unidad atómica, sin reintroducir MERGE (el proyecto no lo usa en
 * ningún otro repository).
 *
 * `actividadNatural`/`actividadJuridica`: exactamente uno de los dos
 * (decidido por el Service según el `TipoContacto` real del contacto,
 * nunca ambos a la vez) -- el que no aplica llega como `null` y esta
 * función no lo toca (columnas ya NULL o se sobrescriben a NULL según
 * corresponda, ver UPDATE/INSERT abajo).
 */
export async function guardarActividadConTrabajos(
  contactoId: number,
  actividadNatural: ActividadNaturalGuardar | null,
  actividadJuridica: ActividadJuridicaGuardar | null,
  actor: ActorAuditoria,
): Promise<{ actividad: ContactoActividadDomain }> {
  const pool = await getPool();

  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    // Upsert de dbo.ContactoActividad -- UPDATE primero; si no afectó
    // ninguna fila (todavía no existe para este contacto), INSERT.
    // Nunca MERGE (el proyecto no lo usa en ningún otro repository;
    // UPDATE-then-INSERT dentro de la misma transacción es suficiente
    // para el patrón de uso real: un solo usuario editando la Ficha de
    // un contacto a la vez).
    const gradoInstruccion = actividadNatural?.gradoInstruccion ?? null;
    const profesionOcupacion = actividadNatural?.profesionOcupacion ?? null;
    const ciiuId = actividadJuridica?.ciiuId ?? null;

    const updateResult = await new sql.Request(transaction)
      .input("contactoId", sql.Int, contactoId)
      .input("gradoInstruccion", sql.NVarChar(20), gradoInstruccion)
      .input("profesionOcupacion", sql.NVarChar(150), profesionOcupacion)
      .input("ciiuId", sql.Int, ciiuId)
      .input("actorId", sql.UniqueIdentifier, actor.id)
      .input("actorNombre", sql.NVarChar(200), actor.nombre)
      .input("actorCorreo", sql.NVarChar(150), actor.correo).query(`
        UPDATE dbo.ContactoActividad
        SET GradoInstruccion = @gradoInstruccion,
            ProfesionOcupacion = @profesionOcupacion,
            CiiuId = @ciiuId,
            ActualizadoFecha = SYSUTCDATETIME(),
            ActualizadoNombre = @actorNombre,
            ActualizadoCorreo = @actorCorreo,
            ActualizadoId = @actorId
        OUTPUT inserted.ContactoId
        WHERE ContactoId = @contactoId
      `);

    if (updateResult.recordset.length === 0) {
      await new sql.Request(transaction)
        .input("contactoId", sql.Int, contactoId)
        .input("gradoInstruccion", sql.NVarChar(20), gradoInstruccion)
        .input("profesionOcupacion", sql.NVarChar(150), profesionOcupacion)
        .input("ciiuId", sql.Int, ciiuId)
        .input("actorId", sql.UniqueIdentifier, actor.id)
        .input("actorNombre", sql.NVarChar(200), actor.nombre)
        .input("actorCorreo", sql.NVarChar(150), actor.correo).query(`
          INSERT INTO dbo.ContactoActividad
            (ContactoId, GradoInstruccion, ProfesionOcupacion, CiiuId,
             CreadoFecha, CreadoNombre, CreadoCorreo, CreadoId)
          VALUES
            (@contactoId, @gradoInstruccion, @profesionOcupacion, @ciiuId,
             SYSUTCDATETIME(), @actorNombre, @actorCorreo, @actorId)
        `);
    }

    await transaction.commit();
  } catch (error) {
    // 🔐 Si el ROLLBACK en sí falla (por ejemplo, conexión ya caída),
    // se prioriza relanzar el error ORIGINAL -- es la causa real que
    // el caller (`contactoActividad.service.ts`) necesita conocer, no
    // el fallo secundario del rollback.
    try {
      await transaction.rollback();
    } catch {
      // intencional -- ver comentario arriba
    }

    throw error;
  }

  // Fuera de la transacción (ya confirmada): se relee la tabla con una
  // lectura simple, para devolver el estado real y completo tras el
  // guardado.
  const actividad = await findActividadByContacto(contactoId);

  // `actividad` no puede ser null aquí: el paso anterior acaba de
  // garantizar que la fila existe (UPDATE o INSERT, dentro de la
  // transacción ya confirmada) -- el `!` es seguro, no una suposición
  // sin evidencia.
  return { actividad: actividad! };
}
