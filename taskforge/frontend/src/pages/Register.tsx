import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(email, password);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="st-auth-shell flex items-center justify-center">
      <div className="grid w-full max-w-5xl gap-8 md:grid-cols-[0.95fr_1.05fr]">
        <div className="st-auth-card mx-auto w-full max-w-md">
          <p className="st-kicker text-[color:var(--st-brand)]">Start here</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Create your SecreTerry account</h1>
          <p className="mt-2 text-sm leading-6 text-[color:var(--st-ink-soft)]">
            Email and password today, with room to add more sign-in options later.
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
                autoComplete="new-password"
                placeholder="Password"
              />
              <span className="st-helper mt-2 block">Minimum 8 characters.</span>
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button className="st-button-primary w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create account"}
            </button>
          </form>

          <div className="mt-8 rounded-[22px] border border-[color:var(--st-border)] bg-[color:var(--st-bg-subtle)] px-4 py-4">
            <p className="text-sm text-[color:var(--st-ink-soft)]">
              Already have an account?{" "}
              <Link className="font-bold text-[color:var(--st-brand-strong)]" to="/login">
                Log in
              </Link>
            </p>
          </div>
        </div>

        <section className="hidden rounded-[32px] border border-white/40 bg-white/35 p-10 text-slate-900 shadow-2xl backdrop-blur md:block">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[color:var(--st-accent)]">
            What you’re setting up
          </p>
          <h2 className="mt-4 text-5xl font-extrabold tracking-tight leading-[1.05]">
            A workspace that feels calm, clear, and ready to help.
          </h2>
          <div className="mt-8 grid gap-4">
            <div className="section-card">
              <p className="text-lg font-bold">Tasks and habits together</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--st-ink-soft)]">
                SecreTerry keeps the day readable without flattening everything into the same visual weight.
              </p>
            </div>
            <div className="section-card">
              <p className="text-lg font-bold">Built for more devices later</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--st-ink-soft)]">
                You’re starting simple with email and password, but the foundation is ready for more identity providers when you need them.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
