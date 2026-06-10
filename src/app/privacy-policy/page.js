import { PRIVACY_POLICY_CSS, PRIVACY_POLICY_HTML } from './privacy-policy-content';
import '../legal-pages.css';

export const metadata = {
  title: 'Privacy Policy | Ezana Finance',
  description:
    'Privacy notice describing how Ezana Finance collects, uses, and shares personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="privacy-policy-page legal-page">
      {/* Termly's own styles first, then our brand override stylesheet
          (imported above) wins via higher-specificity `.privacy-policy-termly`
          selectors. */}
      <style dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_CSS }} />
      <header className="privacy-policy-header">
        <p className="legal-eyebrow">Legal</p>
      </header>
      <main
        className="privacy-policy-termly overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_HTML }}
      />
    </div>
  );
}
