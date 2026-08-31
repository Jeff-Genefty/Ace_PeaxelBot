/** Countdown timers for GW / giveaway sections */
(function () {
    function formatRemaining(seconds, locale) {
        if (seconds <= 0) return locale === 'fr' ? 'Terminé' : 'Ended';
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (d > 0) return `${d}d ${h}h ${m}m`;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        return `${m}m ${s}s`;
    }

    function tick() {
        const locale = document.documentElement.lang === 'fr' ? 'fr' : 'en';
        const now = Math.floor(Date.now() / 1000);
        document.querySelectorAll('[data-gw-countdown]').forEach((el) => {
            const target = parseInt(el.dataset.gwCountdown, 10);
            const out = el.querySelector('[data-countdown]');
            if (!out || !target) return;
            out.textContent = formatRemaining(target - now, locale);
        });
    }

    tick();
    setInterval(tick, 1000);
})();
