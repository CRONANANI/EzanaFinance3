import './account-locked.css';

export const metadata = {
  title: 'Account Locked | Ezana',
  description: 'Your account has been temporarily locked.',
};

export default function AccountLockedLayout({ children }) {
  return <div className="account-locked-shell">{children}</div>;
}
