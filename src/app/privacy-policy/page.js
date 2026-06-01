import { PRIVACY_POLICY_CSS, PRIVACY_POLICY_HTML } from './privacy-policy-content';

export const metadata = {
  title: 'Privacy Policy | Ezana Finance',
  description:
    'Privacy notice describing how Ezana Finance collects, uses, and shares personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="privacy-policy-page min-h-screen bg-white text-neutral-800">
      <style dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_CSS }} />
      <main
        className="privacy-policy-termly mx-auto max-w-4xl overflow-x-auto px-4 py-8 pb-16"
        dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_HTML }}
      />
    </div>
  );
}
