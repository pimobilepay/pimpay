export default function AuthLoading() {
  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col items-center justify-center gap-3">
      <div
        className="rounded-full border-2 border-blue-500/25 border-t-blue-500 animate-spin"
        style={{ width: 28, height: 28, animationDuration: "0.6s" }}
        role="status"
        aria-label="loading"
      />
    </div>
  );
}
