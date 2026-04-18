import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { toast } from 'sonner';

export default function Login() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(username, password);
      toast.success(t('auth.welcome'));
    } catch (err: any) {
      toast.error(err.message || t('auth.authFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 gradient-primary opacity-5" />
      <div className="absolute top-4 end-4 z-10">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-sm shadow-card relative">
        <CardHeader className="text-center pb-2">
          <h1 className="text-3xl font-bold text-primary tracking-tight">{t('app.name')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('auth.tagline')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={t('auth.username')}
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder={t('auth.password')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 gradient-primary border-0" disabled={loading}>
              {loading ? t('auth.pleaseWait') : t('auth.signIn')}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-4">
            {t('auth.contactAdmin')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
