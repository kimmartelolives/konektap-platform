export default function DashboardPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card p-8 rounded-3xl text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">Authentication successful. You are logged in.</p>
      </div>
    </div>
  );
}