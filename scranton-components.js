/**
 * Scranton-UI Custom Web Components v1.5.0
 * Zero-dependency, lightweight Vanilla Web Components & Diagnostic Controls.
 * Features URL state management, ARIA accessibility, focus trapping, reactive SVG rendering, popstate sync, interactive table sorting, and drag-resizable splitters.
 */

(function() {
  'use strict';

  // HTML Escaping Utility for XSS Prevention
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // URL Query Sync Helper (Preserving Hash Fragments)
  function setUrlParam(key, val) {
    const url = new URL(window.location.href);
    const currentVal = url.searchParams.get(key);
    if (val) {
      if (currentVal !== val) {
        url.searchParams.set(key, val);
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
    } else if (currentVal !== null) {
      url.searchParams.delete(key);
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  }

  function getUrlParam(key) {
    const url = new URL(window.location.href);
    return url.searchParams.get(key);
  }

  // ---------------------------------------------------------------------------
  // 1. <scranton-theme-switcher>
  // ---------------------------------------------------------------------------
  class ScrantonThemeSwitcher extends HTMLElement {
    constructor() {
      super();
      this._handleClick = this._handleClick.bind(this);
    }

    connectedCallback() {
      const initialTheme = getUrlParam('theme') || localStorage.getItem('scranton-theme') || 'theme-light';
      this.applyTheme(initialTheme, false);

      this.innerHTML = `
        <div class="sc-btn-group" role="group" aria-label="Theme Selector">
          <button type="button" class="sc-btn sc-btn-sm ${initialTheme === 'theme-light' ? 'active' : ''}" data-theme-val="theme-light" aria-pressed="${initialTheme === 'theme-light'}">Light</button>
          <button type="button" class="sc-btn sc-btn-sm ${initialTheme === 'theme-dark' ? 'active' : ''}" data-theme-val="theme-dark" aria-pressed="${initialTheme === 'theme-dark'}">Dark</button>
          <button type="button" class="sc-btn sc-btn-sm ${initialTheme === 'theme-beet' ? 'active' : ''}" data-theme-val="theme-beet" aria-pressed="${initialTheme === 'theme-beet'}" style="color: var(--sc-mustard, #d97706);">Beet</button>
        </div>
      `;

      this.addEventListener('click', this._handleClick);
    }

    disconnectedCallback() {
      this.removeEventListener('click', this._handleClick);
    }

    _handleClick(e) {
      const btn = e.target.closest('[data-theme-val]');
      if (!btn) return;
      const theme = btn.getAttribute('data-theme-val');
      this.applyTheme(theme, true);
      this.querySelectorAll('[data-theme-val]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    }

    applyTheme(theme, updateUrl = true) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('scranton-theme', theme);
      if (updateUrl) setUrlParam('theme', theme);
    }
  }
  customElements.define('scranton-theme-switcher', ScrantonThemeSwitcher);

  // ---------------------------------------------------------------------------
  // 2. <scranton-tabs> and <scranton-tab>
  // ---------------------------------------------------------------------------
  class ScrantonTabs extends HTMLElement {
    constructor() {
      super();
      this._activeIndex = 0;
      this._handleKeydown = this._handleKeydown.bind(this);
    }

    connectedCallback() {
      this.render();
      this._observer = new MutationObserver((mutations) => {
        const hasTabChanges = mutations.some(m =>
          Array.from(m.addedNodes).concat(Array.from(m.removedNodes))
            .some(node => node.nodeType === 1 && node.tagName.toLowerCase() === 'scranton-tab')
        );
        if (hasTabChanges) this.render(true);
      });
      this._observer.observe(this, { childList: true });
    }

    disconnectedCallback() {
      if (this._observer) this._observer.disconnect();
    }

    render(isMutation = false) {
      const syncUrl = this.hasAttribute('sync-url');
      let paramName = this.getAttribute('param-name') || 'tab';
      
      if (syncUrl && !this.hasAttribute('param-name')) {
        const allSyncTabs = Array.from(document.querySelectorAll('scranton-tabs[sync-url]'));
        const idx = allSyncTabs.indexOf(this);
        if (idx > 0) paramName = `tab-${idx + 1}`;
      }

      const urlTab = syncUrl ? getUrlParam(paramName) : null;
      const tabPanels = Array.from(this.children).filter(el => el.tagName.toLowerCase() === 'scranton-tab');
      if (tabPanels.length === 0) return;

      let activeIndex = isMutation ? (this._activeIndex < tabPanels.length ? this._activeIndex : 0) : 0;
      if (urlTab) {
        const found = tabPanels.findIndex(p => p.getAttribute('id') === urlTab || p.getAttribute('label').toLowerCase().replace(/\s+/g, '-') === urlTab);
        if (found !== -1) activeIndex = found;
      }

      const existingNav = this.querySelector(':scope > .sc-nav');
      if (existingNav) {
        existingNav.removeEventListener('keydown', this._handleKeydown);
        existingNav.remove();
      }

      const navEl = document.createElement('ul');
      navEl.className = 'sc-nav';
      navEl.setAttribute('role', 'tablist');

      tabPanels.forEach((panel, idx) => {
        const label = panel.getAttribute('label') || `Tab ${idx + 1}`;
        const badgeVal = panel.getAttribute('badge');
        const tabId = panel.getAttribute('id') || label.toLowerCase().replace(/\s+/g, '-');
        panel.setAttribute('id', tabId);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', `tab-link-${tabId}`);

        const li = document.createElement('li');
        const a = document.createElement('a');
        a.id = `tab-link-${tabId}`;
        a.className = `sc-nav-link ${idx === activeIndex ? 'active' : ''}`;
        a.innerHTML = `${escapeHTML(label)} ${badgeVal ? `<span class="sc-nav-badge">${escapeHTML(badgeVal)}</span>` : ''}`;
        a.setAttribute('role', 'tab');
        a.setAttribute('aria-selected', idx === activeIndex ? 'true' : 'false');
        a.setAttribute('tabindex', idx === activeIndex ? '0' : '-1');

        a.addEventListener('click', (e) => {
          e.preventDefault();
          this.setActiveTab(idx, syncUrl, paramName);
        });

        li.appendChild(a);
        navEl.appendChild(li);
      });

      navEl.addEventListener('keydown', this._handleKeydown);
      this.insertBefore(navEl, this.firstChild);
      this.setActiveTab(activeIndex, false, paramName);
    }

    _handleKeydown(e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const links = Array.from(this.querySelectorAll(':scope > .sc-nav > li > .sc-nav-link'));
      const activeIdx = links.findIndex(l => l.classList.contains('active'));
      if (activeIdx === -1) return;

      let nextIdx = activeIdx;
      if (e.key === 'ArrowRight') nextIdx = (activeIdx + 1) % links.length;
      if (e.key === 'ArrowLeft') nextIdx = (activeIdx - 1 + links.length) % links.length;

      links[nextIdx].focus();
      const syncUrl = this.hasAttribute('sync-url');
      const paramName = this.getAttribute('param-name') || 'tab';
      this.setActiveTab(nextIdx, syncUrl, paramName);
    }

    setActiveTab(index, syncUrl, paramName) {
      this._activeIndex = index;
      const tabLinks = this.querySelectorAll(':scope > .sc-nav > li > .sc-nav-link');
      const tabPanels = Array.from(this.children).filter(el => el.tagName.toLowerCase() === 'scranton-tab');

      tabLinks.forEach((link, idx) => {
        if (idx === index) {
          link.classList.add('active');
          link.setAttribute('aria-selected', 'true');
          link.setAttribute('tabindex', '0');
        } else {
          link.classList.remove('active');
          link.setAttribute('aria-selected', 'false');
          link.setAttribute('tabindex', '-1');
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
      // Managed by parent <scranton-tabs>
    }
  }
  customElements.define('scranton-tab', ScrantonTab);

  // ---------------------------------------------------------------------------
  // 3. <scranton-modal> with aria-describedby & Focus Trap
  // ---------------------------------------------------------------------------
  class ScrantonModal extends HTMLElement {
    constructor() {
      super();
      this._previousActiveElement = null;
      this._handleClose = this.close.bind(this);
      this._handleBackdropClick = (e) => {
        if (e.target === this.backdrop) this.close();
      };
      this._handleKeydown = (e) => {
        if (!this.backdrop || this.backdrop.style.display !== 'flex') return;

        if (e.key === 'Escape') {
          this.close();
          return;
        }

        if (e.key === 'Tab') {
          const focusables = Array.from(this.backdrop.querySelectorAll('button, input, select, textarea, [tabindex="0"]'));
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
    }

    static get observedAttributes() {
      return ['title'];
    }

    attributeChangedCallback() {
      if (this.titleEl) {
        this.titleEl.textContent = this.getAttribute('title') || 'System Window';
      }
    }

    connectedCallback() {
      if (this.querySelector('.sc-modal-backdrop')) return;

      const title = this.getAttribute('title') || 'System Window';
      const modalId = this.getAttribute('id') || `modal-${Math.random().toString(36).substring(2, 6)}`;

      const fragment = document.createDocumentFragment();
      Array.from(this.childNodes).forEach(child => {
        fragment.appendChild(child.cloneNode(true));
      });

      this.backdrop = document.createElement('div');
      this.backdrop.className = 'sc-modal-backdrop';
      this.backdrop.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999; align-items:center; justify-content:center; opacity:0; transition: opacity 0.15s ease;';
      this.backdrop.setAttribute('role', 'dialog');
      this.backdrop.setAttribute('aria-modal', 'true');
      this.backdrop.setAttribute('aria-label', title);
      this.backdrop.setAttribute('aria-describedby', `${modalId}-body`);

      const win = document.createElement('div');
      win.className = 'sc-window';
      win.setAttribute('tabindex', '-1');
      win.style.cssText = 'width: 520px; max-width:92vw; border: 1px solid var(--sc-border-dark);';

      const titlebar = document.createElement('div');
      titlebar.className = 'sc-window-titlebar';
      this.titleEl = document.createElement('span');
      this.titleEl.textContent = title;

      const controls = document.createElement('div');
      controls.className = 'sc-window-controls';
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'sc-window-btn btn-close';
      closeBtn.setAttribute('aria-label', 'Close Window');
      closeBtn.textContent = '✕';

      controls.appendChild(closeBtn);
      titlebar.appendChild(this.titleEl);
      titlebar.appendChild(controls);

      const body = document.createElement('div');
      body.id = `${modalId}-body`;
      body.className = 'sc-pane-body';
      body.style.cssText = 'background: var(--sc-bg-panel); padding:12px;';
      body.appendChild(fragment);

      win.appendChild(titlebar);
      win.appendChild(body);
      this.backdrop.appendChild(win);
      this.appendChild(this.backdrop);

      closeBtn.addEventListener('click', this._handleClose);
      this.backdrop.addEventListener('click', this._handleBackdropClick);
      document.addEventListener('keydown', this._handleKeydown);

      if (modalId && getUrlParam('modal') === modalId) {
        this.open();
      }
    }

    disconnectedCallback() {
      document.removeEventListener('keydown', this._handleKeydown);
    }

    open() {
      if (this.backdrop) {
        this._previousActiveElement = document.activeElement;
        this.backdrop.style.display = 'flex';
        setTimeout(() => { if (this.backdrop) this.backdrop.style.opacity = '1'; }, 10);
        document.body.style.overflow = 'hidden';
        const modalId = this.getAttribute('id');
        if (modalId) setUrlParam('modal', modalId);

        const focusable = this.backdrop.querySelector('button, input, select, textarea, [tabindex="0"]');
        if (focusable) {
          focusable.focus();
        } else if (this.backdrop.querySelector('.sc-window')) {
          this.backdrop.querySelector('.sc-window').focus();
        }
      }
    }

    close() {
      if (this.backdrop) {
        this.backdrop.style.opacity = '0';
        setTimeout(() => {
          if (this.backdrop) this.backdrop.style.display = 'none';
        }, 150);
        document.body.style.overflow = '';
        const modalId = this.getAttribute('id');
        if (modalId && getUrlParam('modal') === modalId) {
          setUrlParam('modal', null);
        }
        if (this._previousActiveElement && typeof this._previousActiveElement.focus === 'function') {
          this._previousActiveElement.focus();
        }
      }
    }
  }
  customElements.define('scranton-modal', ScrantonModal);

  // ---------------------------------------------------------------------------
  // 4. <scranton-sparkline>
  // ---------------------------------------------------------------------------
  class ScrantonSparkline extends HTMLElement {
    static get observedAttributes() {
      return ['values', 'width', 'height', 'color', 'fluid'];
    }

    attributeChangedCallback() {
      this.render();
    }

    connectedCallback() {
      this.render();
    }

    render() {
      const valuesStr = this.getAttribute('values') || '10,25,18,30,45,35,60,50,75,90';
      const values = valuesStr
        .split(',')
        .map(v => parseFloat(v.trim()))
        .filter(v => !isNaN(v));

      const width = parseInt(this.getAttribute('width') || '100', 10);
      const height = parseInt(this.getAttribute('height') || '24', 10);
      const color = escapeHTML(this.getAttribute('color') || 'var(--sc-accent)');
      const isFluid = this.hasAttribute('fluid');

      const svgWidth = isFluid ? '100%' : width;
      const svgHeight = isFluid ? '100%' : height;

      if (values.length === 0) {
        this.innerHTML = `<svg width="${svgWidth}" height="${svgHeight}"></svg>`;
        return;
      }

      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;

      let points = '';
      if (values.length <= 1 || range === 0) {
        points = `0,${(height/2).toFixed(1)} ${width},${(height/2).toFixed(1)}`;
      } else {
        points = values.map((val, idx) => {
          const x = (idx / (values.length - 1)) * width;
          const y = height - ((val - min) / range) * (height - 4) - 2;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
      }

      const areaPoints = `0,${height} ${points} ${width},${height}`;
      const lastPoint = points.split(' ').pop().split(',');

      if (!this._instanceGradId) {
        this._instanceGradId = `spark-grad-${Math.random().toString(36).substring(2, 8)}`;
      }
      const gradId = this._instanceGradId;

      this.innerHTML = `
        <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="display:inline-block; vertical-align:middle; overflow:visible;">
          <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.35" />
              <stop offset="100%" stop-color="${color}" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <polygon class="spark-poly" fill="url(#${gradId})" points="${areaPoints}" />
          <polyline class="spark-line" fill="none" stroke="${color}" stroke-width="1.6" points="${points}" stroke-linecap="square" />
          <circle class="spark-dot" cx="${lastPoint[0]}" cy="${lastPoint[1]}" r="2" fill="${color}" />
        </svg>
      `;
    }
  }
  customElements.define('scranton-sparkline', ScrantonSparkline);

  // ---------------------------------------------------------------------------
  // 5. <scranton-metric-card> with Trend Direction Arrow Vectors
  // ---------------------------------------------------------------------------
  class ScrantonMetricCard extends HTMLElement {
    static get observedAttributes() {
      return ['title', 'value', 'change', 'up', 'down', 'sparkline'];
    }

    attributeChangedCallback() {
      this.render();
    }

    connectedCallback() {
      this.render();
    }

    render() {
      const title = escapeHTML(this.getAttribute('title') || 'Metric');
      const value = escapeHTML(this.getAttribute('value') || '0');
      const change = escapeHTML(this.getAttribute('change') || '');
      const isUp = this.hasAttribute('up');
      const isDown = this.hasAttribute('down');
      const sparklineVals = escapeHTML(this.getAttribute('sparkline') || '');

      let badgeClass = 'sc-badge';
      let trendPrefix = '';
      if (isUp) { badgeClass += ' sc-badge-success'; trendPrefix = '▲ '; }
      if (isDown) { badgeClass += ' sc-badge-danger'; trendPrefix = '▼ '; }

      const changeText = change ? `${trendPrefix}${change}` : '';

      this.innerHTML = `
        <div class="sc-card" style="margin-bottom:0; height:100%;">
          <div class="sc-card-header">
            <span title="${title}">${title}</span>
            ${changeText ? `<span class="${badgeClass}">${changeText}</span>` : ''}
          </div>
          <div class="sc-card-body d-flex align-center justify-between" style="padding:6px 8px;">
            <div class="sc-metric-value" aria-live="polite" aria-atomic="true" style="font-size:18px; font-weight:800; font-family:var(--sc-font-mono); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-shrink:1; min-width:0;">${value}</div>
            ${sparklineVals ? `<scranton-sparkline values="${sparklineVals}" width="64" height="20" style="flex-shrink:0; margin-left:6px;"></scranton-sparkline>` : ''}
          </div>
        </div>
      `;
    }
  }
  customElements.define('scranton-metric-card', ScrantonMetricCard);

  // ---------------------------------------------------------------------------
  // 6. Global Toast Notification Helper
  // ---------------------------------------------------------------------------
  window.scrantonToast = function(msg, type = 'info') {
    let container = document.getElementById('sc-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sc-toast-container';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    const existing = container.querySelectorAll('.sc-alert');
    if (existing.length >= 4) {
      existing[0].remove();
    }

    const icons = { info: 'ⓘ', success: '✓', warning: '⚠', danger: '⛔' };
    const safeType = escapeHTML(type);

    const toast = document.createElement('div');
    toast.className = `sc-alert sc-alert-${safeType}`;
    toast.style.cssText = 'margin:0; position:relative; box-shadow: var(--sc-shadow-md); animation: fadeIn 0.2s; overflow:hidden;';
    toast.innerHTML = `
      <div class="d-flex align-center gap-2">
        <span class="sc-alert-icon" style="font-size:12px; font-weight:bold;">${icons[safeType] || 'ⓘ'}</span>
        <span>${escapeHTML(msg)}</span>
      </div>
      <button type="button" class="sc-alert-close" aria-label="Close Toast">✕</button>
      <div class="sc-toast-progress" style="position:absolute; bottom:0; left:0; height:2px; background:currentColor; opacity:0.6; width:100%; transition: width 4s linear;"></div>
    `;

    const prog = toast.querySelector('.sc-toast-progress');
    setTimeout(() => { if (prog) prog.style.width = '0%'; }, 50);

    let autoRemoveTimer = null;
    let startTime = Date.now();
    let durationTotal = 4000;

    const startTimer = (dur) => {
      startTime = Date.now();
      durationTotal = dur;
      autoRemoveTimer = setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, dur);
    };

    const dismiss = () => {
      if (autoRemoveTimer) clearTimeout(autoRemoveTimer);
      toast.remove();
    };

    toast.querySelector('.sc-alert-close').addEventListener('click', dismiss);
    toast.addEventListener('mouseenter', () => {
      if (autoRemoveTimer) clearTimeout(autoRemoveTimer);
      const elapsed = Date.now() - startTime;
      durationTotal = Math.max(100, durationTotal - elapsed);
      if (prog) prog.style.transition = 'none';
    });
    toast.addEventListener('mouseleave', () => {
      if (durationTotal > 100) {
        startTimer(durationTotal);
        if (prog) {
          prog.style.transition = `width ${durationTotal / 1000}s linear`;
          prog.style.width = '0%';
        }
      } else {
        dismiss();
      }
    });

    container.appendChild(toast);
    startTimer(4000);
  };

  // ---------------------------------------------------------------------------
  // 7. Interactive Table Column Sorting Engine (K-Suffix & Parentheses Parsing)
  // ---------------------------------------------------------------------------
  function parseCellValue(cell) {
    if (cell.hasAttribute('data-sort-value')) return cell.getAttribute('data-sort-value');
    const text = cell.textContent.trim();
    
    // Parenthesized negative financial numbers: ($14,250) -> -14250
    if (text.startsWith('(') && text.endsWith(')')) {
      const num = parseFloat(text.replace(/[^0-9.]+/g, ''));
      if (!isNaN(num)) return -num;
    }

    // Item code hyphens vs negative signs: "DM-1049"
    if (text.match(/^[A-Za-z0-9]+-[A-Za-z0-9]+$/)) {
      return text;
    }

    // K/M Abbreviated Multipliers: +$42.1k -> 42100
    const kMatch = text.match(/^[+$-]?([\d.]+)\s*k$/i);
    if (kMatch) {
      return parseFloat(kMatch[1]) * 1000;
    }
    const mMatch = text.match(/^[+$-]?([\d.]+)\s*m$/i);
    if (mMatch) {
      return parseFloat(mMatch[1]) * 1000000;
    }

    // Clean currency symbols, commas, and percentage signs
    const cleanStr = text.replace(/[$%,]/g, '');
    const cleanNum = parseFloat(cleanStr);
    return isNaN(cleanNum) ? text : cleanNum;
  }

  function initTableSorting() {
    document.querySelectorAll('table.sc-table').forEach(table => {
      const headers = table.querySelectorAll('th');
      headers.forEach((th, colIdx) => {
        if (th.classList.contains('sortable') || th.querySelector('.sc-sort-indicator')) {
          th.classList.add('sortable');
          th.setAttribute('tabindex', '0');
          th.setAttribute('role', 'columnheader');
          if (!th.hasAttribute('aria-sort')) th.setAttribute('aria-sort', 'none');

          const sortHandler = () => {
            const tbody = table.querySelector('tbody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const currentSort = th.getAttribute('aria-sort');
            const isAsc = currentSort !== 'ascending';

            headers.forEach(h => {
              if (h !== th && h.classList.contains('sortable')) {
                h.setAttribute('aria-sort', 'none');
                const ind = h.querySelector('.sc-sort-indicator');
                if (ind) ind.textContent = '▲';
              }
            });

            th.setAttribute('aria-sort', isAsc ? 'ascending' : 'descending');
            const indicator = th.querySelector('.sc-sort-indicator');
            if (indicator) indicator.textContent = isAsc ? '▲' : '▼';

            rows.sort((rowA, rowB) => {
              const valA = parseCellValue(rowA.children[colIdx] || { textContent: '' });
              const valB = parseCellValue(rowB.children[colIdx] || { textContent: '' });

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
        }
      });
    });
  }
  window.scrantonReinitSorting = initTableSorting;

  // ---------------------------------------------------------------------------
  // 8. Resizable Splitter Pointer Events Engine
  // ---------------------------------------------------------------------------
  function initSplitters() {
    document.querySelectorAll('.sc-splitter').forEach(splitter => {
      splitter.setAttribute('role', 'separator');
      splitter.setAttribute('tabindex', '0');
      splitter.setAttribute('aria-label', 'Resize Pane Splitter');

      const isVertical = splitter.classList.contains('sc-splitter-vertical');
      const prevPane = splitter.previousElementSibling;
      const nextPane = splitter.nextElementSibling;
      if (!prevPane || !nextPane) return;

      let isDragging = false;

      const stopDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', stopDrag);
      };

      const onPointerMove = (e) => {
        if (!isDragging) return;
        const container = splitter.parentElement;
        if (!container) return;
        const rect = container.getBoundingClientRect();

        if (!isVertical) {
          const offsetX = e.clientX - rect.left;
          const pct = Math.max(10, Math.min(90, (offsetX / rect.width) * 100));
          prevPane.style.flex = `0 0 ${pct}%`;
          nextPane.style.flex = `1 1 0%`;
        } else {
          const offsetY = e.clientY - rect.top;
          const pct = Math.max(10, Math.min(90, (offsetY / rect.height) * 100));
          prevPane.style.flex = `0 0 ${pct}%`;
          nextPane.style.flex = `1 1 0%`;
        }
      };

      const onPointerDown = (e) => {
        isDragging = true;
        document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', stopDrag);
      };

      splitter.addEventListener('pointerdown', onPointerDown);

      // Keyboard Arrow Adjustments
      splitter.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          const currentFlex = parseFloat(prevPane.style.flex) || 50;
          let delta = 0;
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') delta = -5;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') delta = 5;

          const newPct = Math.max(10, Math.min(90, currentFlex + delta));
          prevPane.style.flex = `0 0 ${newPct}%`;
          nextPane.style.flex = `1 1 0%`;
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 9. Global History Sync, Scoped Tree Navigation & Pane Toggles
  // ---------------------------------------------------------------------------
  window.addEventListener('popstate', () => {
    document.querySelectorAll('scranton-tabs[sync-url]').forEach(tabs => tabs.render());
    document.querySelectorAll('scranton-modal').forEach(modal => {
      const modalId = modal.getAttribute('id');
      if (modalId && getUrlParam('modal') === modalId) {
        modal.open();
      } else {
        modal.close();
      }
    });
  });

  function initGlobalHandlers() {
    initTableSorting();
    initSplitters();

    // Data Table Row Selection (Guarded & set aria-selected)
    document.addEventListener('click', (e) => {
      if (window.getSelection && window.getSelection().toString().length > 0) return;
      if (e.target.closest('a, button, input, select, label, textarea, scranton-sparkline, scranton-metric-card, [data-no-select]')) return;
      const row = e.target.closest('.sc-table-hover tbody tr');
      if (row) {
        const table = row.closest('table');
        if (table) {
          table.querySelectorAll('tr').forEach(r => {
            r.classList.remove('selected');
            r.setAttribute('aria-selected', 'false');
          });
          row.classList.add('selected');
          row.setAttribute('aria-selected', 'true');
        }
      }
    });

    // Sidebar Tree View Toggle & Scoped Keyboard Navigation
    document.querySelectorAll('.sc-tree-node').forEach(node => {
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'treeitem');
      const parentLi = node.closest('li');
      if (parentLi) {
        const subUl = parentLi.querySelector(':scope > ul');
        if (subUl) node.setAttribute('aria-expanded', subUl.style.display !== 'none' ? 'true' : 'false');
      }
    });

    document.addEventListener('click', (e) => {
      const treeNode = e.target.closest('.sc-tree-node');
      if (treeNode) {
        const parentLi = treeNode.closest('li');
        if (parentLi) {
          const subUl = parentLi.querySelector(':scope > ul');
          if (subUl) {
            const isHidden = subUl.style.display === 'none';
            subUl.style.display = isHidden ? 'block' : 'none';
            treeNode.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
          }
          const container = treeNode.closest('.sc-tree') || treeNode.closest('.sc-sidebar');
          if (container) {
            container.querySelectorAll('.sc-tree-node').forEach(n => n.classList.remove('active'));
            treeNode.classList.add('active');
          }
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, select, textarea, button')) return;
      const treeNode = e.target.closest('.sc-tree-node');
      if (!treeNode) return;

      const container = treeNode.closest('.sc-tree, .sc-sidebar') || document;
      const visibleNodes = Array.from(container.querySelectorAll('.sc-tree-node'))
        .filter(n => n.offsetWidth > 0 && n.offsetHeight > 0);
      const idx = visibleNodes.indexOf(treeNode);

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        treeNode.click();
      } else if (e.key === 'ArrowDown' && idx < visibleNodes.length - 1) {
        e.preventDefault();
        visibleNodes[idx + 1].focus();
      } else if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        visibleNodes[idx - 1].focus();
      } else if (e.key === 'ArrowRight') {
        const parentLi = treeNode.closest('li');
        const subUl = parentLi ? parentLi.querySelector(':scope > ul') : null;
        if (subUl && subUl.style.display === 'none') {
          e.preventDefault();
          treeNode.click();
        }
      } else if (e.key === 'ArrowLeft') {
        const parentLi = treeNode.closest('li');
        const subUl = parentLi ? parentLi.querySelector(':scope > ul') : null;
        if (subUl && subUl.style.display !== 'none') {
          e.preventDefault();
          treeNode.click();
        }
      }
    });

    // Split Pane Body Collapse Toggle (Pure CSS Chevron Rotation Physics)
    document.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.sc-pane-toggle');
      if (toggleBtn) {
        if (!toggleBtn.hasAttribute('type')) toggleBtn.setAttribute('type', 'button');
        const pane = toggleBtn.closest('.sc-pane, .sc-card');
        if (pane) {
          const body = pane.querySelector('.sc-pane-body, .sc-pane-body-nopad, .sc-card-body');
          if (body) {
            const isHidden = body.style.display === 'none';
            body.style.display = isHidden ? 'block' : 'none';
            pane.classList.toggle('collapsed', isHidden);
            toggleBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
          }
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalHandlers);
  } else {
    initGlobalHandlers();
  }

})();
