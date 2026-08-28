/** Live console refresh for admin panel */
(function () {
    const output = document.getElementById('console-output');
    const pingEl = document.getElementById('ping-val');
    const counterEl = document.getElementById('log-counter');
    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const apiUrl = document.body.dataset.logsApi;
    if (!output || !apiUrl) return;

    let emergency = document.body.classList.contains('emergency-mode');

    async function refresh() {
        try {
            const res = await fetch(apiUrl);
            const data = await res.json();
            output.innerHTML = data.logs.map(l => `
                <div class="log-entry">
                    <span class="log-time">[${l.time}]</span>
                    <span class="type-${l.action}">${l.action}</span>
                    <span>${l.detail}</span>
                </div>`).join('');
            if (counterEl) counterEl.textContent = data.logs.length + ' entrées';
            if (pingEl) pingEl.textContent = data.ping;
            emergency = data.emergency;
            document.body.classList.toggle('emergency-mode', emergency);
            if (statusPill) statusPill.className = 'pill ' + (emergency ? 'pill-error' : 'pill-online');
            if (statusText) statusText.textContent = emergency ? 'CRITIQUE' : 'EN LIGNE';
        } catch {
            document.body.classList.add('emergency-mode');
        }
    }

    setInterval(refresh, 3000);
    refresh();

    window.updateHiddenId = function (input, name) {
        const list = document.getElementById('list-' + name);
        const hidden = document.getElementById('hidden-' + name);
        const option = Array.from(list.options).find(o => o.value === input.value);
        hidden.value = option ? option.dataset.id : input.value;
    };

    window.fetchUserInfo = async function (id) {
        if (id.length < 17) return;
        document.getElementById('hidden-mod-id').value = id;
        try {
            const base = document.body.dataset.adminBase;
            const res = await fetch(`${base}/api/user/${id}`);
            const data = await res.json();
            if (data.id) {
                document.getElementById('user-preview').style.display = 'flex';
                document.getElementById('user-avatar').src = data.avatar;
                document.getElementById('user-name').textContent = data.tag;
            }
        } catch { /* ignore */ }
    };
})();
