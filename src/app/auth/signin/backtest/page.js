import { BacktestSignInClient } from './BacktestSignInClient';

export const metadata = {
  title: "Sign In to Backtest | Ezana Finance",
  description: "Sign in to access the For The Quants backtesting engine and test hedge fund strategies.",
};

export default function BacktestSignInPage() {
  return (
    <div className="signin-dark-lock flex min-h-screen w-full items-center justify-center bg-[#0a0e13]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <BacktestSignInClient />
    </div>
  );
}
