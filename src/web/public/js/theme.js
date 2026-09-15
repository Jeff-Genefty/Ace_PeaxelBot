/** Thème clair / sombre — localStorage `peaxel_theme` */
(function () {
    const STORAGE_KEY = 'peaxel_theme';

    function currentTheme() {
        const attr = document.documentElement.getAttribute('data-theme');
        if (attr === 'light' || attr === 'dark') return attr;
        return 'dark';
    }

    function applyTheme(theme) {
        const next = theme === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch (_) { /* ignore */ }

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', next === 'light' ? '#f1f5f9' : '#050508');
        }

        document.querySelectorAll('[data-theme-set]').forEach((btn) => {
            const active = btn.getAttribute('data-theme-set') === next;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-pressed', String(active));
        });
    }

    function bind() {
        document.querySelectorAll('[data-theme-set]').forEach((btn) => {
            btn.addEventListener('click', () => {
                applyTheme(btn.getAttribute('data-theme-set'));
            });
        });
        applyTheme(currentTheme());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
