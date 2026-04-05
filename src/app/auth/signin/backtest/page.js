import { BacktestSignInClient } from './BacktestSignInClient';

export const metadata = {
  title: "Sign In to Backtest | Ezana Finance",
  description: "Sign in to access the For The Quants backtesting engine and test hedge fund strategies.",
};

export default function BacktestSignInPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f4f7f5]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl" />
      </div>

      <BacktestSignInClient />
    </div>
  );
}
