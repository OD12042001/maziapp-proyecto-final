import * as repository from "../../repositories/ciiu/ciiu.repository";

/**
 * Fase Actividad -- catálogo de CIIU, solo lectura. Sin lógica de
 * ownership (no es un dato de ningún contacto en particular) -- mismo
 * criterio que ubigeo.service.ts.
 */
export async function buscarCiiu(search: string) {
  return repository.buscarCiiu(search);
}
