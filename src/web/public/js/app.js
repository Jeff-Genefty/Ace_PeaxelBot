/** Count-up + défis hebdo (toggle tâches) */
(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('[data-count-up]').forEach((el) => {
            el.textContent = el.dataset.countUp;
        });
    } else {
        document.querySelectorAll('[data-count-up]').forEach((el) => {
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
        });
    }

    const toggleForm = document.getElementById('challenge-toggle-form');
    const taskInput = document.getElementById('challenge-task-id');
    if (toggleForm && taskInput) {
        document.querySelectorAll('[data-challenge-task]').forEach((cb) => {
            cb.addEventListener('change', () => {
                if (cb.disabled) return;
                taskInput.value = cb.dataset.challengeTask;
                toggleForm.submit();
            });
        });
    }
})();
