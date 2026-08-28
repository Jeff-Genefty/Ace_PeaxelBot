/** Toggle menu mobile (public + admin) */
(function () {
    document.querySelectorAll('[data-nav-toggle]').forEach((btn) => {
        const menu = btn.closest('.landing-nav, .admin-sidebar')?.querySelector('[data-nav-menu], .admin-nav');
        if (!menu) return;
        btn.addEventListener('click', () => {
            const open = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!open));
            menu.classList.toggle('is-open', !open);
            document.body.classList.toggle('nav-open', !open);
        });
    });

    document.querySelectorAll('.table-scroll').forEach((wrap) => {
        if (wrap.scrollWidth > wrap.clientWidth) wrap.setAttribute('data-scrollable', 'true');
    });
})();
