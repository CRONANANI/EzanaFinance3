import SignInCard from "@/components/auth/SignInCard";

export const metadata = {
  title: "Partner Login | Ezana Finance",
  description: "Sign in to your Ezana Finance partner or creator account.",
};

export default function PartnerSignInPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a]">
      {/* Background gradient effects - match landing page */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <SignInCard variant="partner" />
    </div>
  );
}
