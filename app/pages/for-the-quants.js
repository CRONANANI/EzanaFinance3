/**
 * For The Quants - Page initialization
 */
document.addEventListener('DOMContentLoaded', function () {
  if (typeof NotificationsSidebar !== 'undefined') {
    const sidebar = new NotificationsSidebar();
    sidebar.init();
  }

  const modelSelect = document.getElementById('quantModelSelect');
  if (modelSelect) {
    modelSelect.addEventListener('change', function () {
      const modelName = this.options[this.selectedIndex].text;
      const nameEl = document.querySelector('.model-name');
      if (nameEl) nameEl.textContent = modelName;
    });
  }
});
