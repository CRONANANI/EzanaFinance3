'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, FileText } from 'lucide-react';
import { PARTNER_CATEGORIES } from '@/lib/help-center-content';
import '../../../help-center.css';

const BASE = '/help-center/partner';

export default function PartnerHelpCategoryPage() {
  const params = useParams();
  const slug = params?.slug;
  const category = slug ? PARTNER_CATEGORIES.find((c) => c.id === slug) : null;

  if (!category) {
    return (
      <div className="hc-page px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="hc-title mb-4 text-2xl font-semibold">Category not found</h1>
          <Link href={BASE} className="hc-link inline-flex items-center gap-2 hover:underline">
            <ChevronLeft className="h-4 w-4" />
            Back to Partner Help Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="hc-page">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link href={BASE} className="hc-link mb-8 inline-flex items-center gap-2 hover:underline">
          <ChevronLeft className="h-4 w-4" />
          Back to Partner Help Center
        </Link>
        <h1 className="hc-title mb-3 text-3xl font-bold">{category.title}</h1>
        {category.description && (
          <p className="hc-subtitle mb-10 text-base">{category.description}</p>
        )}
        <div className="space-y-2">
          {category.articles.map((art) => (
            <Link
              key={art.slug}
              href={`${BASE}/article/${art.slug}`}
              className="hc-card-compact flex items-center gap-4 p-4"
            >
              <FileText className="hc-accent h-5 w-5 flex-shrink-0" />
              <span className="hc-title">{art.title}</span>
              <ChevronLeft className="hc-faint ml-auto h-4 w-4 rotate-180" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
