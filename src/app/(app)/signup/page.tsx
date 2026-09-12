"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, signUp } from "@/lib/supabase";

type UserRole = "operator" | "verifier" | "senior" | "auditor" | "admin";

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: "operator", label: "Field Operator", desc: "Document upload and initial extraction" },
  { value: "verifier", label: "Verifier", desc: "Review and validate extracted records" },
  { value: "senior", label: "Senior Officer", desc: "Approve high-risk findings" },
  { value: "auditor", label: "Auditor", desc: "Access full audit trails" },
  { value: "admin", label: "Administrator", desc: "System management" },
];

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "operator" as UserRole,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
      const { data, error } = await signUp(formData.email, formData.password, formData.name, formData.role);
      if (error) throw error;

      // Redirect based on role
      if (data.user) {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)] px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-extrabold text-xl text-[var(--ink-800)]">
            <span className="w-3 h-3 rounded-[4px] bg-gradient-to-br from-[var(--saffron-600)] to-[var(--indigo-500)]" />
            LANDLENS
          </Link>
          <p className="mt-2 text-[var(--gray-600)]">Create Officer Account</p>
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
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input w-full"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ink-700)] mb-1">
                Officer Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
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
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input w-full"
                placeholder="Min. 6 characters"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ink-700)] mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input w-full"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ink-700)] mb-1">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input w-full"
              >
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--gray-600)] mt-1">
                {ROLES.find(r => r.value === formData.role)?.desc}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-teal w-full"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--border-hairline)] text-center">
            <p className="text-sm text-[var(--gray-600)]">
              Already have an account?{" "}
              <Link href="/login" className="text-[var(--teal-600)] hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}