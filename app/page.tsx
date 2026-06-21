import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="text-center">
        <Image
          alt=""
          className="mx-auto h-20 w-20 rounded-2xl"
          height={80}
          src="/lin-system-logo.png"
          width={80}
        />
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          Lin System
        </h1>
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
