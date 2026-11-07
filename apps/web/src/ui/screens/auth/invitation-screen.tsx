import { chakra, Stack } from '@chakra-ui/react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { RemoteError } from '../../../application/remote';
import { useApp } from '../../app-context';
import { AppButton, Card } from '../../components/ui';
import { AuthField, AuthShell, FormError } from './auth-shell';

const MIN_PASSWORD = 10;

type InvitationState = { kind: 'loading' } | { kind: 'valid'; email: string } | { kind: 'invalid'; message: string };

/** Lien reçu par invitation : l'invité choisit son mot de passe et arrive dans l'app. */
export function InvitationScreen() {
  const { token = '' } = useParams();
  const { account } = useApp();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationState>({ kind: 'loading' });
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    account.getInvitation(token).then(
      ({ email }) => !cancelled && setInvitation({ kind: 'valid', email }),
      (e: unknown) => {
        if (cancelled) return;
        const network = e instanceof RemoteError && e.kind === 'network';
        setInvitation({
          kind: 'invalid',
          message: network ? 'Impossible de vérifier le lien sans réseau. Réessaie une fois connecté.' : 'Ce lien d’invitation n’est plus valable. Demande un nouveau lien.',
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [account, token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`);
    if (password !== confirmation) return setError('Les deux mots de passe ne correspondent pas.');
    setPending(true);
    setError(null);
    try {
      await account.acceptInvitation(token, password);
      navigate('/', { replace: true });
    } catch (e) {
      if (!(e instanceof RemoteError)) throw e;
      setError(e.kind === 'network' ? 'Connexion impossible sans réseau.' : e.message);
      setPending(false);
    }
  };

  if (invitation.kind === 'loading') return <AuthShell title="Invitation" intro="Vérification du lien…">{null}</AuthShell>;

  if (invitation.kind === 'invalid') {
    return (
      <AuthShell title="Invitation" intro={invitation.message}>
        <Card fontSize="15px">
          Tu as déjà un compte ?{' '}
          <chakra.span color="rf.accent" fontWeight="600" textDecoration="underline">
            <Link to="/connexion">Se connecter</Link>
          </chakra.span>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Bienvenue" intro="Choisis ton mot de passe pour créer ton compte. Une phrase de passe longue est plus sûre et plus facile à retenir.">
      <chakra.form onSubmit={submit}>
        <Stack gap="4">
          <AuthField label="E-mail" type="email" value={invitation.email} onChange={() => undefined} autoComplete="username" readOnly />
          <AuthField
            label="Mot de passe"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            hint={`Au moins ${MIN_PASSWORD} caractères.`}
          />
          <AuthField label="Confirmer le mot de passe" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
          <FormError message={error} />
          <AppButton type="submit" disabled={pending || !password || !confirmation}>
            {pending ? 'Création du compte…' : 'Créer mon compte'}
          </AppButton>
        </Stack>
      </chakra.form>
    </AuthShell>
  );
}
