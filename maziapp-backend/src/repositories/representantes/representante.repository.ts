import { getPool, sql } from "../../config/sql";

/**
 * Repository de Representantes (Fase Representantes). Mismo patron
 * exacto que contacto.repository.ts: todo valor de usuario viaja como
 * parametro `.input(...)`, nunca concatenado en el texto de la query;
 * el unico texto interpolado en las queries son nombres de columna/
 * tabla FIJOS del propio codigo, jamas derivados de `req.body`.
 */

interface RepresentanteRow {
  RepresentanteId: number;
  TipoDocumento: string;
  NumeroDocumento: string;
  Nombres: string;
  Apellidos: string;
  Celular: string | null;
  Correo: string | null;
}

interface ContactoRepresentanteRow {
  ContactoRepresentanteId: number;
  ContactoId: number;
  RepresentanteId: number;
  Cargo: string;
  Activo: boolean;
  TipoDocumento: string;
  NumeroDocumento: string;
  Nombres: string;
  Apellidos: string;
  Celular: string | null;
  Correo: string | null;
}

function toDomainRepresentante(row: RepresentanteRow) {
  return {
    representanteId: String(row.RepresentanteId),
    tipoDocumento: row.TipoDocumento,
    numeroDocumento: row.NumeroDocumento,
    nombres: row.Nombres,
    apellidos: row.Apellidos,
    celular: row.Celular,
    correo: row.Correo,
  };
}

export type RepresentanteDomain = ReturnType<typeof toDomainRepresentante>;

function toDomainContactoRepresentante(row: ContactoRepresentanteRow) {
  return {
    contactoRepresentanteId: String(row.ContactoRepresentanteId),
    representanteId: String(row.RepresentanteId),
    tipoDocumento: row.TipoDocumento,
    numeroDocumento: row.NumeroDocumento,
    nombres: row.Nombres,
    apellidos: row.Apellidos,
    cargo: row.Cargo,
    celular: row.Celular,
    correo: row.Correo,
  };
}

export type ContactoRepresentanteDomain = ReturnType<typeof toDomainContactoRepresentante>;

// 🔍 Representante por documento -- unica forma en la que
// representante.service.ts decide si REUTILIZAR una persona existente
// o crear una nueva (Fase Representantes, decision 5: nunca duplicar
// la persona por empresa).
export async function findRepresentanteByDocumento(
  tipoDocumento: string,
  numeroDocumento: string,
): Promise<RepresentanteDomain | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("tipoDocumento", sql.NVarChar(20), tipoDocumento)
    .input("numeroDocumento", sql.NVarChar(20), numeroDocumento)
    .query(
      `SELECT * FROM dbo.Representantes WHERE TipoDocumento = @tipoDocumento AND NumeroDocumento = @numeroDocumento`,
    );

  const row = result.recordset[0];

  return row ? toDomainRepresentante(row) : null;
}

export interface NuevoRepresentante {
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  correo: string | null;
  creadoNombre: string;
  creadoCorreo: string;
  creadoId: string;
}

// 💾 Crea la PERSONA representante. Nunca se llama si ya existe una
// fila por (TipoDocumento, NumeroDocumento) -- eso lo decide
// representante.service.ts llamando primero a
// findRepresentanteByDocumento. UQ_Representantes_TipoDocumento_
// NumeroDocumento es la red de seguridad ante una carrera de inserts
// concurrentes con el mismo documento; su violacion (2601/2627) se
// traduce a 409 en la capa de Function, igual que createContacto.ts.
export async function saveRepresentante(
  input: NuevoRepresentante,
): Promise<RepresentanteDomain> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("tipoDocumento", sql.NVarChar(20), input.tipoDocumento)
    .input("numeroDocumento", sql.NVarChar(20), input.numeroDocumento)
    .input("nombres", sql.NVarChar(120), input.nombres)
    .input("apellidos", sql.NVarChar(120), input.apellidos)
    .input("celular", sql.NVarChar(20), input.celular)
    .input("correo", sql.NVarChar(150), input.correo)
    .input("creadoNombre", sql.NVarChar(200), input.creadoNombre)
    .input("creadoCorreo", sql.NVarChar(150), input.creadoCorreo)
    .input("creadoId", sql.UniqueIdentifier, input.creadoId).query(`
      INSERT INTO dbo.Representantes
        (TipoDocumento, NumeroDocumento, Nombres, Apellidos, Celular, Correo,
         CreadoFecha, CreadoNombre, CreadoCorreo, CreadoId)
      OUTPUT inserted.*
      VALUES
        (@tipoDocumento, @numeroDocumento, @nombres, @apellidos, @celular, @correo,
         SYSUTCDATETIME(), @creadoNombre, @creadoCorreo, @creadoId)
    `);

  return toDomainRepresentante(result.recordset[0]);
}

export interface ActualizacionRepresentante {
  nombres: string;
  apellidos: string;
  celular: string | null;
  correo: string | null;
  actualizadoNombre: string;
  actualizadoCorreo: string;
  actualizadoId: string;
}

// ✏️ Actualiza los datos GLOBALES de la persona (dbo.Representantes) --
// afecta a TODAS las relaciones/empresas donde este representante esta
// activo (decision explicita de esta fase, confirmada por el usuario:
// Nombres/Apellidos/Celular/Correo son un dato compartido, no por
// empresa -- a diferencia de Cargo, que vive en updateCargoRelacion).
// NUNCA toca TipoDocumento/NumeroDocumento (ver representante.
// validator.ts::representanteUpdateBaseSchema) ni ninguna fila de
// dbo.ContactoRepresentante -- no rompe ninguna asociacion existente.
// No valida aqui pertenencia a ninguna empresa: eso ya lo verifico
// representante.service.ts::actualizarRepresentante llamando primero
// a findRelacion.
export async function updateRepresentante(
  representanteId: number,
  input: ActualizacionRepresentante,
): Promise<void> {
  const pool = await getPool();

  await pool
    .request()
    .input("representanteId", sql.Int, representanteId)
    .input("nombres", sql.NVarChar(120), input.nombres)
    .input("apellidos", sql.NVarChar(120), input.apellidos)
    .input("celular", sql.NVarChar(20), input.celular)
    .input("correo", sql.NVarChar(150), input.correo)
    .input("actualizadoNombre", sql.NVarChar(200), input.actualizadoNombre)
    .input("actualizadoCorreo", sql.NVarChar(150), input.actualizadoCorreo)
    .input("actualizadoId", sql.UniqueIdentifier, input.actualizadoId).query(`
      UPDATE dbo.Representantes
      SET Nombres = @nombres, Apellidos = @apellidos, Celular = @celular, Correo = @correo,
          ActualizadoFecha = SYSUTCDATETIME(), ActualizadoNombre = @actualizadoNombre,
          ActualizadoCorreo = @actualizadoCorreo, ActualizadoId = @actualizadoId
      WHERE RepresentanteId = @representanteId
    `);
}

// ✏️ Actualiza el Cargo de UNA relacion ACTIVA (dbo.ContactoRepresentante)
// -- por empresa, nunca global (a diferencia de updateRepresentante).
// Mismo guard `WHERE ... AND Activo = 1` que reactivarRelacion/
// desactivarRelacion: si la relacion fue desactivada entre que el
// Service la encontro (findRelacion) y este UPDATE, `recordset` viene
// vacio y el Service lo interpreta como "nada que actualizar" -- 404
// (anti-enumeracion), igual que el resto del modulo.
export async function updateCargoRelacion(
  contactoRepresentanteId: number,
  cargo: string,
  actualizadoId: string,
): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("contactoRepresentanteId", sql.Int, contactoRepresentanteId)
    .input("cargo", sql.NVarChar(100), cargo)
    .input("actualizadoId", sql.UniqueIdentifier, actualizadoId).query(`
      UPDATE dbo.ContactoRepresentante
      SET Cargo = @cargo, ActualizadoFecha = SYSUTCDATETIME(), ActualizadoId = @actualizadoId
      OUTPUT inserted.ContactoRepresentanteId
      WHERE ContactoRepresentanteId = @contactoRepresentanteId AND Activo = 1
    `);

  return result.recordset.length > 0;
}

// 🔍 Relación + datos de la persona (mismo JOIN que
// findRepresentantesByContacto), por ContactoRepresentanteId -- usado
// para devolver el representante ya actualizado en la respuesta de
// PATCH sin traer toda la lista de la empresa. No filtra por Activo:
// quien llama (representante.service.ts) ya confirmó que la relación
// sigue activa antes de llegar aquí.
export async function findContactoRepresentantePorId(
  contactoRepresentanteId: number,
): Promise<ContactoRepresentanteDomain | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("contactoRepresentanteId", sql.Int, contactoRepresentanteId).query(`
      SELECT cr.ContactoRepresentanteId, cr.ContactoId, cr.RepresentanteId, cr.Cargo, cr.Activo,
             r.TipoDocumento, r.NumeroDocumento, r.Nombres, r.Apellidos, r.Celular, r.Correo
      FROM dbo.ContactoRepresentante cr
      INNER JOIN dbo.Representantes r ON r.RepresentanteId = cr.RepresentanteId
      WHERE cr.ContactoRepresentanteId = @contactoRepresentanteId
    `);

  const row = result.recordset[0];

  return row ? toDomainContactoRepresentante(row) : null;
}

export interface RelacionExistente {
  contactoRepresentanteId: number;
  activo: boolean;
}

// 🔍 Relacion (activa o no) entre un Contacto y un Representante --
// decide si el alta debe crear una relacion nueva, reactivar una
// existente (Activo 0 -> 1), o rechazar por ya-activa (409).
export async function findRelacion(
  contactoId: number,
  representanteId: number,
): Promise<RelacionExistente | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("contactoId", sql.Int, contactoId)
    .input("representanteId", sql.Int, representanteId)
    .query(
      `SELECT ContactoRepresentanteId, Activo FROM dbo.ContactoRepresentante
       WHERE ContactoId = @contactoId AND RepresentanteId = @representanteId`,
    );

  const row = result.recordset[0];

  return row
    ? { contactoRepresentanteId: row.ContactoRepresentanteId, activo: !!row.Activo }
    : null;
}

export interface NuevaRelacion {
  contactoId: number;
  representanteId: number;
  cargo: string;
  creadoId: string;
}

// 💾 Crea la RELACION (nunca la persona) -- Fase Representantes,
// decision 3: Cargo vive aqui, nunca en dbo.Representantes.
export async function saveRelacion(input: NuevaRelacion): Promise<number> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("contactoId", sql.Int, input.contactoId)
    .input("representanteId", sql.Int, input.representanteId)
    .input("cargo", sql.NVarChar(100), input.cargo)
    .input("creadoId", sql.UniqueIdentifier, input.creadoId).query(`
      INSERT INTO dbo.ContactoRepresentante
        (ContactoId, RepresentanteId, Cargo, Activo, CreadoFecha, CreadoId)
      OUTPUT inserted.ContactoRepresentanteId
      VALUES
        (@contactoId, @representanteId, @cargo, 1, SYSUTCDATETIME(), @creadoId)
    `);

  return result.recordset[0].ContactoRepresentanteId as number;
}

// ✏️ Reactiva una relacion previamente desactivada (Activo 0 -> 1),
// actualizando tambien Cargo por si cambio desde la ultima vez que
// este representante estuvo activo en esta empresa (Fase
// Representantes, decision 4: soft delete reversible).
export async function reactivarRelacion(
  contactoRepresentanteId: number,
  cargo: string,
  actualizadoId: string,
): Promise<void> {
  const pool = await getPool();

  await pool
    .request()
    .input("contactoRepresentanteId", sql.Int, contactoRepresentanteId)
    .input("cargo", sql.NVarChar(100), cargo)
    .input("actualizadoId", sql.UniqueIdentifier, actualizadoId).query(`
      UPDATE dbo.ContactoRepresentante
      SET Activo = 1, Cargo = @cargo, ActualizadoFecha = SYSUTCDATETIME(), ActualizadoId = @actualizadoId
      WHERE ContactoRepresentanteId = @contactoRepresentanteId
    `);
}

// ✏️ Desactiva (soft delete) -- nunca DELETE fisico. Solo afecta una
// fila que este actualmente activa (WHERE ... AND Activo = 1); si ya
// estaba inactiva, `recordset` viene vacio y el service lo interpreta
// como "nada que desactivar" -- 404 en la capa de Function.
export async function desactivarRelacion(
  contactoRepresentanteId: number,
  actualizadoId: string,
): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("contactoRepresentanteId", sql.Int, contactoRepresentanteId)
    .input("actualizadoId", sql.UniqueIdentifier, actualizadoId).query(`
      UPDATE dbo.ContactoRepresentante
      SET Activo = 0, ActualizadoFecha = SYSUTCDATETIME(), ActualizadoId = @actualizadoId
      OUTPUT inserted.ContactoRepresentanteId
      WHERE ContactoRepresentanteId = @contactoRepresentanteId AND Activo = 1
    `);

  return result.recordset.length > 0;
}

// 📋 Representantes ACTIVOS de una empresa (JOIN, Activo = 1) --
// GET /api/contactos/{id}/representantes.
export async function findRepresentantesByContacto(contactoId: number) {
  const pool = await getPool();

  const result = await pool.request().input("contactoId", sql.Int, contactoId).query(`
      SELECT cr.ContactoRepresentanteId, cr.ContactoId, cr.RepresentanteId, cr.Cargo, cr.Activo,
             r.TipoDocumento, r.NumeroDocumento, r.Nombres, r.Apellidos, r.Celular, r.Correo
      FROM dbo.ContactoRepresentante cr
      INNER JOIN dbo.Representantes r ON r.RepresentanteId = cr.RepresentanteId
      WHERE cr.ContactoId = @contactoId AND cr.Activo = 1
      ORDER BY cr.ContactoRepresentanteId DESC
    `);

  return result.recordset.map(toDomainContactoRepresentante);
}
