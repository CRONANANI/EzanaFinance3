import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Ezana Finance",
  description:
    "Privacy notice describing how Ezana Finance collects, uses, and shares personal information.",
};

function extractStylesAndBody(raw) {
  const styles = [];
  const re = /<style>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(raw)) !== null) {
    styles.push(m[1]);
  }
  const html = raw.replace(/<style>[\s\S]*?<\/style>\s*/gi, "");
  return { css: styles.join("\n\n"), html };
}

export default function PrivacyPolicyPage() {
  const filePath = path.join(
    process.cwd(),
    "src/app/privacy-policy/privacy-policy-source.html"
  );
  const raw = fs.readFileSync(filePath, "utf8");
  const { css, html } = extractStylesAndBody(raw);

  return (
    <div className="min-h-screen bg-white text-neutral-800">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </header>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main
        className="privacy-policy-termly mx-auto max-w-4xl overflow-x-auto px-4 py-8 pb-16"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
