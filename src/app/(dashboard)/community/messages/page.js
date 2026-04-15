'use client';

import '@/app/(dashboard)/home-dashboard/home-dashboard.css';
import '@/app/(dashboard)/community/community.css';
import './messages.css';
import MessagesPageClient from '@/components/community/MessagesPageClient';

export default function MessagesPage() {
  return <MessagesPageClient />;
}
