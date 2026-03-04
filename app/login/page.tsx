"use client";

import { useState } from "react";
import { Zap, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");

    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // Auto sign-in after signup
      await supabase.auth.signInWithPassword({ email: email.trim(), password });
      router.push("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError("Wrong email or password");
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Enter your email first");
      return;
    }
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setResetSent(true);
  }

  if (resetSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center space-y-3">
          <p className="font-semibold">Check your email</p>
          <p className="text-sm text-muted-foreground">
            Password reset link sent to <span className="text-foreground">{email}</span>.
          </p>
          <button
            onClick={() => setResetSent(false)}
            className="text-sm text-muted-foreground underline"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Zap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Kayan</h1>
          <p className="mt-2 text-muted-foreground">Your second brain for relationships</p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg bg-muted p-1">
          <button
            onClick={() => switchMode("signin")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
              mode === "signin" ? "bg-background text-foreground shadow" : "text-muted-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => switchMode("signup")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
              mode === "signup" ? "bg-background text-foreground shadow" : "text-muted-foreground"
            }`}
          >
            Create account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="h-12 text-base pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            className="h-12 w-full text-base"
            disabled={loading || !email.trim() || !password}
          >
            {loading
              ? mode === "signup" ? "Creating account..." : "Signing in..."
              : mode === "signup" ? "Create account" : "Sign in"}
          </Button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
