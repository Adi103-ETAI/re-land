"use client";
import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "verifier" as string,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.value]: e.target.name });
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
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Registration failed");
      }

      // Auto-login after registration
      const loginRes = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (loginRes.ok) {
        const data = await loginRes.json();
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-[var(--ink-800)]">
            <span className="w-3 h-3 rounded-[4px] bg-gradient-to-br from-[var(--saffron-600)] to-[var(--indigo-500)]" />
            LANDLENS
          </Link>
          <p className="text-sm text-[var(--gray-600)] mt-2">Create your officer account</p>
        </div>

        {/* Signup Card */}
        <div className="card !p-8">
          <h2 className="font-[var(--font-serif)] text-2xl font-semibold text-[var(--ink-900)] mb-6">
            Registration
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-[var(--red-50)] border border-[var(--red-200)] rounded-lg text-sm text-[var(--red-700)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink-700)] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input w-full"
                placeholder="Rajesh Deshmukh"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ink-700)] mb-1.5">
                Email Address
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
              <label className="block text-sm font-medium text-[var(--ink-700)] mb-1.5">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input w-full"
              >
                <option value="operator">Digitization Operator</option>
                <option value="verifier">Verification Officer</option>
                <option value="senior">Senior Officer</option>
                <option value="auditor">Auditor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ink-700)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input w-full"
                placeholder="Min 6 characters"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ink-700)] mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input w-full"
                placeholder="Repeat password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-teal w-full"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-[var(--gray-600)]">Already have an account? </span>
            <Link href="/login" className="text-[var(--saffron-600)] hover:text-[var(--saffron-700)] font-medium">
              Sign in
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--gray-500)] mt-6">
          SIH 2026 Prototype · Authorized government officers only
        </p>
      </div>
    </div>
  );
}
