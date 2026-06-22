"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(searchParams.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsGoogleSubmitting(true);
    await signIn("google", {
      callbackUrl: searchParams.get("callbackUrl") ?? "/dashboard",
    });
  }

  return (
    <form className="w-full max-w-sm" onSubmit={handleSubmit}>
      <h1 className="text-2xl font-semibold tracking-normal">Login</h1>
      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground"
            autoComplete="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground"
            autoComplete="current-password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <button
        className="mt-6 h-11 w-full rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || isGoogleSubmitting}
        type="submit"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-foreground/45">
        <span className="h-px flex-1 bg-foreground/15" />
        or
        <span className="h-px flex-1 bg-foreground/15" />
      </div>
      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-md border border-foreground/20 bg-background px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground/45 hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || isGoogleSubmitting}
        onClick={handleGoogleSignIn}
        type="button"
      >
        {isGoogleSubmitting ? "Opening Google..." : "Continue with Google"}
      </button>
    </form>
  );
}
