import { FormEvent, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { changePassword } from "../api/auth";

export default function AccountPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password updated.");
    } catch (err: any) {
      setError(err?.message || "Could not update password");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="st-kicker text-[color:var(--st-brand)]">Account</p>
          <h2 className="page-title mt-2">Your SecreTerry account</h2>
          <p className="page-subtitle">Manage your sign-in details without leaving the workspace.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="section-card space-y-4">
          <div>
            <p className="st-kicker text-[color:var(--st-accent)]">Signed in as</p>
            <h3 className="section-title mt-2">Email</h3>
            <p className="mt-2 text-base font-semibold text-[color:var(--st-ink)]">{user?.email || "Unknown"}</p>
          </div>

          <div className="st-surface p-4">
            <p className="st-kicker">Providers</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(user?.providers || []).map((provider) => (
                <span key={provider} className="st-badge st-badge-brand">
                  {provider}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="section-card">
          <p className="st-kicker text-[color:var(--st-brand)]">Security</p>
          <h3 className="section-title mt-2">Change password</h3>
          <p className="section-copy mt-2">Keep your account secure while we keep the rest of your workflow calm.</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="st-label">Current password</span>
              <input
                className="st-input"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Current password"
              />
            </label>

            <label className="block">
              <span className="st-label">New password</span>
              <input
                className="st-input"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
              />
            </label>

            <label className="block">
              <span className="st-label">Confirm new password</span>
              <input
                className="st-input"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
              />
            </label>

            {error ? <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {success ? <div className="rounded-2xl border border-[color:rgba(31,138,98,0.18)] bg-[color:var(--st-success-soft)] px-4 py-3 text-sm text-[color:var(--st-success)]">{success}</div> : null}

            <button className="st-button-primary w-full sm:w-auto" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating…" : "Update password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
