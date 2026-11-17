import { getPool, sql } from "../../config/sql";

/**
 * Repository de Trabajos Dependientes (Fase Trabajos Dependientes --
 * arquitectura independiente, patrón Direcciones). Mismo patrón que
 * direccion.repository.ts: todo valor de usuario viaja como parámetro
 * `.input(...)`, nunca concatenado en el texto de la query; el único
 * texto interpolado en las queries son nombres de columna/tabla FIJOS
 * del propio código, jamás derivados de `req.body`.
 *
 * INDEPENDIENTE de contactoActividad.repository.ts (que sigue
 * existiendo, sin modificar, para el flujo actual de "Guardar" de
 * Actividad -- decisión explícita de la Etapa 2: no se elimina
 * `findTrabajosByContacto`/`toDomainTrabajo` de ese archivo, se
 * duplica aquí de forma independiente, ya con el filtro `Activo = 1` y
 * las columnas `Activo`/`FechaModificacion` que ese archivo todavía no
 * conoce -- agregadas por schema_v8_TrabajoDependienteActivo_propuesto.sql,
 * Etapa 1).
 *
 * La RazonSocial de la Empresa (cuando se identifica por
 * EmpresaContactoId) NUNCA se guarda como texto en
 * dbo.ContactoTrabajoDependiente -- se obtiene siempre por LEFT JOIN a
 * dbo.Contactos (ver toDomainTrabajo/SELECT_TRABAJO_CON_EMPRESA), tal
 * como exige la especificación de esta fase.
 */

interface TrabajoDependienteRow {
  Id: number;
  ContactoId: number;
  EmpresaContactoId: number | null;
  EmpresaNombreLibre: string | null;
  EmpresaRazonSocial: string | null; // resuelto por LEFT JOIN cuando EmpresaContactoId no es NULL
  Cargo: string;
  Desde: Date;
  Hasta: Date | null;
  Activo: boolean;
  CreadoFecha: Date;
  CreadoNombre: string | null;
  CreadoId: string | null;
  FechaModificacion: Date | null;
}

function toIsoDate(value: Date | null): string | null {
  if (!value) return null;
  // 📌 Columnas DATE de SQL Server llegan como Date en UTC medianoche --
  // se recorta a "YYYY-MM-DD" (mismo formato que envía el Frontend en
  // `desde`/`hasta`, validado como z.string().date() en el validator),
  // nunca se expone la hora ni el offset. Mismo criterio que
  // contactoActividad.repository.ts::toIsoDate.
  return value.toISOString().slice(0, 10);
}

// 🔐 El nombre de la Empresa NUNCA se expone al Frontend como los dos
// campos técnicos de la tabla (EmpresaContactoId/EmpresaNombreLibre
// por separado) -- se resuelve aquí en un único objeto conceptual
// `empresa`, MISMA forma de salida que
// contactoActividad.repository.ts::toDomainTrabajo (deliberado: para
// no romper lo que el Frontend ya sabe leer en fases futuras de esta
// misma iniciativa).
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
    td.Cargo, td.Desde, td.Hasta, td.Activo,
    td.CreadoFecha, td.CreadoNombre, td.CreadoId, td.FechaModificacion
  FROM dbo.ContactoTrabajoDependiente td
  LEFT JOIN dbo.Contactos emp ON emp.Id = td.EmpresaContactoId
`;

// 📋 Trabajos dependientes ACTIVOS de un contacto, más recientes
// primero -- GET /api/contactos/{id}/trabajos-dependientes. Mismo
// criterio que direccion.repository.ts::findDireccionesByContacto.
export async function findTrabajosByContacto(
  contactoId: number,
): Promise<TrabajoDependienteDomain[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("contactoId", sql.Int, contactoId)
    .query(`
      ${SELECT_TRABAJO_CON_EMPRESA}
      WHERE td.ContactoId = @contactoId AND td.Activo = 1
      ORDER BY td.Id DESC
    `);

  return result.recordset.map(toDomainTrabajo);
}

// 🔍 Un Trabajo dependiente puntual, siempre acotado también por
// ContactoId -- defensa en profundidad: aunque el Service ya haya
// verificado ownership del Contacto por separado, un Id de otro
// contacto nunca matchea esta consulta, pase lo que pase en la capa de
// arriba. Mismo criterio que
// direccion.repository.ts::findDireccionByIdYContacto.
export async function findTrabajoByIdYContacto(
  id: number,
  contactoId: number,
): Promise<TrabajoDependienteDomain | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("contactoId", sql.Int, contactoId)
    .query(`
      ${SELECT_TRABAJO_CON_EMPRESA}
      WHERE td.Id = @id AND td.ContactoId = @contactoId AND td.Activo = 1
    `);

  const row = result.recordset[0];

  return row ? toDomainTrabajo(row) : null;
}

export interface NuevoTrabajoDependiente {
  contactoId: number;
  empresaContactoId: number | null;
  empresaNombreLibre: string | null;
  cargo: string;
  desde: string;
  hasta: string | null;
  creadoNombre: string;
  creadoId: string;
}

// 💾 Crea un Trabajo dependiente. La validación de que
// EmpresaContactoId es un Contacto JURIDICA ACTIVO de la cartera del
// usuario ocurre ANTES, en trabajoDependiente.service.ts
// (TrabajoDependienteEmpresaInvalidaError) -- este repository no
// valida FKs a nivel de aplicación, solo inserta;
// FK_ContactoTrabajoDependiente_EmpresaContacto en el schema es la red
// de seguridad final ante una carrera de datos. Mismo criterio que
// direccion.repository.ts::saveDireccion.
export async function saveTrabajoDependiente(input: NuevoTrabajoDependiente): Promise<number> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("contactoId", sql.Int, input.contactoId)
    .input("empresaContactoId", sql.Int, input.empresaContactoId)
    .input("empresaNombreLibre", sql.NVarChar(200), input.empresaNombreLibre)
    .input("cargo", sql.NVarChar(100), input.cargo)
    .input("desde", sql.Date, input.desde)
    .input("hasta", sql.Date, input.hasta)
    .input("creadoNombre", sql.NVarChar(200), input.creadoNombre)
    .input("creadoId", sql.UniqueIdentifier, input.creadoId).query(`
      INSERT INTO dbo.ContactoTrabajoDependiente
        (ContactoId, EmpresaContactoId, EmpresaNombreLibre, Cargo, Desde, Hasta,
         Activo, CreadoFecha, CreadoNombre, CreadoId)
      OUTPUT inserted.Id
      VALUES
        (@contactoId, @empresaContactoId, @empresaNombreLibre, @cargo, @desde, @hasta,
         1, SYSUTCDATETIME(), @creadoNombre, @creadoId)
    `);

  return result.recordset[0].Id as number;
}

export interface ActualizacionTrabajoDependiente {
  empresaContactoId: number | null;
  empresaNombreLibre: string | null;
  cargo: string;
  desde: string;
  hasta: string | null;
}

// ✏️ Actualiza un Trabajo dependiente existente -- WHERE acotado por
// Id + ContactoId + Activo = 1 (mismo criterio de scoping que
// findTrabajoByIdYContacto): si la fila no existe, no es de este
// contacto, o ya está desactivada, `recordset` viene vacío y el
// Service lo interpreta como "no encontrado" -- 404 (anti-
// enumeración). Mismo criterio que
// direccion.repository.ts::updateDireccion -- sin columnas de
// auditoría de usuario en la edición (decisión explícita de esta
// fase, igual que Direcciones: solo FechaModificacion, sin
// Actualizado*).
export async function updateTrabajoDependiente(
  id: number,
  contactoId: number,
  input: ActualizacionTrabajoDependiente,
): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("contactoId", sql.Int, contactoId)
    .input("empresaContactoId", sql.Int, input.empresaContactoId)
    .input("empresaNombreLibre", sql.NVarChar(200), input.empresaNombreLibre)
    .input("cargo", sql.NVarChar(100), input.cargo)
    .input("desde", sql.Date, input.desde)
    .input("hasta", sql.Date, input.hasta).query(`
      UPDATE dbo.ContactoTrabajoDependiente
      SET EmpresaContactoId = @empresaContactoId, EmpresaNombreLibre = @empresaNombreLibre,
          Cargo = @cargo, Desde = @desde, Hasta = @hasta, FechaModificacion = SYSUTCDATETIME()
      OUTPUT inserted.Id
      WHERE Id = @id AND ContactoId = @contactoId AND Activo = 1
    `);

  return result.recordset.length > 0;
}

// ➖ Desactiva (soft delete) -- nunca DELETE físico. Mismo criterio que
// direccion.repository.ts::desactivarDireccion. Scoping idéntico a
// updateTrabajoDependiente (Id + ContactoId + Activo = 1).
export async function desactivarTrabajoDependiente(
  id: number,
  contactoId: number,
): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("contactoId", sql.Int, contactoId).query(`
      UPDATE dbo.ContactoTrabajoDependiente
      SET Activo = 0, FechaModificacion = SYSUTCDATETIME()
      OUTPUT inserted.Id
      WHERE Id = @id AND ContactoId = @contactoId AND Activo = 1
    `);

  return result.recordset.length > 0;
}
