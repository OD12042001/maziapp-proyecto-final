/**
 * Fase Actividad -- empresaBusqueda.service.ts
 *
 * Cubre la regla de seguridad explícita del dueño del proyecto: el
 * `responsableId` usado para acotar la búsqueda viene EXCLUSIVAMENTE
 * de `user.oid` (JWT ya validado), nunca de ningún parámetro externo
 * -- no existe forma de que este service busque en la cartera de otro
 * Freelance.
 */
import * as repository from "../../../repositories/contactos/empresaBusqueda.repository";
import { buscarEmpresas } from "../empresaBusqueda.service";

jest.mock("../../../repositories/contactos/empresaBusqueda.repository");

describe("empresaBusqueda.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("busca SIEMPRE acotado a user.oid, nunca a otro valor", async () => {
    (repository.buscarEmpresasPorResponsable as jest.Mock).mockResolvedValue([
      { contactoId: "5", razonSocial: "Acme SAC" },
    ]);

    const res = await buscarEmpresas("acme", { oid: "user-1" } as any);

    expect(repository.buscarEmpresasPorResponsable).toHaveBeenCalledWith("user-1", "acme");
    expect(res).toEqual([{ contactoId: "5", razonSocial: "Acme SAC" }]);
  });
});
