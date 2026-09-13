"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signUp, type UserRole } from "@/lib/auth";

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
      const { error: err } = await signUp(
        formData.email,
        formData.password,
        formData.name,
        formData.role
      );
      if (err) throw err;
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
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

            <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
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
