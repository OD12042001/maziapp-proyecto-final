import { getPool, sql } from "../../config/sql";

/**
 * Repository de CIIU (Fase Actividad) -- catálogo de solo lectura, sin
 * dato de ningún contacto en particular. Mismo patrón exacto que
 * ubigeo.repository.ts: `search` siempre parametrizado, nunca
 * concatenado; carga de datos vive en database/seed_ciiu.sql (todavía
 * no creado -- pendiente de la fuente oficial), nunca en código de
 * aplicación.
 */

interface CiiuRow {
  CiiuId: number;
  Codigo: string;
  Descripcion: string;
}

function toDomainCiiu(row: CiiuRow) {
  return {
    ciiuId: row.CiiuId,
    codigo: row.Codigo,
    descripcion: row.Descripcion,
  };
}

export type CiiuDomain = ReturnType<typeof toDomainCiiu>;

const LIMITE_RESULTADOS_BUSQUEDA = 20;

// Mismo helper que ubigeo.repository.ts/empresaBusqueda.repository.ts
// -- ver comentario en empresaBusqueda.repository.ts sobre por qué se
// duplica en vez de importarse.
function escaparComodinesLike(valor: string): string {
  return valor.replace(/[[%_]/g, (match) => `[${match}]`);
}

// 🔍 Búsqueda de CIIU por código O descripción -- el usuario puede
// escribir cualquiera de los dos (mismo requerimiento del dueño del
// proyecto: "Buscar código o descripción").
export async function buscarCiiu(search: string): Promise<CiiuDomain[]> {
  const pool = await getPool();

  const patron = `%${escaparComodinesLike(search)}%`;

  const result = await pool
    .request()
    .input("search", sql.NVarChar(104), patron).query(`
      SELECT CiiuId, Codigo, Descripcion
      FROM dbo.CatalogoCiiu
      WHERE Activo = 1
        AND (Codigo LIKE @search ESCAPE '[' OR Descripcion LIKE @search ESCAPE '[')
      ORDER BY Codigo
      OFFSET 0 ROWS FETCH NEXT ${LIMITE_RESULTADOS_BUSQUEDA} ROWS ONLY
    `);

  return result.recordset.map(toDomainCiiu);
}

// 🔍 Un CIIU puntual por id -- usado por contactoActividad.service.ts
// para validar que el `ciiuId` enviado por el cliente existe y está
// activo antes de guardar la Actividad de un contacto JURIDICA (mismo
// criterio que direccion.service.ts valida idDistrito contra
// ubigeo.repository.ts::findDistritoById).
export async function findCiiuById(ciiuId: number): Promise<CiiuDomain | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("ciiuId", sql.Int, ciiuId)
    .query(`SELECT CiiuId, Codigo, Descripcion FROM dbo.CatalogoCiiu WHERE CiiuId = @ciiuId AND Activo = 1`);

  const row = result.recordset[0];

  return row ? toDomainCiiu(row) : null;
}
