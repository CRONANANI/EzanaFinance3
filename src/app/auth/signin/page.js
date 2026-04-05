import SignInCard from "@/components/auth/SignInCard";

export const metadata = {
  title: "Sign In | Ezana Finance",
  description: "Sign in to your Ezana Finance account to access institutional-grade market intelligence.",
};

export default function SignInPage({ searchParams }) {
  const redirectTo =
    typeof searchParams?.redirect === "string" && searchParams.redirect.startsWith("/")
      ? searchParams.redirect
      : "/home";
  const oauthErrorMessage =
    typeof searchParams?.error === "string" ? searchParams.error : undefined;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f4f7f5]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl" />
      </div>

      <SignInCard redirectTo={redirectTo} oauthErrorMessage={oauthErrorMessage} />
    </div>
  );
}
