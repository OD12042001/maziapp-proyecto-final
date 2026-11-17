import { getPool, sql } from "../../config/sql";

/**
 * Repository de Ubigeo (Fase Direcciones): Departamentos -> Provincias
 * -> Distritos, catálogo geográfico de Perú, exclusivamente de
 * lectura desde este módulo (la carga de datos vive en
 * database/seed_ubigeo.sql, nunca en código de aplicación). Mismo
 * patrón de parametrización que contacto.repository.ts/
 * representante.repository.ts: todo valor de usuario viaja como
 * `.input(...)`, nunca concatenado en el texto de la query; el único
 * texto interpolado en las queries son nombres de columna/tabla FIJOS
 * del propio código, jamás derivados de `req.query`/`req.body`.
 */

interface DistritoRow {
  IdDistrito: number;
  Distrito: string;
  Provincia: string;
  Departamento: string;
}

function toDomainDistrito(row: DistritoRow) {
  return {
    idDistrito: row.IdDistrito,
    distrito: row.Distrito,
    provincia: row.Provincia,
    departamento: row.Departamento,
  };
}

export type DistritoDomain = ReturnType<typeof toDomainDistrito>;

const SELECT_DISTRITO_CON_UBIGEO = `
  SELECT
    di.IdDistrito,
    di.Nombre AS Distrito,
    p.Nombre AS Provincia,
    d.Nombre AS Departamento
  FROM dbo.Distritos di
  INNER JOIN dbo.Provincias p ON p.IdProvincia = di.IdProvincia
  INNER JOIN dbo.Departamentos d ON d.IdDepartamento = p.IdDepartamento
`;

// Límite fijo de resultados del autocompletado -- valor constante del
// propio código, nunca configurable desde el cliente (no existe
// parámetro `limit`/`top` aceptado por getDistritos.ts/
// ubigeo.validator.ts). Se interpola directamente en el texto de la
// query porque `TOP` no admite un parámetro `.input()` de forma
// portable en `mssql`; al ser una constante fija del código (nunca un
// valor derivado de `req.query`/`req.body`), no representa ningún
// riesgo de inyección SQL.
const LIMITE_RESULTADOS_BUSQUEDA = 20;

/**
 * Escapa los comodines de LIKE (`%`, `_`, `[`) dentro del VALOR de
 * búsqueda, para que un usuario que escriba literalmente uno de esos
 * caracteres busque ese caracter y no un patrón. El valor escapado
 * sigue viajando como parámetro (`.input("search", ...)`) -- esto es
 * una cuestión de semántica de coincidencia, no una medida de
 * anti-inyección: la anti-inyección la da exclusivamente la
 * parametrización de `mssql` (nunca se concatena `search` en el texto
 * de la query).
 */
function escaparComodinesLike(valor: string): string {
  return valor.replace(/[[%_]/g, (match) => `[${match}]`);
}

// 🔍 Búsqueda de Distrito para el autocompletado -- JOIN completo
// Distritos -> Provincias -> Departamentos, ejecutada enteramente en
// SQL Server (nunca fetch-all + filtrado en Node). `search` llega ya
// acotado en longitud por ubigeo.validator.ts, pero de todas formas
// viaja siempre como parámetro tipado (`sql.VarChar`) -- nunca se
// concatena en el texto de la query, sin importar su contenido.
export async function buscarDistritos(search: string): Promise<DistritoDomain[]> {
  const pool = await getPool();

  const patron = `%${escaparComodinesLike(search)}%`;

  const result = await pool
    .request()
    .input("search", sql.VarChar(102), patron)
    .query(`
      ${SELECT_DISTRITO_CON_UBIGEO}
      WHERE di.Activo = 1 AND p.Activo = 1 AND d.Activo = 1
        AND di.Nombre LIKE @search ESCAPE '['
      ORDER BY di.Nombre
      OFFSET 0 ROWS FETCH NEXT ${LIMITE_RESULTADOS_BUSQUEDA} ROWS ONLY
    `);

  return result.recordset.map(toDomainDistrito);
}

// 🔍 Un Distrito puntual por id, con su cadena de ubigeo -- usado por
// direccion.service.ts para validar que un IdDistrito enviado por el
// cliente existe y está activo (junto con su Provincia/Departamento)
// antes de crear o actualizar una Dirección.
export async function findDistritoById(idDistrito: number): Promise<DistritoDomain | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("idDistrito", sql.Int, idDistrito)
    .query(`
      ${SELECT_DISTRITO_CON_UBIGEO}
      WHERE di.IdDistrito = @idDistrito AND di.Activo = 1 AND p.Activo = 1 AND d.Activo = 1
    `);

  const row = result.recordset[0];

  return row ? toDomainDistrito(row) : null;
}
