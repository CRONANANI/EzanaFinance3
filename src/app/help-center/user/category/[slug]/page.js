'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, FileText } from 'lucide-react';
import { USER_CATEGORIES } from '@/lib/help-center-content';

const BASE = '/help-center/user';

export default function UserHelpCategoryPage() {
  const params = useParams();
  const slug = params?.slug;
  const category = slug ? USER_CATEGORIES.find((c) => c.id === slug) : null;

  if (!category) {
    return (
      <div className="min-h-screen bg-[#0f1419] px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-2xl font-semibold text-white">Category not found</h1>
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
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link href={BASE} className="mb-8 inline-flex items-center gap-2 text-[#10b981] hover:underline">
          <ChevronLeft className="h-4 w-4" />
          Back to User Help Center
        </Link>
        <h1 className="mb-10 text-3xl font-bold text-white">{category.title}</h1>
        <div className="space-y-2">
          {category.articles.map((art) => (
            <Link
              key={art.slug}
              href={`${BASE}/article/${art.slug}`}
              className="flex items-center gap-4 rounded-lg border border-[rgba(16,185,129,0.1)] bg-[rgba(26,35,50,0.4)] p-4 transition-all hover:border-[#10b981]/30 hover:bg-[rgba(16,185,129,0.05)]"
            >
              <FileText className="h-5 w-5 flex-shrink-0 text-[#10b981]" />
              <span className="text-white hover:text-[#10b981]">{art.title}</span>
              <ChevronLeft className="ml-auto h-4 w-4 rotate-180 text-[#6b7280]" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
