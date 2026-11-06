import { Box, Stack } from '@chakra-ui/react';
import { Screen } from '../components/screen';
import { Card, Label } from '../components/ui';
import { plural } from '../format';
import { useFinishedWorkouts, usePrograms } from '../hooks/use-data';
import { useOnlineStatus } from '../hooks/use-online-status';

/**
 * Profil et état de sauvegarde. Les comptes (étape 3) et la synchronisation
 * (étape 4) ne sont pas encore là : l'écran dit ce qui est vrai aujourd'hui.
 */
export function ProfileScreen() {
  const online = useOnlineStatus();
  const programs = usePrograms();
  const workouts = useFinishedWorkouts();

  return (
    <Screen title="Profil">
      <Stack gap="3">
        <Card>
          <Stack gap="1.5">
            <Label>Compte</Label>
            <Box fontSize="16px" fontWeight="600">
              Accès sur invitation
            </Box>
            <Box fontSize="14px" color="rf.muted" lineHeight="1.45">
              La connexion arrive bientôt. Tes programmes et ton historique resteront privés par défaut.
            </Box>
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
    </Screen>
  );
}
