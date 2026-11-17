import * as repository from "../../../repositories/ciiu/ciiu.repository";
import { buscarCiiu } from "../ciiu.service";

jest.mock("../../../repositories/ciiu/ciiu.repository");

describe("ciiu.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("delega la búsqueda al repository, sin lógica de ownership (catálogo público)", async () => {
    (repository.buscarCiiu as jest.Mock).mockResolvedValue([
      { ciiuId: 1, codigo: "6201", descripcion: "Programación informática" },
    ]);

    const res = await buscarCiiu("programa");

    expect(repository.buscarCiiu).toHaveBeenCalledWith("programa");
    expect(res).toEqual([{ ciiuId: 1, codigo: "6201", descripcion: "Programación informática" }]);
  });
});
