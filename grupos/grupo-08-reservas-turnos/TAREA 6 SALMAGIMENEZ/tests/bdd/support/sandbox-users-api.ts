import { expect, type APIRequestContext } from '@playwright/test';

export type SandboxUser = {
  id: string;
  nombre: string;
  email: string;
};

let cachedActiveUser: SandboxUser | undefined;

export class SandboxUsersApi {
  constructor(private readonly request: APIRequestContext) {}

  async firstActiveUser(): Promise<SandboxUser> {
    if (cachedActiveUser) {
      return cachedActiveUser;
    }

    for (let intento = 1; intento <= 3; intento++) {
      const response = await this.request.post('/api/v1/sql/select', {
        data: {
          sql: 'SELECT id, nombre, email FROM usuarios WHERE activo = $1',
          params: [true],
        },
      });

      if (response.status() === 429 && intento < 3) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }

      expect(
        response.ok(),
        `La consulta de usuarios activos debe responder correctamente. HTTP ${response.status()}`
      ).toBeTruthy();

      const body = await response.json() as {
        data?: SandboxUser[];
      };

      expect(
        body.data,
        'La consulta debe devolver usuarios activos'
      ).toBeTruthy();

      expect(
        body.data!.length,
        'La consulta debe devolver al menos un usuario activo'
      ).toBeGreaterThan(0);

      cachedActiveUser = body.data![0];

      return cachedActiveUser;
    }

    throw new Error(
      'No fue posible consultar un usuario activo del Sandbox después de 3 intentos'
    );
  }
}