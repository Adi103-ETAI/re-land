"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SignInPage, type Testimonial } from "@/components/ui/sign-in";
import { useToast } from "@/hooks/use-toast";
import { signIn } from "@/lib/supabase";

const testimonials: Testimonial[] = [
  {
    avatarSrc: "https://cdn.21st.dev/assets/mirror/9f/9f797e4acee1a4de4f9b4c3aa1cc4e89d7c9efd5dbff1c463d88374ed601d719.jpg",
    name: "Sarah Chen",
    handle: "@sarahdigital",
    text: "Amazing platform! The user experience is seamless and the features are exactly what I needed.",
  },
  {
    avatarSrc: "https://cdn.21st.dev/assets/mirror/8d/8d9a61a581c43fe2088f221b7692c95db4b3ad5c0da0c856400c0e5acdcdcea8.jpg",
    name: "Marcus Johnson",
    handle: "@marcustech",
    text: "This service has transformed how I work. Clean design, powerful features, and excellent support.",
  },
  {
    avatarSrc: "https://cdn.21st.dev/assets/mirror/a6/a634d4f02fe5b77804943c1d74b8d70e35ffe26454e0e9af9717432a2c72bfde.jpg",
    name: "David Martinez",
    handle: "@davidcreates",
    text: "I've tried many platforms, but this one stands out. Intuitive, reliable, and genuinely helpful for productivity.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") || "");
      const password = String(formData.get("password") || "");
      const { error } = await signIn(email, password);
      if (error) throw error;
      router.push("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: err?.message || "Please check your credentials and try again.",
      });
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    toast({ title: "Google sign-in", description: "Google OAuth is not wired in this prototype — use the demo credentials." });
  };

  const handleResetPassword = () => {
    toast({ title: "Reset link sent", description: "If the email exists, a reset link is on its way." });
  };

  const handleCreateAccount = () => {
    router.push("/signup");
  };

  return (
    <>
      {submitting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Signing you in…</p>
          </div>
        </div>
      )}
      <div className="bg-background text-foreground">
        <SignInPage
          title={
            <span className="font-light tracking-tighter">
              Welcome <span className="font-semibold text-foreground">back</span>
            </span>
          }
          description={
            <>
              Access your account and continue your journey with us.
              <span className="mt-1 block text-xs text-muted-foreground/80">
                Demo credentials — operator@landlens.local · operator123
              </span>
            </>
          }
          heroImageSrc="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2070&auto=format&fit=crop"
          testimonials={testimonials}
          onSignIn={handleSignIn}
          onGoogleSignIn={handleGoogleSignIn}
          onResetPassword={handleResetPassword}
          onCreateAccount={handleCreateAccount}
        />
      </div>
    </>
  );
}
