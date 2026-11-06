import { Box, chakra, Flex, Heading } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useOnlineStatus } from '../hooks/use-online-status';
import { BackIcon, HistoryIcon, HomeIcon, ProfileIcon, ProgramsIcon } from './icons';
import { IconButton } from './ui';

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

      <Box as="main" flex="1" minH="0" overflowY="auto" px="4" pt="1" pb="6">
        {children}
      </Box>

      {footer === 'nav' ? <BottomNav /> : footer === 'none' ? null : footer}
    </Flex>
  );
}

/**
 * État de sauvegarde, toujours visible. À l'étape 2, tout est enregistré sur
 * l'appareil ; l'état de synchronisation avec le serveur viendra à l'étape 4.
 */
function SaveStatus() {
  const online = useOnlineStatus();
  const navigate = useNavigate();
  return (
    <chakra.button
      type="button"
      onClick={() => navigate('/profil')}
      aria-label={`État de sauvegarde : ${online ? 'enregistré sur l’appareil' : 'hors ligne, enregistré sur l’appareil'}`}
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
      <Box w="8px" h="8px" borderRadius="full" bg={online ? 'rf.accent' : 'rf.amber'} />
      {online ? 'Enregistré' : 'Hors ligne'}
    </chakra.button>
  );
}

const tabs = [
  { to: '/', label: "Aujourd'hui", Icon: HomeIcon, end: true },
  { to: '/programmes', label: 'Programmes', Icon: ProgramsIcon, end: false },
  { to: '/historique', label: 'Historique', Icon: HistoryIcon, end: false },
  { to: '/profil', label: 'Profil', Icon: ProfileIcon, end: false },
] as const;

function BottomNav() {
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
