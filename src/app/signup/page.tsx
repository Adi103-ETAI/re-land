"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signUp, signInWithGoogle, type UserRole } from "@/lib/auth";

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: "operator", label: "Field Operator", desc: "Document upload and initial extraction" },
  { value: "verifier", label: "Verifier", desc: "Review and validate extracted records" },
  { value: "senior", label: "Senior Officer", desc: "Approve high-risk findings" },
  { value: "auditor", label: "Auditor", desc: "Access full audit trails" },
  { value: "admin", label: "Administrator", desc: "System management" },
];

const HeroImage =
  "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1600&q=80";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "operator" as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error: err, data } = await signUp(
        formData.email,
        formData.password,
        formData.name,
        formData.role
      );
      if (err) throw err;
      // Prototype: ignore email confirmation — go straight to dashboard.
      // If Supabase requires confirmation, user will be confirmed via dashboard setting.
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    try {
      const { error: err } = await signInWithGoogle();
      if (err) throw err;
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed.");
    }
  };

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      {/* Left hero — hidden on mobile */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={HeroImage}
          alt="Land records field"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <Link
            href="/"
            className="animate-element animate-delay-100 flex items-center gap-2 text-lg font-extrabold tracking-tight text-white"
          >
            <span className="h-3 w-3 rounded-[4px] bg-gradient-to-br from-saffron-500 to-indigo-400" />
            LANDLENS
          </Link>
          <div className="max-w-md space-y-4">
            <h2 className="animate-element animate-delay-300 text-3xl font-semibold leading-tight text-white">
              Join the mission to digitize India&apos;s land records.
            </h2>
            <p className="animate-element animate-delay-400 text-sm leading-relaxed text-white/70">
              One account for the full pipeline — upload, AI extraction, validation and
              human verification — with role-based access and a complete audit trail.
            </p>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="animate-slide-right w-full max-w-md">
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2 text-xl font-extrabold tracking-tight lg:hidden"
          >
            <span className="h-3 w-3 rounded-[4px] bg-gradient-to-br from-saffron-500 to-indigo-400" />
            LANDLENS
          </Link>

          <h1 className="animate-element animate-delay-100 text-3xl font-bold tracking-tight">
            Create Officer Account
          </h1>
          <p className="animate-element animate-delay-200 mt-2 text-sm text-muted-foreground">
            Register to start digitizing and verifying land records.
          </p>

          {error && (
            <div
              role="alert"
              className="animate-element animate-delay-200 mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 backdrop-blur-md"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="animate-element animate-delay-300">
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Full Name
              </label>
              <div className="rounded-2xl border border-foreground/10 bg-foreground/5 backdrop-blur-md transition-colors duration-200 focus-within:border-violet-400/70 focus-within:bg-foreground/10 hover:bg-foreground/10">
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/70"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="animate-element animate-delay-400">
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Officer Email
              </label>
              <div className="rounded-2xl border border-foreground/10 bg-foreground/5 backdrop-blur-md transition-colors duration-200 focus-within:border-violet-400/70 focus-within:bg-foreground/10 hover:bg-foreground/10">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="officer@landlens.local"
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/70"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="animate-element animate-delay-500">
              <label htmlFor="password" className="mb-2 block text-sm font-medium">
                Password
              </label>
              <div className="rounded-2xl border border-foreground/10 bg-foreground/5 backdrop-blur-md transition-colors duration-200 focus-within:border-violet-400/70 focus-within:bg-foreground/10 hover:bg-foreground/10">
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    className="w-full bg-transparent px-4 py-3 pr-12 text-sm outline-none placeholder:text-muted-foreground/70"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="animate-element animate-delay-600">
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
                Confirm Password
              </label>
              <div className="rounded-2xl border border-foreground/10 bg-foreground/5 backdrop-blur-md transition-colors duration-200 focus-within:border-violet-400/70 focus-within:bg-foreground/10 hover:bg-foreground/10">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/70"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div className="animate-element animate-delay-700">
              <label htmlFor="role" className="mb-2 block text-sm font-medium">
                Role
              </label>
              <div className="rounded-2xl border border-foreground/10 bg-foreground/5 backdrop-blur-md transition-colors duration-200 focus-within:border-violet-400/70 focus-within:bg-foreground/10 hover:bg-foreground/10">
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full cursor-pointer appearance-none bg-transparent px-4 py-3 text-sm outline-none"
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value} className="bg-white">
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {ROLES.find((r) => r.value === formData.role)?.desc}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="animate-element animate-delay-800 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </button>

            <div className="animate-element animate-delay-900 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignUp}
              className="animate-element flex w-full items-center justify-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-sm font-medium backdrop-blur-md transition-all duration-200 hover:bg-foreground/10 active:scale-[0.98]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <p className="animate-element text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary transition-colors hover:underline"
              >
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
