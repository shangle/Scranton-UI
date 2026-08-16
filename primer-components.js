/**
 * Primer Components & Interactivity Manager
 * Powers GitHub Primer Design System templates & Dunder Mifflin Showcases
 */

(function() {
  'use strict';

  // Helper function for HTML escaping
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ---------------------------------------------------------------------------
  // 1. Primer Theme Engine (Light, Dark, Beet)
  // ---------------------------------------------------------------------------
  window.setPrimerTheme = function(mode) {
    document.documentElement.setAttribute('data-color-mode', mode);
    document.body.setAttribute('data-color-mode', mode);
    localStorage.setItem('primer-color-mode', mode);

    // Update buttons state
    document.querySelectorAll('[data-primer-theme-btn]').forEach(btn => {
      const target = btn.getAttribute('data-primer-theme-btn');
      if (target === mode) {
        btn.classList.add('btn-primary');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('btn-primary');
        btn.setAttribute('aria-selected', 'false');
      }
    });
  };

  function initPrimerTheme() {
    const saved = localStorage.getItem('primer-color-mode') || 'light';
    window.setPrimerTheme(saved);
  }

  // ---------------------------------------------------------------------------
  // 2. UnderlineNav & Tab Handler
  // ---------------------------------------------------------------------------
  function initPrimerTabs() {
    document.addEventListener('click', (e) => {
      const tabItem = e.target.closest('.UnderlineNav-item, .tabnav-tab');
      if (!tabItem) return;

      const navContainer = tabItem.closest('.UnderlineNav-body, .tabnav-tabs');
      if (navContainer) {
        navContainer.querySelectorAll('.UnderlineNav-item, .tabnav-tab').forEach(t => {
          t.classList.remove('selected');
          t.removeAttribute('aria-current');
        });
        tabItem.classList.add('selected');
        tabItem.setAttribute('aria-current', 'page');
      }

      const targetId = tabItem.getAttribute('data-tab-target');
      if (targetId) {
        const parentSection = tabItem.closest('.primer-tab-section') || document;
        parentSection.querySelectorAll('.primer-tab-content').forEach(content => {
          content.style.display = content.id === targetId ? 'block' : 'none';
        });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Primer Toast / Flash Notification Helper
  // ---------------------------------------------------------------------------
  window.primerToast = function(msg, variant = 'default') {
    let container = document.getElementById('primer-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'primer-toast-container';
      container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; max-width: 360px; width: calc(100vw - 40px);';
      document.body.appendChild(container);
    }

    const flashMap = {
      default: 'Flash--default',
      success: 'Flash--success',
      warning: 'Flash--warning',
      danger: 'Flash--danger'
    };

    const flashClass = flashMap[variant] || 'Flash--default';

    const toast = document.createElement('div');
    toast.className = `Flash ${flashClass} animated fadeIn`;
    toast.style.cssText = 'position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin: 0; padding: 12px 16px; border-radius: 6px;';

    toast.innerHTML = `
      <div class="d-flex flex-items-center flex-justify-between">
        <div class="d-flex flex-items-center gap-2">
          <span>${escapeHTML(msg)}</span>
        </div>
        <button type="button" class="flash-close js-flash-close" aria-label="Close" style="background:none; border:none; cursor:pointer; font-weight:bold; font-size:14px;">✕</button>
      </div>
    `;

    toast.querySelector('.js-flash-close').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 4000);
  };

  // ---------------------------------------------------------------------------
  // 4. Primer Modal Dialog Controller
  // ---------------------------------------------------------------------------
  window.openPrimerModal = function(id) {
    const dialog = document.getElementById(id);
    if (dialog) {
      dialog.classList.add('open');
      document.body.style.overflow = 'hidden';

      const firstInput = dialog.querySelector('input, button, select, textarea');
      if (firstInput) firstInput.focus();
    }
  };

  window.closePrimerModal = function(id) {
    const dialog = document.getElementById(id);
    if (dialog) {
      dialog.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Interactive Primer Data Table Sorter
  // ---------------------------------------------------------------------------
  function parseCellValue(cell) {
    if (cell.hasAttribute('data-sort-value')) return cell.getAttribute('data-sort-value');
    const text = cell.textContent.trim();

    // Parentheses negative numbers: ($14,250) -> -14250
    if (text.startsWith('(') && text.endsWith(')')) {
      const num = parseFloat(text.replace(/[^0-9.]+/g, ''));
      if (!isNaN(num)) return -num;
    }

    const cleanText = text.replace(/[$%,]/g, '');
    const mMatch = cleanText.match(/^[+$-]?([\d.]+)\s*m$/i);
    if (mMatch) return parseFloat(mMatch[1]) * 1000000;

    const kMatch = cleanText.match(/^[+$-]?([\d.]+)\s*k$/i);
    if (kMatch) return parseFloat(kMatch[1]) * 1000;

    const num = parseFloat(cleanText);
    return isNaN(num) ? text : num;
  }

  function initPrimerTableSort() {
    document.querySelectorAll('.js-primer-sortable-table').forEach(table => {
      const headers = table.querySelectorAll('th.sortable');
      headers.forEach((th, colIdx) => {
        th.style.cursor = 'pointer';
        th.setAttribute('tabindex', '0');

        const sortHandler = () => {
          const tbody = table.querySelector('tbody') || table;
          const rows = Array.from(tbody.querySelectorAll('tr, .Box-row')).filter(r => !r.closest('thead'));
          const currentSort = th.getAttribute('data-sort-dir') || 'none';
          const isAsc = currentSort !== 'asc';

          headers.forEach(h => h.setAttribute('data-sort-dir', 'none'));
          th.setAttribute('data-sort-dir', isAsc ? 'asc' : 'desc');

          rows.sort((a, b) => {
            const cellsA = a.children;
            const cellsB = b.children;
            const valA = parseCellValue(cellsA[colIdx] || { textContent: '' });
            const valB = parseCellValue(cellsB[colIdx] || { textContent: '' });

            if (typeof valA === 'number' && typeof valB === 'number') {
              return isAsc ? valA - valB : valB - valA;
            }
            return isAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
          });

          rows.forEach(r => tbody.appendChild(r));
        };

        th.addEventListener('click', sortHandler);
        th.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            sortHandler();
          }
        });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Global Init Handler
  // ---------------------------------------------------------------------------
  function initAll() {
    initPrimerTheme();
    initPrimerTabs();
    initPrimerTableSort();

    // ActionList / NavList item toggle handler
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('.js-action-list-toggle');
      if (toggle) {
        const item = toggle.closest('.ActionListItem, li');
        if (item) {
          const subNav = item.querySelector('.ActionList-subnav, ul');
          if (subNav) {
            const isHidden = subNav.style.display === 'none';
            subNav.style.display = isHidden ? 'block' : 'none';
            toggle.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
          }
        }
      }
    });

    // Close modal on backdrop click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('primer-dialog-backdrop')) {
        e.target.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

})();
