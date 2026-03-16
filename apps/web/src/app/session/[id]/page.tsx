export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-6">
      <p>Session page (placeholder) — ID: {id}</p>
    </div>
  );
}
