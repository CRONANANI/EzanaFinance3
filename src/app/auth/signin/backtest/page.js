import { BacktestSignInClient } from './BacktestSignInClient';

export const metadata = {
  title: "Sign In to Backtest | Ezana Finance",
  description: "Sign in to access the For The Quants backtesting engine and test hedge fund strategies.",
};

export default function BacktestSignInPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f0a]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <BacktestSignInClient />
    </div>
  );
}
