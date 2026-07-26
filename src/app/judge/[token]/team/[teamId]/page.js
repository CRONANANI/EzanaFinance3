import { JudgeScorecard } from '@/components/judge/JudgeScorecard';

export const dynamic = 'force-dynamic';

export default async function JudgeScorecardPage({ params }) {
  const { token, teamId } = await params;
  return <JudgeScorecard token={token} teamId={teamId} />;
}
