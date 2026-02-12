/**
 * Sidebar Toggle System - Investment Feed
 */
class SidebarToggle {
  constructor() {
    this.sidebar = document.getElementById('investmentFeed');
    this.closeFeedBtn = document.getElementById('closeFeedBtn');
    this.notificationToggle = document.getElementById('notificationToggle');
    this.pageWrapper = document.querySelector('.page-wrapper');
    this.dashboardMain = document.querySelector('.dashboard-main');
    this.sidebarVisible = true;
    this.init();
  }

  init() {
    if (!this.sidebar) return;
    this.showSidebar();
    if (this.closeFeedBtn) {
      this.closeFeedBtn.addEventListener('click', () => this.toggleSidebar());
    }
    if (this.notificationToggle) {
      this.notificationToggle.addEventListener('click', () => this.toggleSidebar());
    }
    const filterButtons = document.querySelectorAll('.feed-filter');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
    if (this.sidebarVisible) {
      this.showSidebar();
    } else {
      this.hideSidebar();
    }
  }

  showSidebar() {
    this.sidebar?.classList.remove('hidden');
    this.pageWrapper?.classList.add('sidebar-active');
    document.body.classList.add('sidebar-open');
    if (this.dashboardMain) this.dashboardMain.classList.remove('sidebar-hidden');
  }

  hideSidebar() {
    this.sidebar?.classList.add('hidden');
    this.pageWrapper?.classList.remove('sidebar-active');
    document.body.classList.remove('sidebar-open');
    if (this.dashboardMain) this.dashboardMain.classList.add('sidebar-hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.sidebarToggle = new SidebarToggle();
});
