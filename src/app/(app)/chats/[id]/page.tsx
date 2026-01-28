export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground text-lg">Chat {id}</p>
    </div>
  );
}
