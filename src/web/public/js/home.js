/** Parallaxe, lazy blur, carousel hero (homepage) */
(function () {
    const scene = document.querySelector('.landing-home');
    if (!scene) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = scene.querySelectorAll('.home-float-card');

    cards.forEach((card) => {
        const img = card.querySelector('img');
        if (!img) return;
        if (img.complete) img.classList.add('is-loaded');
        else img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    });

    if (!reduced && cards.length) {
        let raf = 0;
        let targetX = 0;
        let targetY = 0;

        scene.addEventListener('mousemove', (e) => {
            const rect = scene.getBoundingClientRect();
            targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
            if (!raf) raf = requestAnimationFrame(tick);
        });

        scene.addEventListener('mouseleave', () => {
            targetX = 0;
            targetY = 0;
            if (!raf) raf = requestAnimationFrame(tick);
        });

        function tick() {
            raf = 0;
            cards.forEach((card, i) => {
                const depth = 6 + (i % 4) * 3;
                card.style.setProperty('--parallax-x', `${targetX * depth}px`);
                card.style.setProperty('--parallax-y', `${targetY * depth}px`);
            });
        }
    }

    const carousel = scene.querySelector('.hero-carousel');
    if (carousel && !reduced) {
        const slides = carousel.querySelectorAll('.hero-carousel-slide');
        if (slides.length > 1) {
            let idx = 0;
            setInterval(() => {
                slides[idx]?.classList.remove('is-active');
                idx = (idx + 1) % slides.length;
                slides[idx]?.classList.add('is-active');
            }, 4000);
        }
    }
})();
