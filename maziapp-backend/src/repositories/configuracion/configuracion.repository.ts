import { getPool, sql } from "../../config/sql";

/**
 * Lectura de parámetros de negocio (`dbo.ConfiguracionParametros`).
 *
 * Existe para que ningún umbral quede codificado: S13 lee `KYC_SLA_DIAS`
 * y los módulos de cierre/comisión leerán sus propias claves. Si el
 * parámetro falta, está inactivo o no es del tipo esperado, se devuelve
 * `null` y el servicio decide (no se inventa un valor por defecto).
 */
export async function findParametroEntero(
  clave: string,
): Promise<number | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("clave", sql.NVarChar(100), clave)
    .query(`
      SELECT Valor, TipoDato
      FROM dbo.ConfiguracionParametros
      WHERE Clave = @clave AND Activo = 1
    `);

  const row = result.recordset[0];

  if (!row || row.TipoDato !== "ENTERO") {
    return null;
  }

  const valor = Number(row.Valor);

  return Number.isInteger(valor) ? valor : null;
}
