// Watchlist Page - Add Member Modal

document.addEventListener('DOMContentLoaded', function() {
  const addMemberBtn = document.getElementById('addMemberBtn');
  const modal = document.getElementById('addMemberModal');
  const closeBtn = document.getElementById('closeModal');

  if (addMemberBtn) {
    addMemberBtn.addEventListener('click', function() {
      if (modal) modal.classList.add('active');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      if (modal) modal.classList.remove('active');
    });
  }

  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.classList.remove('active');
    });
  }
});
