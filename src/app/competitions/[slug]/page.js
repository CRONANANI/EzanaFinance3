import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase';
import './public.css';

export const dynamic = 'force-dynamic';

// EXPLICIT safe column list — never select tokens, internal notes, or created_by
// into the public page. Only marketing fields, and only for is_public rows.
const SAFE_COLUMNS = 'id, name, slug, format, theme, description, public_blurb, banner_path, starts_at, ends_at, host_org_id, is_public';

const FORMAT_LABEL = { showcase: 'Showcase', single_elim: 'Single elimination', round_robin: 'Round robin' };

function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

const CTA = {
  open_signup: { label: 'Register your team', mode: 'link' },
  request_approval: { label: 'Request to join', mode: 'link' },
  application: { label: 'Apply to compete', mode: 'link' },
  invite_only: { label: 'This competition is invite-only', mode: 'contact' },
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const admin = getAdminClient();
  const { data } = await admin.from('pitch_competitions').select('name, public_blurb, is_public').eq('slug', slug).maybeSingle();
  if (!data || !data.is_public) return { title: 'Competition' };
  return { title: `${data.name} — Pitch Competition`, description: data.public_blurb || undefined };
}

export default async function PublicCompetitionPage({ params }) {
  const { slug } = await params;
  const admin = getAdminClient();

  const { data: comp } = await admin.from('pitch_competitions').select(SAFE_COLUMNS).eq('slug', slug).maybeSingle();
  if (!comp || !comp.is_public) notFound();

  const [{ data: host }, { data: sponsors }, { data: config }] = await Promise.all([
    admin.from('organizations').select('name, university_name').eq('id', comp.host_org_id).maybeSingle(),
    admin.from('pitch_sponsors').select('id, name, url, tier, logo_path').eq('competition_id', comp.id).order('sort_order', { ascending: true }),
    admin.from('pitch_competition_config').select('admission_mode').eq('competition_id', comp.id).maybeSingle(),
  ]);

  const admission = config?.admission_mode || 'invite_only';
  const cta = CTA[admission] || CTA.invite_only;
  const date = [fmtDate(comp.starts_at), fmtDate(comp.ends_at)].filter(Boolean).join(' – ');

  return (
    <div className="pubx-page">
      <div className="pubx-container">
        <header className="pubx-hero">
          <p className="pubx-eyebrow">Stock-Pitch Competition</p>
          <h1 className="pubx-title">{comp.name}</h1>
          {host ? <p className="pubx-host">Hosted by {host.university_name || host.name}</p> : null}
          {comp.theme ? <p className="pubx-theme">{comp.theme}</p> : null}

          <div className="pubx-facts">
            {date ? <span className="pubx-fact">{date}</span> : null}
            <span className="pubx-fact">{FORMAT_LABEL[comp.format] || comp.format}</span>
          </div>

          <div className="pubx-cta">
            {cta.mode === 'link' ? (
              <Link href={`/org-competitions/${comp.slug}/join`} className="pubx-btn">
                {cta.label}
              </Link>
            ) : (
              <span className="pubx-invite">{cta.label} — contact the host council for an invitation.</span>
            )}
          </div>
        </header>

        {comp.public_blurb || comp.description ? (
          <section className="pubx-section">
            <p className="pubx-blurb">{comp.public_blurb || comp.description}</p>
          </section>
        ) : null}

        {sponsors?.length ? (
          <section className="pubx-section">
            <h2 className="pubx-h2">Sponsors</h2>
            <div className="pubx-sponsors">
              {sponsors.map((s) => {
                const inner = (
                  <>
                    {s.logo_path && /^https?:\/\//.test(s.logo_path) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo_path} alt={s.name} className="pubx-sponsor-logo" />
                    ) : (
                      <span className="pubx-sponsor-name">{s.name}</span>
                    )}
                    {s.tier ? <span className="pubx-sponsor-tier">{s.tier}</span> : null}
                  </>
                );
                return s.url ? (
                  <a key={s.id} className="pubx-sponsor" href={s.url} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                ) : (
                  <span key={s.id} className="pubx-sponsor">
                    {inner}
                  </span>
                );
              })}
            </div>
          </section>
        ) : null}

        <footer className="pubx-footer">Powered by Ezana</footer>
      </div>
    </div>
  );
}
