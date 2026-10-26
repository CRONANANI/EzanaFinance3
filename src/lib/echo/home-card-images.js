/**
 * Ezana Echo HOME card photography. One consistent, licence-cleared photo per
 * published article, used only by the Echo home grid and hero. Article pages
 * keep their own heroImage from the article module.
 *
 * Every entry must be Unsplash License or Pexels License (free commercial use,
 * no attribution required); credit and source are kept here as the rights
 * trail. Files live in public/images/ezana-echo/home/<slug>.webp at 1600x1000.
 *
 * Empty until the photo set is sourced: a story with no entry keeps the image
 * from its article module, so adding an entry here is the whole change.
 *
 * Entry shape:
 *   '<slug>': {
 *     src: '/images/ezana-echo/home/<slug>.webp',
 *     alt: 'Plain description of the photo',
 *     credit: 'Photographer name',
 *     source: 'https://unsplash.com/photos/<id>',
 *     license: 'Unsplash License',
 *   },
 */
export const HOME_CARD_IMAGES = {};

/**
 * Master switch for photography on the Echo home (hero, bento cards and their
 * loading skeletons). Off for now: every story reaches the home with no image,
 * so the bento lays out its text tiles and the hero renders its no-image
 * variant. Article pages are unaffected; they keep their own heroImage. Flip
 * to true to bring home photos back (HOME_CARD_IMAGES overrides then apply).
 */
export const HOME_IMAGES_ENABLED = false;

/** The home image for a story: none while disabled, else the override if one exists. */
export function withHomeImage(story) {
  if (!story) return story;
  if (!HOME_IMAGES_ENABLED) return { ...story, image: null, imageAlt: '', imagePosition: null };
  const img = HOME_CARD_IMAGES[story.id];
  return img ? { ...story, image: img.src, imageAlt: img.alt, imagePosition: null } : story;
}
