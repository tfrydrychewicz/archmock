import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  await syncUser(userId);

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <h1 className="font-semibold">ArchMock Dashboard</h1>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
