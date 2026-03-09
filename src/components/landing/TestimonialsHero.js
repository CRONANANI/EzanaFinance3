'use client';

import { TestimonialsSection } from '@/components/ui/testimonials-with-marquee';

const TESTIMONIALS = [
  {
    author: {
      name: 'Vivian Tu',
      handle: '@your.richbff',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
      socials: {
        instagram: 'https://instagram.com/your.richbff',
        tiktok: 'https://tiktok.com/@your.richbff',
      },
    },
    text: 'Finally, a platform that makes congressional trading data accessible to everyone. This is the transparency we need in the market.',
  },
  {
    author: {
      name: 'Sarah Chen',
      handle: 'Bloomberg',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    },
    text: 'Ezana gives us the institutional-grade data we need. Congressional trades and 13F filings in one place—game changer for our research team.',
  },
  {
    author: {
      name: 'Graham Stephan',
      handle: '@grahamstephan',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      socials: {
        twitter: 'https://twitter.com/grahamstephan',
        instagram: 'https://instagram.com/grahamstephan',
      },
    },
    text: 'The real-time alerts on congressional trades have completely changed how I approach market research. Incredible tool.',
  },
  {
    author: {
      name: 'Marcus Webb',
      handle: 'Reuters',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    },
    text: 'The real-time congressional trading alerts have transformed how we track policy-sensitive positions. Accuracy and speed are unmatched.',
  },
  {
    author: {
      name: 'Ben Felix',
      handle: '@BenFelixCSI',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      socials: {
        twitter: 'https://twitter.com/BenFelixCSI',
      },
    },
    text: 'As someone who values data-driven investing, Ezana provides exactly what retail investors have been missing—institutional-level insights.',
  },
  {
    author: {
      name: 'Elena Vasquez',
      handle: 'Financial Times',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    },
    text: 'Finally, retail investors get access to the same data that drives billions in institutional decisions. Ezana levels the playing field.',
  },
  {
    author: {
      name: 'James Okonkwo',
      handle: 'Washington Post',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    },
    text: 'Tracking legendary investor portfolios and hedge fund 13F filings used to require expensive terminals. Ezana makes it accessible.',
  },
];

export function TestimonialsHero() {
  return (
    <TestimonialsSection
      title="Trusted by Industry Leaders"
      description="Join thousands of investors who use Ezana to track congressional trades, institutional holdings, and market intelligence."
      testimonials={TESTIMONIALS}
      reversed={true}
      className="testimonials-below-hero"
    />
  );
}

export default TestimonialsHero;
