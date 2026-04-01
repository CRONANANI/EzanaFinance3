import { ProfilePageClient } from '@/components/profile/ProfilePageClient';

export default function ProfilePage({ params }) {
  return <ProfilePageClient username={params.username} />;
}
