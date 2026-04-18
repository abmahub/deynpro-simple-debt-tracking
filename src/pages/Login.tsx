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
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.success(t('auth.accountCreated'));
      } else {
        await signIn(email, password);
        toast.success(t('auth.welcome'));
      }
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
                type="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={e => setEmail(e.target.value)}
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
              {loading ? t('auth.pleaseWait') : isSignUp ? t('auth.createAccount') : t('auth.signIn')}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary font-medium hover:underline">
              {isSignUp ? t('auth.signIn') : t('auth.signUp')}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
