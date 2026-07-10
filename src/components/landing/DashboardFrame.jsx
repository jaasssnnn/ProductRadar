export default function DashboardFrame() {
  return (
    <div className="rounded-t-2xl overflow-hidden bg-[#1a1a1c] shadow-[0_-20px_80px_rgba(0,0,0,0.35)] ring-1 ring-white/10 text-left">
      <img
        src="/landing/dashboard.png"
        alt="ProductRadar dashboard — churn risk overview across all accounts"
        className="w-full h-auto block select-none pointer-events-none"
        draggable={false}
      />
    </div>
  );
}
