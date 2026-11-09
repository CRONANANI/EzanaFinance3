/**
 * Home dashboard (/home-dashboard). Nov 2026 redesign: the page lives in
 * src/components/dashboard/home/DashboardPage.jsx; styles in
 * ./dashboard.module.css. The home canvas stylesheet loads last.
 */
import DashboardPage from '@/components/dashboard/home/DashboardPage';
import '@/components/beginner/beginner.css';
import '@/styles/home-canvas.css';

export default function HomeDashboardPage() {
  return <DashboardPage />;
}
