import { getPool, sql } from "../../config/sql";

/**
 * Repository del buscador de Empresa (Fase Actividad) --
 * GET /api/contactos/empresas?search=...
 *
 * 🔐 DECISIÓN DE SEGURIDAD (explícita del dueño del proyecto, fase de
 * diseño de Actividad): esta búsqueda NO amplía el alcance de
 * autorización de Contactos. Se filtra SIEMPRE por
 * `ResponsableId = @responsableId` -- exactamente el mismo criterio de
 * `contacto.repository.ts::findContactosByOwner` -- así que un
 * Freelance solo puede encontrar, como "Empresa" para un trabajo
 * dependiente, los Contactos JURIDICA que él mismo ya tiene en su
 * propia cartera. No existe ninguna rama que busque en la cartera de
 * otro Freelance, ni un rol "ve todo" (ese comportamiento de
 * `supervisor_inversion` es legacy y no tiene sucesor confirmado -- ver
 * `contacto.service.ts`, migración de roles de agosto 2026). Si el
 * empleador no aparece en la búsqueda, el usuario escribe el nombre a
 * mano (`empresaNombreLibre`, ver `trabajoDependiente.validator.ts`) --
 * eso no requiere ningún cambio de autorización aquí.
 */

interface EmpresaRow {
  Id: number;
  RazonSocial: string;
}

function toDomainEmpresa(row: EmpresaRow) {
  return {
    contactoId: String(row.Id),
    razonSocial: row.RazonSocial,
  };
}

export type EmpresaDomain = ReturnType<typeof toDomainEmpresa>;

// Límite fijo de resultados -- mismo criterio que
// ubigeo.repository.ts::LIMITE_RESULTADOS_BUSQUEDA (constante del
// propio código, nunca configurable desde el cliente).
const LIMITE_RESULTADOS_BUSQUEDA = 20;

// Escapa los comodines de LIKE (`%`, `_`, `[`) dentro del VALOR de
// búsqueda -- mismo criterio y misma implementación que
// ubigeo.repository.ts::escaparComodinesLike (no se importa desde ahí
// porque esa función no está exportada; se duplica localmente,
// consistente con que cada repository de este proyecto es
// autocontenido). El valor escapado sigue viajando como parámetro
// (`.input("search", ...)`) -- esto es semántica de coincidencia, no
// anti-inyección: la anti-inyección la da exclusivamente la
// parametrización de `mssql`.
function escaparComodinesLike(valor: string): string {
  return valor.replace(/[[%_]/g, (match) => `[${match}]`);
}

// 🔍 Contactos JURIDICA cuya RazonSocial coincide con `search`,
// acotados a la cartera del usuario autenticado (ver nota de seguridad
// arriba). Ejecutado enteramente en SQL Server (nunca fetch-all +
// filtrado en Node) -- mismo patrón que ubigeo.repository.ts::buscarDistritos.
export async function buscarEmpresasPorResponsable(
  responsableId: string,
  search: string,
): Promise<EmpresaDomain[]> {
  const pool = await getPool();

  const patron = `%${escaparComodinesLike(search)}%`;

  const result = await pool
    .request()
    .input("responsableId", sql.UniqueIdentifier, responsableId)
    .input("search", sql.NVarChar(204), patron).query(`
      SELECT Id, RazonSocial
      FROM dbo.Contactos
      WHERE ResponsableId = @responsableId
        AND TipoContacto = 'JURIDICA'
        AND EstadoContacto = 'ACTIVO'
        AND RazonSocial LIKE @search ESCAPE '['
      ORDER BY RazonSocial
      OFFSET 0 ROWS FETCH NEXT ${LIMITE_RESULTADOS_BUSQUEDA} ROWS ONLY
    `);

  return result.recordset.map(toDomainEmpresa);
}

// 🔐 Verifica que `empresaContactoId` sea, en este momento, un
// Contacto JURIDICA ACTIVO dentro de la cartera del usuario
// autenticado -- llamado por contactoActividad.service.ts antes de
// aceptar un `empresaContactoId` enviado por el cliente en un trabajo
// dependiente. Nunca se confía en que un id con formato válido
// (entero positivo, ya garantizado por Zod) sea automáticamente una
// empresa real y accesible -- mismo criterio de "no confiar en el
// cliente" que direccion.service.ts aplica a idDistrito, aquí además
// con el filtro de ownership (ResponsableId) que Distrito no necesita
// por ser un catálogo público.
export async function existeEmpresaAccesible(
  contactoId: number,
  responsableId: string,
): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("contactoId", sql.Int, contactoId)
    .input("responsableId", sql.UniqueIdentifier, responsableId).query(`
      SELECT 1
      FROM dbo.Contactos
      WHERE Id = @contactoId
        AND ResponsableId = @responsableId
        AND TipoContacto = 'JURIDICA'
        AND EstadoContacto = 'ACTIVO'
    `);

  return result.recordset.length > 0;
}
