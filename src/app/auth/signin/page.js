import SignInCard from "@/components/auth/SignInCard";

export const metadata = {
  title: "Sign In | Ezana Finance",
  description: "Sign in to your Ezana Finance account to access institutional-grade market intelligence.",
};

export default function SignInPage({ searchParams }) {
  const redirectTo =
    typeof searchParams?.redirect === "string" && searchParams.redirect.startsWith("/")
      ? searchParams.redirect
      : "/home-dashboard";
  const oauthErrorMessage =
    typeof searchParams?.error === "string" ? searchParams.error : undefined;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f0a]">
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <SignInCard redirectTo={redirectTo} oauthErrorMessage={oauthErrorMessage} />
    </div>
  );
}
