import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-normal">Lincanada_GPT</h1>
        <Link
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85"
          href="/login"
        >
          Login
        </Link>
      </div>
    </main>
  );
}
