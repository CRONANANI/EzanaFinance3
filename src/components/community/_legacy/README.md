# Legacy community components

These are the pre-redesign components. Kept for 30 days post-deployment in case
rollback is needed. After 30 days of stable production with the new redesign,
this folder can be deleted.

Rollback path:

1. In `src/app/(dashboard)/community/page.js`, change the import back to:
   `import CommunityPageClient from '@/components/community/_legacy/CommunityPageClient';`
2. Restore the old `community.css` from git history.
3. Commit and push.

Files:

- CommunityPageClient.jsx — old main hub
- CommunityFeedPost.jsx — old feed post component
- FeedComposer.jsx — old composer
