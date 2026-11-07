import { Box, Stack } from '@chakra-ui/react';
import { useState } from 'react';
import { useApp } from '../app-context';
import { ConfirmDialog } from '../components/confirm-dialog';
import { Screen } from '../components/screen';
import { AppButton, Card, Label } from '../components/ui';
import { plural } from '../format';
import { useAccount, useFinishedWorkouts, usePrograms } from '../hooks/use-data';
import { useOnlineStatus } from '../hooks/use-online-status';

/** Profil : compte connecté et état de sauvegarde. */
export function ProfileScreen() {
  const online = useOnlineStatus();
  const programs = usePrograms();
  const workouts = useFinishedWorkouts();
  const account = useAccount();
  const app = useApp();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <Screen title="Profil">
      <Stack gap="3">
        <Card>
          <Stack gap="1.5">
            <Label>Compte</Label>
            <Box fontSize="16px" fontWeight="600" wordBreak="break-all">
              {account?.email}
            </Box>
            <Box fontSize="14px" color="rf.muted" lineHeight="1.45">
              Tes programmes et ton historique sont privés : toi seul y as accès.
            </Box>
            <AppButton variant="ghost" small mt="2" onClick={() => setConfirmLogout(true)}>
              Se déconnecter
            </AppButton>
          </Stack>
        </Card>

        <Card>
          <Stack gap="3">
            <Label>Sauvegarde</Label>
            <Box fontSize="15px" fontWeight="600" color={online ? 'rf.text' : 'rf.amber'}>
              {online ? 'Tout est enregistré sur ce téléphone.' : 'Hors ligne : tout est enregistré sur ce téléphone.'}
            </Box>
            <Box fontSize="14px" color="rf.muted" lineHeight="1.45">
              Chaque série est enregistrée dès que tu la valides, avec ou sans réseau. La synchronisation entre tes appareils
              arrivera avec les comptes.
            </Box>
            {programs && workouts && (
              <Box fontSize="14px" color="rf.soft" borderTopWidth="1px" borderColor="rf.border" pt="3">
                {plural(programs.length, 'programme')} · {plural(workouts.length, 'séance enregistrée', 'séances enregistrées')}
              </Box>
            )}
          </Stack>
        </Card>
      </Stack>

      <ConfirmDialog
        open={confirmLogout}
        title="Se déconnecter ?"
        description="Toutes tes données seront effacées de cet appareil. Elles restent sur ton compte : tu les retrouveras en te reconnectant."
        confirmLabel="Se déconnecter"
        onConfirm={() => {
          setConfirmLogout(false);
          void app.account.logout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </Screen>
  );
}
