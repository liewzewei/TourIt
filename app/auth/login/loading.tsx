export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}