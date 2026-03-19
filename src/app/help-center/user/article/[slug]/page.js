'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { USER_ARTICLES } from '@/lib/help-center-content';

const BASE = '/help-center/user';

export default function UserHelpArticlePage() {
  const params = useParams();
  const slug = params?.slug;
  const article = slug ? USER_ARTICLES[slug] : null;

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0f1419] px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-2xl font-semibold text-white">Article not found</h1>
          <Link href={BASE} className="inline-flex items-center gap-2 text-[#10b981] hover:underline">
            <ChevronLeft className="h-4 w-4" />
            Back to User Help Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <article className="mx-auto max-w-3xl px-4 py-12">
        <Link href={BASE} className="mb-8 inline-flex items-center gap-2 text-[#10b981] hover:underline">
          <ChevronLeft className="h-4 w-4" />
          Back to User Help Center
        </Link>
        <p className="mb-2 text-sm text-[#10b981]">{article.category}</p>
        <h1 className="mb-8 text-3xl font-bold text-white">{article.title}</h1>
        <div className="prose prose-invert max-w-none text-[#9ca3af] [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-white [&_ol]:space-y-2 [&_ul]:space-y-2 [&_p]:mt-4 [&_p]:first:mt-0 [&_strong]:text-white" dangerouslySetInnerHTML={{ __html: article.content }} />
        <div className="mt-12 border-t border-[rgba(16,185,129,0.1)] pt-8">
          <p className="mb-4 text-sm text-[#6b7280]">Was this article helpful?</p>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-[rgba(16,185,129,0.2)] px-4 py-2 text-sm text-[#9ca3af] transition-colors hover:border-[#10b981] hover:text-[#10b981]">Yes</button>
            <button type="button" className="rounded-lg border border-[rgba(16,185,129,0.2)] px-4 py-2 text-sm text-[#9ca3af] transition-colors hover:border-[#10b981] hover:text-[#10b981]">No</button>
          </div>
        </div>
      </article>
    </div>
  );
}
