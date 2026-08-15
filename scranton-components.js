/**
 * Scranton-UI Custom Web Components v1.0.0
 * Zero-dependency, lightweight Vanilla Web Components for dense desktop apps.
 * Features URL state management (Theme, Tab selection, Modal triggers).
 */

(function() {
  'use strict';

  // Helper to sync URL params
  function setUrlParam(key, val) {
    const url = new URL(window.location.href);
    if (val) {
      url.searchParams.set(key, val);
    } else {
      url.searchParams.delete(key);
    }
    window.history.replaceState({}, '', url);
  }

  function getUrlParam(key) {
    const url = new URL(window.location.href);
    return url.searchParams.get(key);
  }

  // ---------------------------------------------------------------------------
  // 1. <scranton-theme-switcher>
  // ---------------------------------------------------------------------------
  class ScrantonThemeSwitcher extends HTMLElement {
    connectedCallback() {
      const initialTheme = getUrlParam('theme') || localStorage.getItem('scranton-theme') || 'theme-light';
      this.applyTheme(initialTheme);

      this.innerHTML = `
        <div class="sc-btn-group">
          <button type="button" class="sc-btn sc-btn-sm ${initialTheme === 'theme-light' ? 'active' : ''}" data-theme-val="theme-light">Light</button>
          <button type="button" class="sc-btn sc-btn-sm ${initialTheme === 'theme-dark' ? 'active' : ''}" data-theme-val="theme-dark">Dark</button>
          <button type="button" class="sc-btn sc-btn-sm ${initialTheme === 'theme-beet' ? 'active' : ''}" data-theme-val="theme-beet" style="color: var(--sc-mustard, #f59e0b);">Beet</button>
        </div>
      `;

      this.querySelectorAll('[data-theme-val]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const theme = e.currentTarget.getAttribute('data-theme-val');
          this.applyTheme(theme);
          this.querySelectorAll('[data-theme-val]').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
        });
      });
    }

    applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('scranton-theme', theme);
      setUrlParam('theme', theme);
    }
  }
  customElements.define('scranton-theme-switcher', ScrantonThemeSwitcher);

  // ---------------------------------------------------------------------------
  // 2. <scranton-tabs> and <scranton-tab>
  // ---------------------------------------------------------------------------
  class ScrantonTabs extends HTMLElement {
    connectedCallback() {
      const syncUrl = this.hasAttribute('sync-url');
      const paramName = this.getAttribute('param-name') || 'tab';
      const urlTab = syncUrl ? getUrlParam(paramName) : null;
      
      const tabPanels = Array.from(this.querySelectorAll('scranton-tab'));
      if (tabPanels.length === 0) return;

      let activeIndex = 0;
      if (urlTab) {
        const found = tabPanels.findIndex(p => p.getAttribute('id') === urlTab || p.getAttribute('label').toLowerCase().replace(/\s+/g, '-') === urlTab);
        if (found !== -1) activeIndex = found;
      }

      // Create Header Navigation
      const navEl = document.createElement('ul');
      navEl.className = 'sc-nav';

      tabPanels.forEach((panel, idx) => {
        const label = panel.getAttribute('label') || `Tab ${idx + 1}`;
        const tabId = panel.getAttribute('id') || label.toLowerCase().replace(/\s+/g, '-');
        panel.setAttribute('id', tabId);

        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = `sc-nav-link ${idx === activeIndex ? 'active' : ''}`;
        a.href = `#${tabId}`;
        a.textContent = label;

        a.addEventListener('click', (e) => {
          e.preventDefault();
          this.setActiveTab(idx, syncUrl, paramName);
        });

        li.appendChild(a);
        navEl.appendChild(li);
      });

      this.insertBefore(navEl, this.firstChild);
      this.setActiveTab(activeIndex, false, paramName);
    }

    setActiveTab(index, syncUrl, paramName) {
      const tabLinks = this.querySelectorAll('.sc-nav-link');
      const tabPanels = this.querySelectorAll('scranton-tab');

      tabLinks.forEach((link, idx) => {
        if (idx === index) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      tabPanels.forEach((panel, idx) => {
        if (idx === index) {
          panel.style.display = 'block';
          if (syncUrl) {
            const tabId = panel.getAttribute('id');
            setUrlParam(paramName, tabId);
          }
        } else {
          panel.style.display = 'none';
        }
      });
    }
  }
  customElements.define('scranton-tabs', ScrantonTabs);

  class ScrantonTab extends HTMLElement {
    connectedCallback() {
      // Container handled by parent <scranton-tabs>
    }
  }
  customElements.define('scranton-tab', ScrantonTab);

  // ---------------------------------------------------------------------------
  // 3. <scranton-modal>
  // ---------------------------------------------------------------------------
  class ScrantonModal extends HTMLElement {
    connectedCallback() {
      const title = this.getAttribute('title') || 'System Window';
      const modalId = this.getAttribute('id');

      const content = this.innerHTML;
      this.innerHTML = `
        <div class="sc-modal-backdrop" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center;">
          <div class="sc-window" style="width: 500px; max-width:90vw;">
            <div class="sc-window-titlebar">
              <span>${title}</span>
              <div class="sc-window-controls">
                <button type="button" class="sc-window-btn btn-close">✕</button>
              </div>
            </div>
            <div class="sc-pane-body" style="background: var(--sc-bg-panel); padding:12px;">
              ${content}
            </div>
          </div>
        </div>
      `;

      this.backdrop = this.querySelector('.sc-modal-backdrop');
      this.querySelector('.btn-close').addEventListener('click', () => this.close());
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) this.close();
      });

      if (modalId && getUrlParam('modal') === modalId) {
        this.open();
      }
    }

    open() {
      if (this.backdrop) {
        this.backdrop.style.display = 'flex';
        const modalId = this.getAttribute('id');
        if (modalId) setUrlParam('modal', modalId);
      }
    }

    close() {
      if (this.backdrop) {
        this.backdrop.style.display = 'none';
        const modalId = this.getAttribute('id');
        if (modalId && getUrlParam('modal') === modalId) {
          setUrlParam('modal', null);
        }
      }
    }
  }
  customElements.define('scranton-modal', ScrantonModal);

  // ---------------------------------------------------------------------------
  // 4. <scranton-sparkline>
  // ---------------------------------------------------------------------------
  class ScrantonSparkline extends HTMLElement {
    connectedCallback() {
      const valuesStr = this.getAttribute('values') || '10,25,18,30,45,35,60,50,75,90';
      const values = valuesStr.split(',').map(Number);
      const width = parseInt(this.getAttribute('width') || '100', 10);
      const height = parseInt(this.getAttribute('height') || '24', 10);
      const color = this.getAttribute('color') || 'var(--sc-accent, #0284c7)';

      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      const points = values.map((val, idx) => {
        const x = (idx / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');

      this.innerHTML = `
        <svg width="${width}" height="${height}" style="display:inline-block; vertical-align:middle;">
          <polyline fill="none" stroke="${color}" stroke-width="1.5" points="${points}" />
        </svg>
      `;
    }
  }
  customElements.define('scranton-sparkline', ScrantonSparkline);

  // ---------------------------------------------------------------------------
  // 5. <scranton-metric-card>
  // ---------------------------------------------------------------------------
  class ScrantonMetricCard extends HTMLElement {
    connectedCallback() {
      const title = this.getAttribute('title') || 'Metric';
      const value = this.getAttribute('value') || '0';
      const change = this.getAttribute('change') || '';
      const isUp = this.hasAttribute('up');
      const isDown = this.hasAttribute('down');
      const sparklineVals = this.getAttribute('sparkline') || '';

      let badgeClass = 'sc-badge';
      if (isUp) badgeClass += ' sc-badge-success';
      if (isDown) badgeClass += ' sc-badge-danger';

      this.innerHTML = `
        <div class="sc-card" style="margin-bottom:0; height:100%;">
          <div class="sc-card-header" style="font-size:10px;">
            <span>${title}</span>
            ${change ? `<span class="${badgeClass}">${change}</span>` : ''}
          </div>
          <div class="sc-card-body d-flex align-center justify-between" style="padding:6px 8px;">
            <div style="font-size:18px; font-weight:800; font-family:var(--sc-font-mono);">${value}</div>
            ${sparklineVals ? `<scranton-sparkline values="${sparklineVals}" width="64" height="20"></scranton-sparkline>` : ''}
          </div>
        </div>
      `;
    }
  }
  customElements.define('scranton-metric-card', ScrantonMetricCard);

  // ---------------------------------------------------------------------------
  // 6. Global Toast Notifications Helper
  // ---------------------------------------------------------------------------
  window.scrantonToast = function(msg, type = 'info') {
    let container = document.getElementById('sc-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sc-toast-container';
      container.style.cssText = 'position:fixed; bottom:28px; right:12px; z-index:99999; display:flex; flex-direction:column; gap:4px; max-width:320px;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `sc-alert sc-alert-${type}`;
    toast.style.cssText = 'margin:0; box-shadow: var(--sc-shadow-md); animation: fadeIn 0.2s;';
    toast.innerHTML = `
      <span>${msg}</span>
      <button type="button" style="background:none; border:none; color:inherit; font-weight:bold; cursor:pointer; margin-left:8px;">✕</button>
    `;

    toast.querySelector('button').addEventListener('click', () => toast.remove());
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 4000);
  };

})();
