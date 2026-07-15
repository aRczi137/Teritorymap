export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-gray-600 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: '#9B30FF' }} />
        <p className="text-text-muted text-lg font-heading font-medium">Loading...</p>
      </div>
    </div>
  );
}
