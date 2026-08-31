/** Count-up animation for stat pills on /app */
(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('[data-count-up]').forEach((el) => {
            el.textContent = el.dataset.countUp;
        });
        return;
    }

    function animate(el) {
        const target = parseFloat(el.dataset.countUp || '0');
        const isInt = Number.isInteger(target);
        const duration = 900;
        const start = performance.now();

        function frame(now) {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - (1 - p) ** 3;
            const val = target * eased;
            el.textContent = isInt ? Math.round(val).toLocaleString() : val.toFixed(1);
            if (p < 1) requestAnimationFrame(frame);
            else el.textContent = isInt ? target.toLocaleString() : String(target);
        }

        requestAnimationFrame(frame);
    }

    document.querySelectorAll('[data-count-up]').forEach(animate);
})();
