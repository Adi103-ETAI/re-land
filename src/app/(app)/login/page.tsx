"use client";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await res.json();
      // Store tokens
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-[var(--ink-800)]">
            <span className="w-3 h-3 rounded-[4px] bg-gradient-to-br from-[var(--saffron-600)] to-[var(--indigo-500)]" />
            LANDLENS
          </Link>
          <p className="text-sm text-[var(--gray-600)] mt-2">Land Record Digitization Platform</p>
        </div>

        {/* Login Card */}
        <div className="card !p-8">
          <h2 className="font-[var(--font-serif)] text-2xl font-semibold text-[var(--ink-900)] mb-6">
            Officer Login
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-[var(--red-50)] border border-[var(--red-200)] rounded-lg text-sm text-[var(--red-700)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink-700)] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                placeholder="officer@landlens.local"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ink-700)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-teal w-full"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--border-hairline)]">
            <p className="text-xs text-[var(--gray-600)] text-center mb-3">
              Demo Accounts:
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 bg-[var(--surface-elevated)] rounded">
                <span className="text-[var(--gray-600)]">Operator</span>
                <span className="font-mono text-[var(--ink-700)]">operator@landlens.local / operator123</span>
              </div>
              <div className="flex justify-between p-2 bg-[var(--surface-elevated)] rounded">
                <span className="text-[var(--gray-600)]">Verifier</span>
                <span className="font-mono text-[var(--ink-700)]">verifier@landlens.local / verifier123</span>
              </div>
              <div className="flex justify-between p-2 bg-[var(--surface-elevated)] rounded">
                <span className="text-[var(--gray-600)]">Admin</span>
                <span className="font-mono text-[var(--ink-700)]">admin@landlens.local / admin123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--gray-500)] mt-6">
          SIH 2026 Prototype · Maharashtra Land Records Division
        </p>
      </div>
    </div>
  );
}
