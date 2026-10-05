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

/** The home override for a story, if one exists. */
export function withHomeImage(story) {
  const img = story && HOME_CARD_IMAGES[story.id];
  return img ? { ...story, image: img.src, imageAlt: img.alt } : story;
}
