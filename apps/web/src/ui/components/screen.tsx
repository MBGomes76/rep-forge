import { Box, chakra, Flex, Heading } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { plural } from '../format';
import { useSyncState, type SyncState } from '../hooks/use-data';
import { useOnlineStatus } from '../hooks/use-online-status';
import { usePwa } from '../hooks/use-pwa';
import { pwa } from '../../infrastructure/pwa';

import { BackIcon, HistoryIcon, HomeIcon, ProfileIcon, ProgramsIcon } from './icons';
import { AppButton, IconButton } from './ui';

interface ScreenProps {
  title: string;
  /** Chemin du bouton retour ; absent sur les onglets principaux. */
  backTo?: string;
  /** Barre du bas : la navigation principale par défaut, ou un pied spécifique (chrono). */
  footer?: ReactNode | 'nav' | 'none';
  children: ReactNode;
}

/**
 * Coque commune à tous les écrans : en-tête (retour, titre, état de
 * sauvegarde), contenu défilant, et barre du bas. Pensée pour un téléphone,
 * centrée sur grand écran.
 */
export function Screen({ title, backTo, footer = 'nav', children }: ScreenProps) {
  const navigate = useNavigate();
  return (
    <Flex direction="column" h="100dvh" maxW="480px" mx="auto" bg="rf.bg" color="rf.text">
      <Flex as="header" flex="none" align="center" gap="2.5" px="4" pt="calc(14px + env(safe-area-inset-top))" pb="2.5">
        {backTo && (
          <IconButton label="Retour" onClick={() => navigate(backTo)}>
            <BackIcon />
          </IconButton>
        )}
        <Heading as="h1" flex="1" minW="0" fontSize="22px" fontWeight="700" letterSpacing="-0.01em" truncate>
          {title}
        </Heading>
        <SaveStatus />
      </Flex>
      <UpdateBanner />

      <Box as="main" flex="1" minH="0" overflowY="auto" px="4" pt="1" pb="6">
        {children}
      </Box>

      {footer === 'nav' ? <BottomNav /> : footer === 'none' ? null : footer}
    </Flex>
  );
}

/**
 * État de sauvegarde et de synchronisation, toujours visible. Tout est
 * enregistré sur l'appareil dès la saisie ; le badge dit si c'est aussi parti
 * sur le serveur. Un appui ouvre le détail (Profil).
 */
function SaveStatus() {
  const { label, description, tone } = describeSync(useOnlineStatus(), useSyncState());
  const navigate = useNavigate();
  return (
    <chakra.button
      type="button"
      onClick={() => navigate('/profil')}
      aria-label={`État de sauvegarde : ${description}`}
      flex="none"
      h="44px"
      px="3"
      borderRadius="full"
      bg="rf.card"
      borderWidth="1px"
      borderColor="rf.border"
      display="flex"
      alignItems="center"
      gap="2"
      fontSize="12px"
      fontWeight="600"
      color="rf.text"
      cursor="pointer"
    >
      <Box w="8px" h="8px" borderRadius="full" bg={tone === 'ok' ? 'rf.accent' : tone === 'warn' ? 'rf.amber' : 'rf.muted'} />
      {label}
    </chakra.button>
  );
}

/**
 * Nouvelle version de l'app téléchargée : on la propose, sans jamais recharger
 * de force (une séance pourrait être en cours de saisie).
 */
function UpdateBanner() {
  const { needRefresh } = usePwa();
  if (!needRefresh) return null;
  return (
    <Flex role="status" flex="none" align="center" gap="3" mx="4" mb="2" px="3.5" py="2" bg="rf.doneBg" borderWidth="1px" borderColor="rf.doneBorder" borderRadius="control">
      <Box flex="1" fontSize="14px" fontWeight="600">
        Nouvelle version disponible
      </Box>
      <AppButton small w="auto" onClick={() => void pwa.update()}>
        Mettre à jour
      </AppButton>
    </Flex>
  );
}

interface SyncDescription {
  readonly label: string;
  readonly description: string;
  readonly tone: 'ok' | 'busy' | 'warn';
}

/** Du plus important au moins important : ce qui demande une action d'abord. */
export function describeSync(online: boolean, state: SyncState | undefined): SyncDescription {
  const pending = state?.pending ?? 0;
  const saved = 'enregistré sur l’appareil';
  if (state?.conflicts.length) {
    return { label: 'Conflit', description: `${plural(state.conflicts.length, 'conflit')} à résoudre`, tone: 'warn' };
  }
  if (state?.status.problem === 'outdated') {
    return { label: 'Mise à jour', description: `application à mettre à jour, ${saved}`, tone: 'warn' };
  }
  if (state?.status.problem === 'unauthorized') {
    return { label: 'Reconnexion', description: `session expirée, ${saved}`, tone: 'warn' };
  }
  if (!online || state?.status.problem === 'offline') {
    return { label: 'Hors ligne', description: `hors ligne, ${saved}`, tone: 'warn' };
  }
  if (pending > 0) return { label: 'Envoi…', description: `${saved}, envoi en cours`, tone: 'busy' };
  return { label: 'Synchronisé', description: `${saved} et synchronisé`, tone: 'ok' };
}

const tabs = [
  { to: '/', label: "Aujourd'hui", Icon: HomeIcon, end: true },
  { to: '/programmes', label: 'Programmes', Icon: ProgramsIcon, end: false },
  { to: '/historique', label: 'Historique', Icon: HistoryIcon, end: false },
  { to: '/profil', label: 'Profil', Icon: ProfileIcon, end: false },
] as const;

export function BottomNav() {
  return (
    <Flex
      as="nav"
      aria-label="Navigation principale"
      flex="none"
      bg="rf.surface"
      borderTopWidth="1px"
      borderColor="rf.border"
      px="2"
      pb="calc(8px + env(safe-area-inset-bottom))"
    >
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} style={{ flex: 1 }}>
          {({ isActive }) => (
            <Flex
              h="64px"
              direction="column"
              align="center"
              justify="center"
              gap="1"
              fontSize="12px"
              fontWeight="600"
              color={isActive ? 'rf.accent' : 'rf.muted'}
            >
              <Icon size={24} />
              {label}
            </Flex>
          )}
        </NavLink>
      ))}
    </Flex>
  );
}
