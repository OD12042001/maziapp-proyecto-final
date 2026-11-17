import { getPool, sql } from "../../config/sql";

interface ContactoRow {
  Id: number;
  TipoContacto: string;
  TipoDocumento: string;
  NumeroDocumento: string;
  Nombres: string | null;
  Apellidos: string | null;
  RazonSocial: string | null;
  FechaNacimiento: Date | null;
  Sexo: string | null;
  EstadoCivil: string | null;
  Nacionalidad: string | null;
  PaisResidencia: string | null;
  EsPep: boolean;
  EstadoContacto: string;
  Celular: string | null;
  Correo: string | null;
  TelefonoFijo: string | null;
  ResponsableId: string;
  CreadoFecha: Date;
  CreadoNombre: string | null;
  CreadoCorreo: string | null;
  CreadoId: string;
  ActualizadoFecha: Date | null;
  ActualizadoNombre: string | null;
  ActualizadoCorreo: string | null;
  ActualizadoId: string | null;
}

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function toDomain(row: ContactoRow) {
  return {
    id: String(row.Id),
    pid: row.Id,
    tipoContacto: row.TipoContacto,
    tipoDocumento: row.TipoDocumento,
    numeroDocumento: row.NumeroDocumento,
    nombres: row.Nombres,
    apellidos: row.Apellidos,
    razonSocial: row.RazonSocial,
    fechaNacimiento: toIso(row.FechaNacimiento),
    sexo: row.Sexo,
    estadoCivil: row.EstadoCivil,
    nacionalidad: row.Nacionalidad,
    paisResidencia: row.PaisResidencia,
    esPep: !!row.EsPep,
    estadoContacto: row.EstadoContacto,
    celular: row.Celular,
    correo: row.Correo,
    telefonoFijo: row.TelefonoFijo,
    responsableId: row.ResponsableId,
    creado: {
      fecha: toIso(row.CreadoFecha),
      nombre: row.CreadoNombre ?? "",
      correo: row.CreadoCorreo ?? "",
      id: row.CreadoId,
    },
    actualizado: row.ActualizadoFecha
      ? {
          fecha: toIso(row.ActualizadoFecha),
          nombre: row.ActualizadoNombre ?? "",
          correo: row.ActualizadoCorreo ?? "",
          id: row.ActualizadoId ?? "",
        }
      : null,
  };
}

// 🔍 TODOS
export async function findAllContactos() {
  const pool = await getPool();

  const result = await pool
    .request()
    .query(`SELECT * FROM dbo.Contactos ORDER BY Id DESC`);

  return result.recordset.map(toDomain);
}

// 🔍 POR ID
export async function findContactoById(id: string) {
  const numericId = Number(id);

  if (!Number.isInteger(numericId)) {
    return null;
  }

  const pool = await getPool();

  const result = await pool
    .request()
    .input("id", sql.Int, numericId)
    .query(`SELECT * FROM dbo.Contactos WHERE Id = @id`);

  const row = result.recordset[0];

  return row ? toDomain(row) : null;
}

// 🔍 POR RESPONSABLE ("mi cartera" — Fase 1.1, Decisión 4)
export async function findContactosByOwner(responsableId: string) {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("responsableId", sql.UniqueIdentifier, responsableId)
    .query(
      `SELECT * FROM dbo.Contactos WHERE ResponsableId = @responsableId ORDER BY Id DESC`,
    );

  return result.recordset.map(toDomain);
}

export interface NuevoContacto {
  tipoContacto: "NATURAL" | "JURIDICA";
  tipoDocumento: "DNI" | "CE" | "PASAPORTE" | "RUC";
  numeroDocumento: string;
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
  fechaNacimiento: string | null;
  sexo: "MASCULINO" | "FEMENINO" | null;
  estadoCivil: string | null;
  nacionalidad: string | null;
  paisResidencia: string | null;
  esPep: boolean;
  estadoContacto: "ACTIVO" | "INACTIVO";
  celular: string | null;
  correo: string | null;
  telefonoFijo: string | null;
  // 🔐 Provienen exclusivamente del usuario autenticado (ver
  // contacto.service.ts::crearContacto) — este repository no valida
  // ni cuestiona ese origen, pero por contrato nunca debe llamarse
  // desde código que los tome de `req.body`.
  responsableId: string;
  creadoNombre: string;
  creadoCorreo: string;
  creadoId: string;
}

export interface ActualizacionContacto {
  // 📌 Fase 3.15 / 7A — actualización PARCIAL. Cada campo es opcional:
  // una clave AUSENTE aquí significa "no tocar esa columna" — es la
  // única forma en que este repository sabe qué SET incluir. `null`
  // explícito, en cambio, SÍ se aplica (permite, por ejemplo, borrar
  // un teléfono fijo que ya no aplica). Nunca incluye campos de
  // identificación (tipoContacto/tipoDocumento/numeroDocumento) ni
  // técnicos/auditoría (id/responsableId/creadoId/...) — eso se
  // garantiza en capas superiores (Zod .strict() + service), este
  // tipo ni siquiera los declara.
  nombres?: string | null;
  apellidos?: string | null;
  razonSocial?: string | null;
  fechaNacimiento?: string | null;
  sexo?: "MASCULINO" | "FEMENINO" | null;
  estadoCivil?: string | null;
  nacionalidad?: string | null;
  paisResidencia?: string | null;
  esPep?: boolean;
  celular?: string | null;
  correo?: string | null;
  telefonoFijo?: string | null;
}

// Mapa único: nombre de clave del objeto TS -> [columna SQL, tipo mssql].
// Se usa tanto para construir el SET dinámico como para tipar el
// `.input()` correspondiente — una sola fuente de verdad, para que
// agregar/quitar un campo no pueda desincronizar SQL y parámetros.
const CAMPOS_ACTUALIZABLES: Record<
  keyof ActualizacionContacto,
  { columna: string; tipo: any }
> = {
  nombres: { columna: "Nombres", tipo: sql.NVarChar(120) },
  apellidos: { columna: "Apellidos", tipo: sql.NVarChar(120) },
  razonSocial: { columna: "RazonSocial", tipo: sql.NVarChar(200) },
  fechaNacimiento: { columna: "FechaNacimiento", tipo: sql.Date },
  sexo: { columna: "Sexo", tipo: sql.NVarChar(10) },
  estadoCivil: { columna: "EstadoCivil", tipo: sql.NVarChar(30) },
  nacionalidad: { columna: "Nacionalidad", tipo: sql.NVarChar(60) },
  paisResidencia: { columna: "PaisResidencia", tipo: sql.NVarChar(60) },
  esPep: { columna: "EsPep", tipo: sql.Bit },
  celular: { columna: "Celular", tipo: sql.NVarChar(20) },
  correo: { columna: "Correo", tipo: sql.NVarChar(150) },
  telefonoFijo: { columna: "TelefonoFijo", tipo: sql.NVarChar(20) },
};

// ✏️ UPDATE (Fase 3.15 / 7A — Cliente + Ubicación)
//
// Actualización PARCIAL parametrizada: solo se agregan al SET las
// columnas cuya clave está PRESENTE en `fields` (`Object.prototype.
// hasOwnProperty`, no una comprobación de truthy — así un `null`
// explícito sí se aplica, pero una clave ausente jamás toca la
// columna ni la deja en NULL). El ownership YA fue verificado en
// `contacto.service.ts::actualizarContacto()` (reutilizando
// `obtenerContactoPorId`, con la comparación de GUID case-insensitive
// de la Fase 3.13) — este repository no vuelve a comprobarlo, solo
// filtra por `WHERE Id = @id`, igual que `findContactoById`.
//
// Como `saveContacto`, todo valor de usuario viaja como parámetro
// `.input(...)`; el único texto interpolado en la query son NOMBRES
// DE COLUMNA fijos tomados de `CAMPOS_ACTUALIZABLES` (una constante
// del código, nunca derivada de `req.body`), no valores.
export async function updateContacto(
  id: number,
  fields: ActualizacionContacto,
  audit: { actualizadoId: string; actualizadoNombre: string; actualizadoCorreo: string },
) {
  const pool = await getPool();
  const request = pool.request();

  const claves = (Object.keys(fields) as (keyof ActualizacionContacto)[]).filter(
    (clave) => Object.prototype.hasOwnProperty.call(fields, clave),
  );

  const setClauses = claves.map((clave) => {
    const { columna, tipo } = CAMPOS_ACTUALIZABLES[clave];
    request.input(clave, tipo, fields[clave] as any);
    return `${columna} = @${clave}`;
  });

  request.input("id", sql.Int, id);
  request.input("actualizadoId", sql.UniqueIdentifier, audit.actualizadoId);
  request.input("actualizadoNombre", sql.NVarChar(200), audit.actualizadoNombre);
  request.input("actualizadoCorreo", sql.NVarChar(150), audit.actualizadoCorreo);

  setClauses.push(
    "ActualizadoFecha = SYSUTCDATETIME()",
    "ActualizadoId = @actualizadoId",
    "ActualizadoNombre = @actualizadoNombre",
    "ActualizadoCorreo = @actualizadoCorreo",
  );

  const result = await request.query(`
    UPDATE dbo.Contactos
    SET ${setClauses.join(", ")}
    OUTPUT inserted.*
    WHERE Id = @id
  `);

  const row = result.recordset[0];

  return row ? toDomain(row) : null;
}

// 💾 SAVE
// Todas las entradas de usuario viajan como parámetros de `mssql`
// (`.input(...)` + `@nombre` en la query) — sin concatenación de
// strings en ningún punto (informe de seguridad, punto N; Fase 3,
// punto 6). El conflicto de UNIQUE(TipoDocumento, NumeroDocumento) NO
// se maneja aquí: se deja que `mssql` lance su excepción nativa
// (número 2601/2627), que el nivel de Function (createContacto.ts) es
// responsable de traducir a HTTP 409 con un mensaje seguro.
export async function saveContacto(input: NuevoContacto) {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("tipoContacto", sql.NVarChar(20), input.tipoContacto)
    .input("tipoDocumento", sql.NVarChar(20), input.tipoDocumento)
    .input("numeroDocumento", sql.NVarChar(20), input.numeroDocumento)
    .input("nombres", sql.NVarChar(120), input.nombres)
    .input("apellidos", sql.NVarChar(120), input.apellidos)
    .input("razonSocial", sql.NVarChar(200), input.razonSocial)
    .input("fechaNacimiento", sql.Date, input.fechaNacimiento)
    .input("sexo", sql.NVarChar(10), input.sexo)
    .input("estadoCivil", sql.NVarChar(30), input.estadoCivil)
    .input("nacionalidad", sql.NVarChar(60), input.nacionalidad)
    .input("paisResidencia", sql.NVarChar(60), input.paisResidencia)
    .input("esPep", sql.Bit, input.esPep)
    .input("estadoContacto", sql.NVarChar(20), input.estadoContacto)
    .input("celular", sql.NVarChar(20), input.celular)
    .input("correo", sql.NVarChar(150), input.correo)
    .input("telefonoFijo", sql.NVarChar(20), input.telefonoFijo)
    .input("responsableId", sql.UniqueIdentifier, input.responsableId)
    .input("creadoNombre", sql.NVarChar(200), input.creadoNombre)
    .input("creadoCorreo", sql.NVarChar(150), input.creadoCorreo)
    .input("creadoId", sql.UniqueIdentifier, input.creadoId).query(`
      INSERT INTO dbo.Contactos
        (TipoContacto, TipoDocumento, NumeroDocumento, Nombres, Apellidos, RazonSocial,
         FechaNacimiento, Sexo, EstadoCivil, Nacionalidad, PaisResidencia, EsPep,
         EstadoContacto, Celular, Correo, TelefonoFijo, ResponsableId,
         CreadoFecha, CreadoNombre, CreadoCorreo, CreadoId)
      OUTPUT inserted.*
      VALUES
        (@tipoContacto, @tipoDocumento, @numeroDocumento, @nombres, @apellidos, @razonSocial,
         @fechaNacimiento, @sexo, @estadoCivil, @nacionalidad, @paisResidencia, @esPep,
         @estadoContacto, @celular, @correo, @telefonoFijo, @responsableId,
         SYSUTCDATETIME(), @creadoNombre, @creadoCorreo, @creadoId)
    `);

  return toDomain(result.recordset[0]);
}
