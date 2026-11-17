import * as repository from "../../repositories/ubigeo/ubigeo.repository";

/**
 * Fase Direcciones -- capa de servicio de Ubigeo. Hoy es un
 * passthrough sobre el repository (no hay ninguna regla de negocio
 * adicional sobre la búsqueda de Distrito), pero se mantiene como capa
 * separada para seguir la misma estructura Function -> Service ->
 * Repository del resto del proyecto (contacto.service.ts,
 * representante.service.ts).
 */
export async function buscarDistritos(search: string) {
  return repository.buscarDistritos(search);
}
