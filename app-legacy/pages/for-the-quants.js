/**
 * For The Quants - Page initialization
 */
function setupDashboardSidebarSync() {
  const dashboardMain = document.querySelector('.for-the-quants-main.dashboard-main');
  if (!dashboardMain) return;
  const updateMargin = () => {
    const open = document.body.classList.contains('sidebar-open');
    dashboardMain.classList.toggle('sidebar-hidden', !open);
  };
  updateMargin();
  const observer = new MutationObserver(updateMargin);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

document.addEventListener('DOMContentLoaded', function () {
  if (typeof NotificationsSidebar !== 'undefined') {
    const sidebar = new NotificationsSidebar();
    sidebar.init();
  }

  setupDashboardSidebarSync();

  const modelSelect = document.getElementById('quantModelSelect');
  if (modelSelect) {
    modelSelect.addEventListener('change', function () {
      const modelName = this.options[this.selectedIndex].text;
      const nameEl = document.querySelector('.model-name');
      if (nameEl) nameEl.textContent = modelName;
    });
  }
});
