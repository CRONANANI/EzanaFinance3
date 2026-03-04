/**
 * Load Unified Navigation on All Pages
 */
const NAV_FALLBACK_HTML = `<nav class="main-nav" id="mainNav">
  <div class="nav-container">
    <a href="../index.html" class="nav-brand"><img src="../assets/images/ezana-logo.png" alt="Ezana Finance" class="nav-brand-logo"></a>
    <div class="nav-links">
      <a href="home-dashboard.html" class="nav-link" data-page="home-dashboard"><i class="bi bi-speedometer2"></i><span>Dashboard</span></a>
      <div class="nav-dropdown">
        <button class="nav-link dropdown-trigger" type="button"><i class="bi bi-search"></i><span>Research Tools</span><i class="bi bi-chevron-down chevron"></i></button>
        <div class="dropdown-menu">
          <a href="inside-the-capitol.html" class="dropdown-item"><i class="bi bi-building"></i><div><div class="item-title">Inside The Capitol</div><div class="item-desc">Congressional trading</div></div></a>
          <a href="company-research.html" class="dropdown-item"><i class="bi bi-bar-chart-line"></i><div><div class="item-title">Company Research</div><div class="item-desc">Financial analysis</div></div></a>
          <a href="market-analysis.html" class="dropdown-item"><i class="bi bi-graph-up-arrow"></i><div><div class="item-title">Market Analysis</div><div class="item-desc">Sectors, movers, indices & economic data</div></div></a>
          <a href="for-the-quants.html" class="dropdown-item"><i class="bi bi-calculator"></i><div><div class="item-title">For The Quants</div><div class="item-desc">Quant tools</div></div></a>
        </div>
      </div>
      <a href="watchlist.html" class="nav-link" data-page="watchlist"><i class="bi bi-bookmark"></i><span>Watchlist</span></a>
      <a href="community.html" class="nav-link" data-page="community"><i class="bi bi-people"></i><span>Community</span></a>
      <a href="learning-center.html" class="nav-link" data-page="learning-center"><i class="bi bi-mortarboard"></i><span>Learning Center</span></a>
    </div>
    <div class="nav-actions">
      <button class="nav-action-btn theme-toggle" id="themeToggle" title="Toggle theme" type="button"><i class="bi bi-sun-fill light-icon"></i><i class="bi bi-moon-fill dark-icon"></i></button>
      <button class="nav-action-btn notification-toggle" id="notificationToggle" title="Notifications" type="button"><i class="bi bi-bell"></i><span class="notification-badge">3</span></button>
      <button class="nav-action-btn user-menu-btn" id="userMenuBtn" title="Account" type="button"><i class="bi bi-person-circle"></i></button>
    </div>
  </div>
</nav>`;

function setActiveNavLink(container) {
  const currentPath = (window.location.pathname || window.location.href) + '';
  const pageName = currentPath.split('/').pop().replace(/\.html$/, '') || '';
  (container || document).querySelectorAll('.nav-link[data-page]').forEach(link => {
    const linkPage = link.getAttribute('data-page');
    if (linkPage && (currentPath.includes(linkPage) || pageName === linkPage)) {
      link.classList.add('active');
    }
  });
}

async function loadNavigation() {
  const navContainer = document.getElementById('mainNav');
  if (!navContainer) return;

  let html = null;

  try {
    const script = document.currentScript || document.querySelector('script[src*="load-nav"]');
    let navUrl;
    if (script && script.src && script.src.startsWith('http')) {
      const url = new URL(script.src);
      navUrl = url.origin + url.pathname.replace(/load-nav\.js(\?.*)?$/i, '') + 'unified-nav.html';
    } else {
      const isInPages = /\/pages\//.test(window.location.pathname) || /\/pages\/[^/]+$/.test(window.location.pathname);
      navUrl = (isInPages ? '../' : './') + 'components/navigation/unified-nav.html';
    }
    const response = await fetch(navUrl);
    if (response.ok) html = await response.text();
  } catch (e) { /* fetch failed, use fallback */ }

  navContainer.outerHTML = html || NAV_FALLBACK_HTML;
  setActiveNavLink(document);
}

document.addEventListener('DOMContentLoaded', loadNavigation);
