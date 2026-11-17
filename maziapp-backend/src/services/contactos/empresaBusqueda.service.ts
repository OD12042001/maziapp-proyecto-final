import * as repository from "../../repositories/contactos/empresaBusqueda.repository";
import { AuthenticatedUser } from "../../types/authenticated-user";

/**
 * Fase Actividad -- buscador de Empresa para el modal "Trabajo
 * dependiente". Ver la nota de seguridad en
 * empresaBusqueda.repository.ts: el alcance (solo Contactos JURIDICA
 * del propio usuario) se aplica SIEMPRE aquí, nunca es opcional ni
 * configurable desde el Frontend -- `user.oid` viene exclusivamente
 * del JWT ya validado por withAuth, nunca de ningún parámetro de
 * request.
 */
export async function buscarEmpresas(search: string, user: AuthenticatedUser) {
  return repository.buscarEmpresasPorResponsable(user.oid, search);
}
