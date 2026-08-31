/** Persist theme preference from cookie (no flash on load) */
(function () {
    const theme = document.documentElement.dataset.theme;
    if (theme) document.body.classList.toggle('theme-light', theme === 'light');
})();
