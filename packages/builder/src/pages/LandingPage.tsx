import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store';

export function LandingPage() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const loading = useAppSelector((s) => s.auth.loading);

  function handleStartCreating() {
    if (loading) return;
    navigate(user ? '/dashboard' : '/login');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight text-foreground">
        Build interactive <span className="text-primary">STEM courses</span>
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Drag-and-drop blocks. Live physics simulations. Code playgrounds. Publish in minutes.
      </p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={handleStartCreating}
          disabled={loading}
          className="rounded-md bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Start creating
        </button>
        <button
          onClick={() => navigate('/login')}
          className="rounded-md border px-8 py-3 text-base font-semibold hover:bg-accent transition-colors"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
