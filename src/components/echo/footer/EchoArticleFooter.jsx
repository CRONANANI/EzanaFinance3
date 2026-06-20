'use client';

import { formatPublishedDate } from '@/lib/echo-format';
import { EchoFooterByline } from './EchoFooterByline';
import { EchoFooterSentimentSection } from './EchoFooterSentimentSection';
import { EchoFooterWorthIt } from './EchoFooterWorthIt';
import { EchoFooterDiscuss } from './EchoFooterDiscuss';
import { EchoFooterMoreFrom } from './EchoFooterMoreFrom';
import { EchoFooterComments } from './EchoFooterComments';
import './echo-article-footer.css';

export function EchoArticleFooter({
  articleId,
  articleTitle,
  articleAuthor,
  articlePublishedAt,
  articleTracker,
}) {
  const baseAuthor =
    typeof articleAuthor === 'string'
      ? { name: articleAuthor, initial: articleAuthor.charAt(0).toUpperCase() }
      : articleAuthor || { name: 'Ezana Editorial', initial: 'E' };

  const author = {
    ...baseAuthor,
    date: baseAuthor.date || (articlePublishedAt ? formatPublishedDate(articlePublishedAt) : null),
  };

  return (
    <div className="echo-footer-v3">
      <EchoFooterByline author={author} />
      <EchoFooterSentimentSection articleId={articleId} />
      <EchoFooterWorthIt
        articleId={articleId}
        articleTitle={articleTitle}
        articleTracker={articleTracker}
      />
      <EchoFooterDiscuss articleId={articleId} />
      <EchoFooterMoreFrom author={author} />
      <EchoFooterComments articleId={articleId} />
    </div>
  );
}
