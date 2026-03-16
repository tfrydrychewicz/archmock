import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Welcome to ArchMock</h2>
        <UserButton afterSignOutUrl="/" />
      </div>
      <p className="text-muted-foreground mb-6">
        Select a system design problem to start practicing. Your session history
        will appear here.
      </p>
      <Link
        href="/whiteboard"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Try Whiteboard
      </Link>
    </div>
  );
}
