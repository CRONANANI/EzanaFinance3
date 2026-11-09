/**
 * Custom nav glyphs (Nov 2026): the hand-drawn notification bell and the
 * checklist summit. Rendered as a CSS mask filled with currentColor, so they
 * take the button's theme colour in dark and light mode (an <img> would stay
 * black on the dark theme).
 */
import styles from './NavIcon.module.css';

const SOURCES = {
  bell: '/icons/notification-bell.svg',
  summit: '/icons/checklist-summit.svg',
};

export default function NavIcon({ name, size = 22, className = '' }) {
  const src = SOURCES[name];
  return (
    <span
      aria-hidden="true"
      className={`${styles.icon} nav-mask-icon ${className}`.trim()}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
    />
  );
}
