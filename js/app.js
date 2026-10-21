/**
 * HopeConnect AI - Global Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initToastContainer();
  initModals();
  initRoleSwitcher();
  highlightActiveNavLink();
});

// Toast System
function initToastContainer() {
  if (!document.getElementById('toastContainer')) {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

window.showToast = function(message, type = 'success', icon = 'fas fa-check-circle') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="${icon} toast-icon"></i>
    <div class="toast-content">
      <span>${message}</span>
    </div>
  `;

  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  }, 4000);
};

// Navbar & Mobile Menu
function initNavbar() {
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      const icon = mobileBtn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
      }
    });
  }
}

function highlightActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navItems = document.querySelectorAll('.nav-links a');
  
  navItems.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Role Switcher Simulation
function initRoleSwitcher() {
  const roleSelect = document.getElementById('roleSwitcherSelect');
  if (roleSelect) {
    roleSelect.value = window.HCStore.getCurrentRole();
    roleSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      window.HCStore.setCurrentRole(selected);
      window.showToast(`Switched view to ${selected.toUpperCase()} Mode`, 'info', 'fas fa-user-circle');
      if (selected === 'ngo' && !window.location.pathname.includes('dashboard.html')) {
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);
      }
    });
  }
}

// Modal Helpers
function initModals() {
  // Close modals on backdrop click or close button
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop.id);
      }
    });
  });

  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const backdrop = btn.closest('.modal-backdrop');
      if (backdrop) {
        closeModal(backdrop.id);
      }
    });
  });
}

window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};
