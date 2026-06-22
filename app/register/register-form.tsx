"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not register account.");
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      router.push("/login");
      router.refresh();
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="w-full max-w-sm" onSubmit={handleSubmit}>
      <h1 className="text-2xl font-semibold tracking-normal">Register</h1>
      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground"
            autoComplete="name"
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            type="text"
            value={name}
          />
        </label>
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
            autoComplete="new-password"
            minLength={8}
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
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
      <p className="mt-5 text-center text-sm text-foreground/65">
        Already have an account?{" "}
        <Link className="font-medium underline" href="/login">
          Login
        </Link>
      </p>
    </form>
  );
}
