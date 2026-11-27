import { currentStep, type Program } from '@repforge/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, createDependencies, type AppContainer } from '../app/composition';
import { RepForgeDb } from '../infrastructure/db';
import { FakeServer, type FakeDevice } from '../test/fake-remote';

/**
 * Synchronisation de bout en bout : deux appareils (deux bases IndexedDB),
 * un même faux serveur fidèle aux règles de l'API.
 */

let server: FakeServer;
let dbCount = 0;

interface Phone {
  readonly app: AppContainer;
  readonly remote: FakeDevice;
}

async function phone(): Promise<Phone> {
  const remote = server.device();
  const app = createApp(createDependencies(new RepForgeDb(`sync-${++dbCount}-${Date.now()}`), remote));
  await app.account.login('moi@example.com', 'phrase-de-passe-solide');
  return { app, remote };
}

async function activeProgram({ app }: Phone): Promise<Program> {
  const id = await app.deps.settings.getActiveProgramId();
  return (await app.deps.programs.get(id!))!;
}

async function rename({ app }: Phone, program: Program, name: string): Promise<void> {
  await app.useCases.renameProgram(program.id, name);
  await app.useCases.saveProgramEdits(program.id);
}

const account = () => server.accounts.get('moi@example.com')!.account;
beforeEach(() => {
  server = new FakeServer();
  server.addAccount('moi@example.com');
});

describe('première connexion', () => {
  it('crée les programmes modèles sur le compte, une seule fois', async () => {
    const first = await phone();
    expect(await first.app.deps.programs.list()).toHaveLength(2);
    expect(server.stored(account(), 'programs')).toHaveLength(2);

    // Deuxième appareil : il récupère les programmes du compte, sans en recréer.
    const second = await phone();
    expect((await second.app.deps.programs.list()).map((p) => p.name)).toEqual((await first.app.deps.programs.list()).map((p) => p.name));
    expect(server.stored(account(), 'programs')).toHaveLength(2);
    // Le programme actif suit le compte.
    expect((await activeProgram(second)).id).toBe((await activeProgram(first)).id);
  });

  it('envoie ce que l’appareil contenait avant la connexion', async () => {
    const remote = server.device();
    const app = createApp(createDependencies(new RepForgeDb(`sync-legacy-${++dbCount}`), remote));
    await app.useCases.ensureInitialData(); // données créées avant les comptes
    const legacy = (await app.deps.programs.list()).map((p) => p.id).sort();

    await app.account.login('moi@example.com', 'phrase-de-passe-solide');
    expect(server.stored(account(), 'programs').map((d) => d.id).sort()).toEqual(legacy);
  });
});

describe('envoi et réception', () => {
  it('une modification sur un appareil arrive sur l’autre', async () => {
    const phoneA = await phone();
    const phoneB = await phone();

    await rename(phoneA, await activeProgram(phoneA), 'PPL modifié');
    expect(await phoneA.app.sync.synchronize()).toBe('ok');
    expect(await phoneB.app.sync.synchronize()).toBe('ok');

    expect((await activeProgram(phoneB)).name).toBe('PPL modifié');
  });

  it('un exercice personnalisé et le programme qui l’utilise arrivent ensemble sur l’autre appareil', async () => {
    const phoneA = await phone();
    const phoneB = await phone();
    const exercise = await phoneA.app.useCases.createCustomExercise('load', {
      name: 'Presse à mollets',
      muscleGroup: 'legs',
      equipment: 'machine',
      loadConvention: 'Charge affichée sur la machine',
    });
    const program = await activeProgram(phoneA);
    await phoneA.app.useCases.addExerciseToStep(program.id, program.steps[0]!.id, exercise.id);
    await phoneA.app.useCases.saveProgramEdits(program.id);
    expect(await phoneA.app.sync.synchronize()).toBe('ok');
    expect(await phoneB.app.sync.synchronize()).toBe('ok');

    expect(await phoneB.app.deps.customExercises.get(exercise.id)).toEqual(exercise);
    const workout = await phoneB.app.useCases.startWorkout();
    expect(workout.exercises.at(-1)).toMatchObject({ exerciseId: exercise.id, name: 'Presse à mollets' });
  });

  it('hors ligne, tout reste sur l’appareil ; plusieurs modifications partent en un seul envoi', async () => {
    const phoneA = await phone();
    const program = await activeProgram(phoneA);
    phoneA.remote.offline = true;

    for (const name of ['P', 'PP', 'PPL hors ligne']) await rename(phoneA, program, name);
    expect(await phoneA.app.sync.synchronize()).toBe('offline');
    expect((await activeProgram(phoneA)).name).toBe('PPL hors ligne');

    phoneA.remote.offline = false;
    const before = server.stored(account(), 'programs').find((d) => d.id === program.id)!.version;
    expect(await phoneA.app.sync.synchronize()).toBe('ok');
    const after = server.stored(account(), 'programs').find((d) => d.id === program.id)!;
    expect(after.version).toBe(before + 1);
    expect((after.data as Program).name).toBe('PPL hors ligne');
    expect(await phoneA.app.deps.syncStore.pending()).toEqual([]);
  });

  it('une séance en cours part série par série, et se reprend sur l’autre appareil', async () => {
    const phoneA = await phone();
    const phoneB = await phone();

    const workout = await phoneA.app.useCases.startWorkout();
    const [exercise] = workout.exercises;
    await phoneA.app.useCases.validateSet(workout.id, exercise!.id, exercise!.sets[0]!.id, { weightKg: 60, reps: 8 });
    await phoneA.app.sync.synchronize();
    await phoneB.app.sync.synchronize();

    const onB = await phoneB.app.deps.workouts.findInProgress();
    expect(onB?.id).toBe(workout.id);
    expect(onB?.exercises[0]?.sets[0]?.performance).toMatchObject({ weightKg: 60, reps: 8 });
  });

  it('une suppression se propage ; une séance abandonnée avant tout envoi n’est jamais envoyée', async () => {
    const phoneA = await phone();
    const phoneB = await phone();
    const [, other] = await phoneA.app.deps.programs.list();
    await phoneA.app.useCases.deleteProgram(other!.id);
    await phoneA.app.sync.synchronize();
    await phoneB.app.sync.synchronize();
    expect((await phoneB.app.deps.programs.list()).map((p) => p.id)).not.toContain(other!.id);

    phoneA.remote.offline = true;
    const workout = await phoneA.app.useCases.startWorkout();
    await phoneA.app.useCases.abandonWorkout(workout.id);
    phoneA.remote.offline = false;
    await phoneA.app.sync.synchronize();
    expect(server.stored(account(), 'workouts')).toEqual([]);
  });

  it('une modification faite pendant un envoi n’est pas perdue', async () => {
    const phoneA = await phone();
    const program = await activeProgram(phoneA);
    await rename(phoneA, program, 'Pendant l’envoi 1');

    // Le serveur répond lentement : l'utilisateur modifie encore le programme entre-temps.
    const put = phoneA.remote.put.bind(phoneA.remote);
    phoneA.remote.put = async (...args) => {
      const accepted = await put(...args);
      if (args[0] === 'programs') await rename(phoneA, program, 'Pendant l’envoi 2');
      phoneA.remote.put = put;
      return accepted;
    };
    await phoneA.app.sync.synchronize();

    expect((await activeProgram(phoneA)).name).toBe('Pendant l’envoi 2');
    await phoneA.app.sync.synchronize();
    const stored = server.stored(account(), 'programs').find((d) => d.id === program.id)!;
    expect((stored.data as Program).name).toBe('Pendant l’envoi 2');
  });
});

describe('conflits', () => {
  async function bothEdited() {
    const phoneA = await phone();
    const phoneB = await phone();
    const program = await activeProgram(phoneA);
    await rename(phoneA, program, 'Depuis A');
    await phoneA.app.sync.synchronize();
    await rename(phoneB, program, 'Depuis B'); // B n'a pas encore reçu la version de A
    await phoneB.app.sync.synchronize();
    return { phoneA, phoneB, program };
  }

  it('modifié des deux côtés : rien n’est écrasé, le conflit attend un choix', async () => {
    const { phoneB, program } = await bothEdited();

    expect((await activeProgram(phoneB)).name).toBe('Depuis B');
    expect((server.stored(account(), 'programs').find((d) => d.id === program.id)!.data as Program).name).toBe('Depuis A');
    const conflict = await phoneB.app.deps.syncStore.conflict('programs', program.id);
    expect((conflict?.remote.data as Program).name).toBe('Depuis A');
  });

  it('garder l’autre version la récupère sur l’appareil', async () => {
    const { phoneB, program } = await bothEdited();
    await phoneB.app.sync.resolveConflict('programs', program.id, 'theirs');
    await phoneB.app.sync.synchronize();

    expect((await activeProgram(phoneB)).name).toBe('Depuis A');
    expect(await phoneB.app.deps.syncStore.conflict('programs', program.id)).toBeUndefined();
  });

  it('garder sa version l’envoie au serveur, puis aux autres appareils', async () => {
    const { phoneA, phoneB, program } = await bothEdited();
    await phoneB.app.sync.resolveConflict('programs', program.id, 'mine');
    await phoneB.app.sync.synchronize();
    await phoneA.app.sync.synchronize();

    expect((server.stored(account(), 'programs').find((d) => d.id === program.id)!.data as Program).name).toBe('Depuis B');
    expect((await activeProgram(phoneA)).name).toBe('Depuis B');
  });

  it('pas de conflit quand les deux appareils aboutissent au même résultat', async () => {
    const phoneA = await phone();
    const phoneB = await phone();
    // Un repos passé est réglé automatiquement sur chaque appareil : même calcul, même résultat.
    for (const p of [phoneA, phoneB]) {
      const program = await activeProgram(p);
      await p.app.deps.programs.save({ ...program, schedule: { cursor: 2, anchor: program.schedule.anchor } });
    }
    await phoneA.app.sync.synchronize();
    await phoneB.app.sync.synchronize();

    const program = await activeProgram(phoneB);
    expect(currentStep(program)?.kind).toBe('rest');
    expect(await phoneB.app.deps.syncStore.conflict('programs', program.id)).toBeUndefined();
    expect(await phoneB.app.deps.syncStore.pending()).toEqual([]);
  });
});

describe('session', () => {
  it('session expirée : on le signale, rien n’est perdu', async () => {
    const phoneA = await phone();
    await rename(phoneA, await activeProgram(phoneA), 'Gardé en attendant');
    phoneA.remote.expireSession();

    expect(await phoneA.app.sync.synchronize()).toBe('unauthorized');
    expect(await phoneA.app.deps.syncStore.pending()).toHaveLength(1);
  });
});

describe('format des documents', () => {
  it('chaque document envoyé porte son numéro de format', async () => {
    await phone();
    for (const document of server.stored(account(), 'programs')) expect((document.data as { format?: number }).format).toBe(1);
  });

  it('un document écrit par une version plus récente de l’app : synchronisation arrêtée, rien d’écrasé', async () => {
    const phoneA = await phone();
    const program = await activeProgram(phoneA);

    // Une version future de l'app (sur un autre appareil) enregistre le programme au format 2.
    const future = server.device();
    await future.login('moi@example.com', 'phrase-de-passe-solide');
    const onServer = server.stored(account(), 'programs').find((d) => d.id === program.id)!;
    await future.put('programs', program.id, onServer.version, { ...(onServer.data as object), name: 'Écrit par la v2', format: 2 });

    // Cette app ne sait pas lire le format 2 : elle ne l'applique pas…
    expect(await phoneA.app.sync.synchronize()).toBe('outdated');
    expect((await activeProgram(phoneA)).name).toBe(program.name);

    // … et ne peut pas l'écraser avec son ancien format.
    await rename(phoneA, program, 'Écrit par la v1');
    expect(await phoneA.app.sync.synchronize()).toBe('outdated');
    const stored = server.stored(account(), 'programs').find((d) => d.id === program.id)!;
    expect((stored.data as Program).name).toBe('Écrit par la v2');
    expect(await phoneA.app.deps.syncStore.pending()).toHaveLength(1); // gardé, rien n'est perdu
  });
});
