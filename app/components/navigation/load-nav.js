/**
 * Load Unified Navigation on All Pages
 */
async function loadNavigation() {
  const navContainer = document.getElementById('mainNav');
  if (!navContainer) return;

  // Resolve nav path relative to current page
  const isInPages = window.location.pathname.includes('/pages/') || /\/pages\/[^/]+$/.test(window.location.pathname);
  const base = isInPages ? '..' : '.';
  const navPath = base + '/components/navigation/unified-nav.html';

  try {
    const response = await fetch(navPath);
    if (!response.ok) throw new Error('Nav fetch failed');
    const html = await response.text();
    navContainer.outerHTML = html;

    const currentPath = window.location.pathname || window.location.href;
    const pageName = currentPath.split('/').pop().replace('.html', '') || currentPath.split('/').pop();
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
      const linkPage = link.getAttribute('data-page');
      if (currentPath.includes(linkPage) || pageName === linkPage) {
        link.classList.add('active');
      }
    });

    if (typeof window.ThemeManager !== 'undefined') {
      window.themeManager?.init?.();
    }
  } catch (error) {
    console.error('Failed to load navigation:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadNavigation);
