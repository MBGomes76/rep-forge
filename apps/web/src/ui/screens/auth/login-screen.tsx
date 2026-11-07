import { chakra, Stack } from '@chakra-ui/react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { RemoteError } from '../../../application/remote';
import { useApp } from '../../app-context';
import { AppButton } from '../../components/ui';
import { AuthField, AuthShell, FormError } from './auth-shell';

export function LoginScreen() {
  const { account } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await account.login(email, password);
      navigate('/', { replace: true });
    } catch (e) {
      if (!(e instanceof RemoteError)) throw e;
      setError(e.kind === 'network' ? 'Connexion impossible sans réseau. Réessaie quand tu es connecté.' : e.message);
      setPending(false);
    }
  };

  return (
    <AuthShell
      title="Connexion"
      intro="Une connexion suffit par appareil : ensuite, l’application fonctionne aussi hors ligne."
    >
      <chakra.form onSubmit={submit}>
        <Stack gap="4">
          <AuthField label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="username" />
          <AuthField label="Mot de passe" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
          <FormError message={error} />
          <AppButton type="submit" disabled={pending || !email || !password}>
            {pending ? 'Connexion…' : 'Se connecter'}
          </AppButton>
          <chakra.p fontSize="14px" color="rf.muted" lineHeight="1.5">
            Pas encore de compte ? RepForge fonctionne sur invitation : demande un lien à la personne qui t’a parlé de l’app.
          </chakra.p>
        </Stack>
      </chakra.form>
    </AuthShell>
  );
}
