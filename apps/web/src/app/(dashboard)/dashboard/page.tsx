import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Welcome to ArchMock</h2>
        <UserButton afterSignOutUrl="/" />
      </div>
      <p className="text-muted-foreground">
        Select a system design problem to start practicing. Your session history
        will appear here.
      </p>
    </div>
  );
}
