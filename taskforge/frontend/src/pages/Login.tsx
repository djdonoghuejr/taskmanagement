import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      const next = (location.state as any)?.from || "/";
      navigate(next, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="st-auth-shell flex items-center justify-center">
      <div className="grid w-full max-w-5xl gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-[32px] border border-white/40 bg-white/35 p-10 text-slate-900 shadow-2xl backdrop-blur md:block">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[color:var(--st-brand)]">
            SecreTerry
          </p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight leading-[1.05]">
            Move through your day with calm, visible momentum.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[color:var(--st-ink-soft)]">
            SecreTerry keeps tasks, habits, and timing in one polished workspace so the next right action is always easy to spot.
          </p>
          <div className="mt-10 grid gap-4">
            <div className="section-card">
              <p className="st-kicker">Today at a glance</p>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">Due today, upcoming, and history</p>
                  <p className="mt-1 text-sm text-[color:var(--st-ink-soft)]">
                    One place to steer the entire day.
                  </p>
                </div>
                <span className="st-badge st-badge-brand">Focused</span>
              </div>
            </div>
          </div>
        </section>

        <div className="st-auth-card mx-auto w-full max-w-md">
          <p className="st-kicker text-[color:var(--st-brand)]">Welcome back</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Log in to SecreTerry</h1>
          <p className="mt-2 text-sm leading-6 text-[color:var(--st-ink-soft)]">
            Pick up where you left off and let your personal secretary handle the structure.
          </p>

          <form className="mt-8 space-y-5" onSubmit={onSubmit}>
            <label className="block">
              <span className="st-label">Email</span>
              <input
                className="st-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="st-label">Password</span>
              <input
                className="st-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Password"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button className="st-button-primary w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging in…" : "Log in"}
            </button>
          </form>

          <div className="mt-8 rounded-[22px] border border-[color:var(--st-border)] bg-[color:var(--st-bg-subtle)] px-4 py-4">
            <p className="text-sm text-[color:var(--st-ink-soft)]">
              New here?{" "}
              <Link className="font-bold text-[color:var(--st-brand-strong)]" to="/register">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
