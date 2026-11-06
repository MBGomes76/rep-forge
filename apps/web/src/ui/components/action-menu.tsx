import { Box, Menu, Portal } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { MoreIcon } from './icons';

export interface MenuAction {
  readonly label: string;
  readonly icon: ReactNode;
  readonly onSelect: () => void;
  readonly disabled?: boolean;
  /** Suppression : affichée en rouge, séparée des autres actions. */
  readonly danger?: boolean;
}

interface ActionMenuProps {
  /** Nom accessible du bouton (« Actions pour Push »). */
  label: string;
  actions: readonly MenuAction[];
}

/**
 * Un seul bouton « ⋮ » regroupe les actions d'un élément (déplacer, modifier,
 * supprimer) : la liste reste lisible au lieu d'aligner trois icônes par ligne.
 */
export function ActionMenu({ label, actions }: ActionMenuProps) {
  const regular = actions.filter((a) => !a.danger);
  const dangerous = actions.filter((a) => a.danger);

  return (
    <Menu.Root
      positioning={{ placement: 'bottom-end' }}
      onSelect={({ value }) => actions[Number(value)]?.onSelect()}
    >
      <Menu.Trigger
        aria-label={label}
        title={label}
        flex="none"
        w="44px"
        h="44px"
        borderRadius="control"
        bg="rf.control"
        borderWidth="1px"
        borderColor="rf.controlBorder"
        color="rf.text"
        display="flex"
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        _active={{ transform: 'scale(0.95)' }}
      >
        <MoreIcon size={20} />
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            minW="220px"
            bg="rf.card"
            borderWidth="1px"
            borderColor="rf.controlBorder"
            borderRadius="control"
            boxShadow="0 12px 32px rgba(0, 0, 0, 0.45)"
            p="1.5"
          >
            {regular.map((action) => (
              <Item key={action.label} action={action} value={String(actions.indexOf(action))} />
            ))}
            {regular.length > 0 && dangerous.length > 0 && <Menu.Separator borderColor="rf.border" my="1" />}
            {dangerous.map((action) => (
              <Item key={action.label} action={action} value={String(actions.indexOf(action))} />
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

function Item({ action, value }: { action: MenuAction; value: string }) {
  return (
    <Menu.Item
      value={value}
      disabled={action.disabled}
      minH="44px"
      px="3"
      gap="3"
      borderRadius="10px"
      fontSize="15px"
      fontWeight="600"
      cursor="pointer"
      color={action.danger ? 'rf.danger' : 'rf.text'}
      _highlighted={{ bg: action.danger ? 'rf.dangerBg' : 'rf.control' }}
      _disabled={{ opacity: 0.4, cursor: 'default' }}
    >
      <Box as="span" display="flex" color={action.danger ? 'rf.danger' : 'rf.muted'}>
        {action.icon}
      </Box>
      {action.label}
    </Menu.Item>
  );
}
