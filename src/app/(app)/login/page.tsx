"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, signIn } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      
      // Check if user is officer/admin
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)] px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-extrabold text-xl text-[var(--ink-800)]">
            <span className="w-3 h-3 rounded-[4px] bg-gradient-to-br from-[var(--saffron-600)] to-[var(--indigo-500)]" />
            LANDLENS
          </Link>
          <p className="mt-2 text-[var(--gray-600)]">Officer Sign In</p>
        </div>

        <div className="card !p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink-700)] mb-1">
                Officer Email
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
              <label className="block text-sm font-medium text-[var(--ink-700)] mb-1">
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

          <div className="mt-6 pt-6 border-t border-[var(--border-hairline)] text-center">
            <p className="text-sm text-[var(--gray-600)]">
              Don't have an account?{" "}
              <Link href="/signup" className="text-[var(--teal-600)] hover:underline font-medium">
                Register
              </Link>
            </p>
            <p className="text-sm text-[var(--gray-600)] mt-2">
              <Link href="/" className="text-[var(--ink-600)] hover:underline">
                ← Back to home
              </Link>
            </p>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-[var(--peri-100)] rounded-lg">
            <p className="text-xs font-semibold text-[var(--indigo-700)] mb-2">Demo Credentials</p>
            <div className="text-xs text-[var(--gray-600)] space-y-1">
              <p><strong>Email:</strong> operator@landlens.local</p>
              <p><strong>Password:</strong> operator123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}