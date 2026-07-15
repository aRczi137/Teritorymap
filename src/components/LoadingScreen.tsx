export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#111118]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-t-[#5865F2] border-gray-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-300 text-lg font-medium">Loading...</p>
      </div>
    </div>
  );
}
