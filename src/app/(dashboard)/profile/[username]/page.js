import { ProfilePageStripe } from '@/components/profile/redesign/ProfilePageStripe';

export default function ProfilePage({ params }) {
  return <ProfilePageStripe username={params.username} />;
}
