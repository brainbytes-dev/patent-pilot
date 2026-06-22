export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="h-8 w-48 animate-pulse bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border p-6 space-y-3">
            <div className="h-4 w-24 animate-pulse bg-muted" />
            <div className="h-8 w-16 animate-pulse bg-muted" />
          </div>
        ))}
      </div>
      <div className="border p-6 space-y-4">
        <div className="h-4 w-32 animate-pulse bg-muted" />
        <div className="h-4 w-full animate-pulse bg-muted" />
        <div className="h-4 w-3/4 animate-pulse bg-muted" />
      </div>
    </div>
  );
}
