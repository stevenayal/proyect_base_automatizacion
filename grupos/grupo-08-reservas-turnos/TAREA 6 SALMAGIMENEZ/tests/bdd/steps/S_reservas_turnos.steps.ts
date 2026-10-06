import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

import type { PlaywrightWorld } from '../support/world';
import { SandboxUsersApi } from '../support/sandbox-users-api';

async function iniciarSesion(world: PlaywrightWorld): Promise<void> {
  if (!world.api) {
    throw new Error('Falta SANDBOX_API_KEY para consultar usuarios activos');
  }

  await world.sandboxCourse.chooseAutomationCourse();

  world.activeSandboxUser =
    await new SandboxUsersApi(world.api).firstActiveUser();

  await world.sandboxLogin.signInWith(
    world.activeSandboxUser.email
  );
}

Given(
  'existen turnos disponibles para reservar',
  async function (this: PlaywrightWorld) {
    await iniciarSesion(this);
    await this.reservas.abrirAgenda();
  }
);

When(
  'el usuario consulta los turnos disponibles',
  async function (this: PlaywrightWorld) {
    await this.reservas.abrirAgenda();
  }
);

Then(
  'el sistema debe mostrar los turnos disponibles correctamente',
  async function (this: PlaywrightWorld) {
    await this.reservas.verificarAgendaVisible();
  }
);

Given(
  'existe una reserva registrada',
  async function (this: PlaywrightWorld) {
    await iniciarSesion(this);

    if (!this.api || !this.activeSandboxUser) {
      throw new Error('No se pudo preparar la reserva de prueba');
    }

    const response = await this.api.post('/api/v1/reservas', {
      data: {
        usuarioId: Number(this.activeSandboxUser.id),
        servicio: 'Corte de Cabello',
        fechaHora: '2026-12-15T10:00:00-03:00',
        notas: 'Salma Gimenez - Tarea 6'
      }
    });

    expect(response.status()).toBe(201);
  }
);

When(
  'el usuario consulta la reserva',
  async function (this: PlaywrightWorld) {
    await this.reservas.abrirAgenda();
  }
);

Then(
  'el sistema debe mostrar los datos de la reserva correctamente',
  async function (this: PlaywrightWorld) {
    await this.reservas.verificarDatosReserva();
  }
);

Given(
  'existen turnos registrados en el sistema',
  async function (this: PlaywrightWorld) {
    await iniciarSesion(this);
  }
);

When(
  'el usuario intenta realizar una reserva para una fecha anterior a la actual',
  async function (this: PlaywrightWorld) {
    if (!this.api || !this.activeSandboxUser) {
      throw new Error('No se pudo ejecutar la prueba de fecha anterior');
    }

    const response = await this.api.post('/api/v1/reservas', {
      data: {
        usuarioId: Number(this.activeSandboxUser.id),
        servicio: 'Corte de Cabello',
        fechaHora: '2020-01-10T10:00:00-03:00',
        notas: 'Prueba fecha anterior - Salma'
      }
    });

    (this as any).ultimaRespuesta = response;
  }
);

Then(
  'el sistema debe rechazar la reserva',
  async function (this: PlaywrightWorld) {
    const response = (this as any).ultimaRespuesta;

    if (!response) {
      throw new Error('No existe respuesta de la creación de reserva');
    }

    expect(response.status()).not.toBe(201);
  }
);

Given(
  'existe un unico turno disponible',
  async function (this: PlaywrightWorld) {
    await iniciarSesion(this);
  }
);

When(
  'dos usuarios intentan reservar el mismo turno al mismo tiempo',
  async function (this: PlaywrightWorld) {
    if (!this.api || !this.activeSandboxUser) {
      throw new Error('No se pudo ejecutar la reserva simultánea');
    }

    const reserva = {
      usuarioId: Number(this.activeSandboxUser.id),
      servicio: 'Corte de Cabello',
      fechaHora: '2026-12-20T15:00:00-03:00',
      notas: 'Reserva simultanea - Salma'
    };

    const [respuesta1, respuesta2] = await Promise.all([
      this.api.post('/api/v1/reservas', { data: reserva }),
      this.api.post('/api/v1/reservas', { data: reserva })
    ]);

    (this as any).respuestasSimultaneas = [
      respuesta1.status(),
      respuesta2.status()
    ];
  }
);

Then(
  'el sistema debe confirmar la reserva para un solo usuario y rechazar la otra solicitud',
  async function (this: PlaywrightWorld) {
    const estados =
      (this as any).respuestasSimultaneas as number[] | undefined;

    if (!estados) {
      throw new Error('No existen resultados de las reservas simultáneas');
    }

    const exitosas = estados.filter(
      estado => estado >= 200 && estado < 300
    ).length;

    expect(exitosas).toBe(1);
  }
);
