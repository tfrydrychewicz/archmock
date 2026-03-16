import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">ArchMock</h1>
      <p className="text-lg text-muted-foreground mb-8">
        AI-powered system design interview practice
      </p>
      <SignedOut>
        <div className="flex gap-4">
          <Link
            href="/sign-in"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-md border border-input hover:bg-accent"
          >
            Sign Up
          </Link>
        </div>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Go to Dashboard
        </Link>
      </SignedIn>
    </div>
  );
}
