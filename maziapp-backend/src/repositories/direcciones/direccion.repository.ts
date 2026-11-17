import { getPool, sql } from "../../config/sql";

/**
 * Repository de Direcciones (Fase Direcciones). Mismo patrón que
 * representante.repository.ts: todo valor de usuario viaja como
 * parámetro `.input(...)`, nunca concatenado en el texto de la query;
 * el único texto interpolado en las queries son nombres de columna/
 * tabla FIJOS del propio código, jamás derivados de `req.body`.
 *
 * El Departamento y la Provincia de una Dirección NUNCA se guardan
 * como texto en dbo.Direcciones -- se obtienen siempre por JOIN a
 * través de IdDistrito (ver toDomainDireccion/SELECT_DIRECCION_CON_UBIGEO),
 * tal como exige la especificación de esta fase.
 */

interface DireccionRow {
  IdDireccion: number;
  IdContacto: number;
  IdDistrito: number;
  Calle: string;
  Numero: string;
  DepartamentoInterior: string | null;
  Activo: boolean;
  FechaCreacion: Date;
  FechaModificacion: Date | null;
  Distrito: string;
  Provincia: string;
  Departamento: string;
}

function toDomainDireccion(row: DireccionRow) {
  return {
    idDireccion: row.IdDireccion,
    idContacto: row.IdContacto,
    idDistrito: row.IdDistrito,
    distrito: row.Distrito,
    provincia: row.Provincia,
    departamento: row.Departamento,
    calle: row.Calle,
    numero: row.Numero,
    departamentoInterior: row.DepartamentoInterior,
    activo: !!row.Activo,
    fechaCreacion: row.FechaCreacion,
    fechaModificacion: row.FechaModificacion,
  };
}

export type DireccionDomain = ReturnType<typeof toDomainDireccion>;

const SELECT_DIRECCION_CON_UBIGEO = `
  SELECT
    dir.IdDireccion, dir.IdContacto, dir.IdDistrito, dir.Calle, dir.Numero,
    dir.DepartamentoInterior, dir.Activo, dir.FechaCreacion, dir.FechaModificacion,
    di.Nombre AS Distrito, p.Nombre AS Provincia, d.Nombre AS Departamento
  FROM dbo.Direcciones dir
  INNER JOIN dbo.Distritos di ON di.IdDistrito = dir.IdDistrito
  INNER JOIN dbo.Provincias p ON p.IdProvincia = di.IdProvincia
  INNER JOIN dbo.Departamentos d ON d.IdDepartamento = p.IdDepartamento
`;

// 📋 Direcciones ACTIVAS de un contacto (JOIN, Activo = 1) --
// GET /api/contactos/{id}/direcciones.
export async function findDireccionesByContacto(idContacto: number): Promise<DireccionDomain[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("idContacto", sql.Int, idContacto)
    .query(`
      ${SELECT_DIRECCION_CON_UBIGEO}
      WHERE dir.IdContacto = @idContacto AND dir.Activo = 1
      ORDER BY dir.IdDireccion DESC
    `);

  return result.recordset.map(toDomainDireccion);
}

// 🔍 Una Dirección puntual, siempre acotada también por IdContacto --
// defensa en profundidad: aunque el Service ya haya verificado
// ownership del Contacto por separado, un IdDireccion de otro contacto
// nunca matchea esta consulta, pase lo que pase en la capa de arriba.
export async function findDireccionByIdYContacto(
  idDireccion: number,
  idContacto: number,
): Promise<DireccionDomain | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("idDireccion", sql.Int, idDireccion)
    .input("idContacto", sql.Int, idContacto)
    .query(`
      ${SELECT_DIRECCION_CON_UBIGEO}
      WHERE dir.IdDireccion = @idDireccion AND dir.IdContacto = @idContacto AND dir.Activo = 1
    `);

  const row = result.recordset[0];

  return row ? toDomainDireccion(row) : null;
}

export interface NuevaDireccion {
  idContacto: number;
  idDistrito: number;
  calle: string;
  numero: string;
  departamentoInterior: string | null;
}

// 💾 Crea una Dirección. La validación de que IdDistrito existe y está
// activo (dbo.Distritos) ocurre ANTES, en direccion.service.ts
// (DireccionDistritoInvalidoError) -- este repository no valida FKs a
// nivel de aplicación, solo inserta; FK_Direcciones_Distritos en el
// schema es la red de seguridad final ante una carrera de datos.
export async function saveDireccion(input: NuevaDireccion): Promise<number> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("idContacto", sql.Int, input.idContacto)
    .input("idDistrito", sql.Int, input.idDistrito)
    .input("calle", sql.VarChar(250), input.calle)
    .input("numero", sql.VarChar(30), input.numero)
    .input("departamentoInterior", sql.VarChar(100), input.departamentoInterior).query(`
      INSERT INTO dbo.Direcciones
        (IdContacto, IdDistrito, Calle, Numero, DepartamentoInterior, Activo, FechaCreacion)
      OUTPUT inserted.IdDireccion
      VALUES
        (@idContacto, @idDistrito, @calle, @numero, @departamentoInterior, 1, SYSUTCDATETIME())
    `);

  return result.recordset[0].IdDireccion as number;
}

export interface ActualizacionDireccion {
  idDistrito: number;
  calle: string;
  numero: string;
  departamentoInterior: string | null;
}

// ✏️ Actualiza una Dirección existente -- WHERE acotado por
// IdDireccion + IdContacto + Activo = 1 (mismo criterio de scoping que
// findDireccionByIdYContacto): si la fila no existe, no es de este
// contacto, o ya está desactivada, `recordset` viene vacío y el
// Service lo interpreta como "no encontrada" -- 404 (anti-enumeración).
export async function updateDireccion(
  idDireccion: number,
  idContacto: number,
  input: ActualizacionDireccion,
): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("idDireccion", sql.Int, idDireccion)
    .input("idContacto", sql.Int, idContacto)
    .input("idDistrito", sql.Int, input.idDistrito)
    .input("calle", sql.VarChar(250), input.calle)
    .input("numero", sql.VarChar(30), input.numero)
    .input("departamentoInterior", sql.VarChar(100), input.departamentoInterior).query(`
      UPDATE dbo.Direcciones
      SET IdDistrito = @idDistrito, Calle = @calle, Numero = @numero,
          DepartamentoInterior = @departamentoInterior, FechaModificacion = SYSUTCDATETIME()
      OUTPUT inserted.IdDireccion
      WHERE IdDireccion = @idDireccion AND IdContacto = @idContacto AND Activo = 1
    `);

  return result.recordset.length > 0;
}

// ➖ Desactiva (soft delete) -- nunca DELETE físico. Mismo criterio que
// desactivarRelacion en representante.repository.ts. Scoping idéntico
// a updateDireccion (IdDireccion + IdContacto + Activo = 1).
export async function desactivarDireccion(
  idDireccion: number,
  idContacto: number,
): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("idDireccion", sql.Int, idDireccion)
    .input("idContacto", sql.Int, idContacto).query(`
      UPDATE dbo.Direcciones
      SET Activo = 0, FechaModificacion = SYSUTCDATETIME()
      OUTPUT inserted.IdDireccion
      WHERE IdDireccion = @idDireccion AND IdContacto = @idContacto AND Activo = 1
    `);

  return result.recordset.length > 0;
}
