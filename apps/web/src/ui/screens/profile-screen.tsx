import { Box, chakra, Flex, Stack } from '@chakra-ui/react';
import { completedSets, type Program, type Workout } from '@repforge/domain';
import { useState, type FormEvent } from 'react';
import type { Collection } from '../../application/remote';
import type { ConflictChoice } from '../../application/sync';
import { useApp } from '../app-context';
import { ConfirmDialog } from '../components/confirm-dialog';
import { textInputStyle } from '../components/form';
import { Screen } from '../components/screen';
import { useAction } from '../components/toaster';
import { AppButton, Card, Label } from '../components/ui';
import { plural } from '../format';
import { useAccount, useFinishedWorkouts, usePrograms, useSyncState, type SyncConflictView, type SyncState } from '../hooks/use-data';
import { useOnlineStatus } from '../hooks/use-online-status';

/** Profil : compte, état de la synchronisation, et conflits à résoudre. */
export function ProfileScreen() {
  const account = useAccount();
  const sync = useSyncState();
  const programs = usePrograms();
  const workouts = useFinishedWorkouts();
  const app = useApp();
  const [pendingAtLogout, setPendingAtLogout] = useState<number | null>(null);

  return (
    <Screen title="Profil">
      <Stack gap="3">
        {sync && programs && sync.conflicts.map((conflict) => (
          <ConflictCard key={`${conflict.collection}/${conflict.id}`} conflict={conflict} programs={programs} />
        ))}

        {sync && <SyncCard state={sync} />}

        <Card>
          <Stack gap="1.5">
            <Label>Compte</Label>
            <Box fontSize="16px" fontWeight="600" wordBreak="break-all">
              {account?.email}
            </Box>
            <Box fontSize="14px" color="rf.muted" lineHeight="1.45">
              Tes programmes et ton historique sont privés : toi seul y as accès.
            </Box>
            {programs && workouts && (
              <Box fontSize="14px" color="rf.soft">
                {plural(programs.length, 'programme')} · {plural(workouts.length, 'séance enregistrée', 'séances enregistrées')}
              </Box>
            )}
            <AppButton variant="ghost" small mt="2" onClick={async () => setPendingAtLogout(await app.account.pendingChanges())}>
              Se déconnecter
            </AppButton>
          </Stack>
        </Card>
      </Stack>

      <ConfirmDialog
        open={pendingAtLogout !== null}
        title="Se déconnecter ?"
        description={
          pendingAtLogout
            ? `Attention : ${plural(pendingAtLogout, 'modification n’a', 'modifications n’ont')} pas encore été ${pendingAtLogout > 1 ? 'envoyées' : 'envoyée'}. Toutes les données de cet appareil seront effacées, et ${pendingAtLogout > 1 ? 'celles-ci seront perdues' : 'celle-ci sera perdue'}.`
            : 'Toutes tes données seront effacées de cet appareil. Elles restent sur ton compte : tu les retrouveras en te reconnectant.'
        }
        confirmLabel={pendingAtLogout ? 'Se déconnecter quand même' : 'Se déconnecter'}
        onConfirm={() => {
          setPendingAtLogout(null);
          void app.account.logout();
        }}
        onCancel={() => setPendingAtLogout(null)}
      />
    </Screen>
  );
}

// --- Synchronisation --------------------------------------------------------------

const timeFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function SyncCard({ state }: { state: SyncState }) {
  const online = useOnlineStatus();
  const { sync } = useApp();
  const run = useAction();
  const { pending, status } = state;
  const last = status.lastSyncedAt ? `Dernière synchronisation : ${timeFormat.format(new Date(status.lastSyncedAt))}.` : null;
  const waiting = pending > 0 ? `${plural(pending, 'modification enregistrée', 'modifications enregistrées')} sur ce téléphone, ${pending > 1 ? 'envoyées' : 'envoyée'} dès que possible.` : null;

  let title: string;
  let detail: string | null;
  let warn = false;
  if (status.problem === 'outdated') {
    [title, detail, warn] = ['Mise à jour nécessaire', 'Tes données ont été modifiées par une version plus récente de l’application. Mets-la à jour (recharge la page) pour reprendre la synchronisation. Rien n’est perdu.', true];
  } else if (status.problem === 'unauthorized') {
    [title, detail, warn] = ['Session expirée', 'Reconnecte-toi pour reprendre la synchronisation. Rien n’est perdu : tout reste enregistré sur ce téléphone.', true];
  } else if (!online || status.problem === 'offline') {
    [title, detail, warn] = ['Hors ligne', waiting ?? 'Tout est enregistré sur ce téléphone. La synchronisation reprendra au retour du réseau.', true];
  } else if (status.problem === 'error') {
    [title, detail, warn] = ['Synchronisation interrompue', 'Le serveur a refusé une modification. Nouvel essai automatique dans une minute.', true];
  } else if (pending > 0) {
    [title, detail] = ['Envoi en cours…', waiting];
  } else {
    [title, detail] = ['Tout est synchronisé', 'Tes données sont sur ce téléphone et sur ton compte.'];
  }

  return (
    <Card>
      <Stack gap="2">
        <Label>Synchronisation</Label>
        <Box fontSize="16px" fontWeight="600" color={warn ? 'rf.amber' : 'rf.text'}>
          {title}
        </Box>
        {detail && (
          <Box fontSize="14px" color="rf.soft" lineHeight="1.45">
            {detail}
          </Box>
        )}
        {last && (
          <Box fontSize="13px" color="rf.muted">
            {last}
          </Box>
        )}
        {status.problem === 'unauthorized' ? (
          <ReconnectForm />
        ) : (
          online && (
            <AppButton variant="secondary" small mt="1" onClick={() => run(async () => void (await sync.synchronize()))}>
              Synchroniser maintenant
            </AppButton>
          )
        )}
      </Stack>
    </Card>
  );
}

function ReconnectForm() {
  const { account } = useApp();
  const run = useAction();
  const [password, setPassword] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await run(() => account.reconnect(password), 'Reconnecté · synchronisation relancée');
  };

  return (
    <chakra.form onSubmit={submit} mt="1">
      <Stack gap="2">
        <chakra.input
          type="password"
          aria-label="Mot de passe"
          placeholder="Mot de passe"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          {...textInputStyle}
        />
        <AppButton type="submit" small disabled={!password}>
          Se reconnecter
        </AppButton>
      </Stack>
    </chakra.form>
  );
}

// --- Conflits ---------------------------------------------------------------------

const KIND: Record<Collection, string> = {
  programs: 'Programme',
  workouts: 'Séance',
  'rest-days': 'Jour de repos',
  settings: 'Programme actif',
};

/** Résumé lisible d'une version, pour choisir en connaissance de cause. */
function summarize(collection: Collection, data: unknown, programs: readonly Program[]): string {
  if (data === undefined || data === null) return 'Supprimé';
  switch (collection) {
    case 'programs': {
      const program = data as Program;
      return `${program.name || 'Sans nom'} · ${plural(program.steps.length, 'étape')}`;
    }
    case 'workouts': {
      const workout = data as Workout;
      const sets = workout.exercises.reduce((n, e) => n + completedSets(e).length, 0);
      return `${workout.name} · ${plural(sets, 'série validée', 'séries validées')}${workout.finishedAt ? '' : ' · en cours'}`;
    }
    case 'rest-days':
      return `Repos du ${(data as { date: string }).date}`;
    case 'settings': {
      const id = (data as { value: unknown }).value;
      return programs.find((p) => p.id === id)?.name ?? 'Aucun';
    }
  }
}

function titleOf(conflict: SyncConflictView): string {
  const data = (conflict.local ?? conflict.remote.data) as { name?: string } | null;
  const name = conflict.collection === 'programs' || conflict.collection === 'workouts' ? data?.name : undefined;
  return name ? `${KIND[conflict.collection]} « ${name} »` : KIND[conflict.collection];
}

function ConflictCard({ conflict, programs }: { conflict: SyncConflictView; programs: readonly Program[] }) {
  const { sync } = useApp();
  const run = useAction();
  const choose = (choice: ConflictChoice) =>
    run(
      () => sync.resolveConflict(conflict.collection, conflict.id, choice),
      choice === 'mine' ? 'Version de ce téléphone gardée' : 'Version de l’autre appareil récupérée',
    );

  return (
    <Card borderColor="rf.amberBorder" role="group" aria-label={`Conflit : ${titleOf(conflict)}`}>
      <Stack gap="3">
        <Box>
          <Label color="rf.amber">Conflit à résoudre</Label>
          <Box fontSize="16px" fontWeight="700" mt="1">
            {titleOf(conflict)}
          </Box>
          <Box fontSize="14px" color="rf.soft" lineHeight="1.45" mt="1">
            Modifié sur ce téléphone et sur un autre appareil. Choisis la version à garder : l’autre sera remplacée.
          </Box>
        </Box>
        <Version
          title="Sur ce téléphone"
          summary={summarize(conflict.collection, conflict.local, programs)}
          action="Garder celle-ci"
          onChoose={() => choose('mine')}
        />
        <Version
          title={`Sur l’autre appareil · ${timeFormat.format(new Date(conflict.remote.updatedAt))}`}
          summary={summarize(conflict.collection, conflict.remote.deleted ? null : conflict.remote.data, programs)}
          action="Garder l’autre"
          onChoose={() => choose('theirs')}
        />
      </Stack>
    </Card>
  );
}

function Version({ title, summary, action, onChoose }: { title: string; summary: string; action: string; onChoose: () => void }) {
  return (
    <Flex direction="column" gap="2" bg="rf.surface" borderWidth="1px" borderColor="rf.border" borderRadius="control" p="3">
      <Box fontSize="12px" fontWeight="600" color="rf.muted" textTransform="uppercase" letterSpacing="0.04em">
        {title}
      </Box>
      <Box fontSize="15px" fontWeight="600">
        {summary}
      </Box>
      <AppButton variant="secondary" small onClick={onChoose}>
        {action}
      </AppButton>
    </Flex>
  );
}
