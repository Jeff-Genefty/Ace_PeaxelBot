/** Live console refresh for admin panel */
(function () {
    const root = document.querySelector('[data-logs-api]');
    if (!root) return;

    const output = document.getElementById('console-output');
    const pingEl = document.getElementById('ping-val');
    const counterEl = document.getElementById('log-counter');
    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const actionFilter = document.getElementById('log-action-filter');
    const searchInput = document.getElementById('log-search');
    const apiUrl = root.dataset.logsApi;

    const labels = {
        online: root.dataset.i18nOnline || 'ONLINE',
        critical: root.dataset.i18nCritical || 'CRITICAL',
        entries: root.dataset.i18nEntries || '{n} entries',
        sync: root.dataset.i18nSync || 'sync',
        noResults: root.dataset.i18nNoResults || 'No logs match your filters.',
    };

    let emergency = document.body.classList.contains('emergency-mode');
    let debounceTimer = 0;

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatEntries(n) {
        return labels.entries.replace('{n}', n);
    }

    function buildQuery() {
        const params = new URLSearchParams();
        if (actionFilter?.value && actionFilter.value !== 'ALL') {
            params.set('action', actionFilter.value);
        }
        if (searchInput?.value?.trim()) {
            params.set('q', searchInput.value.trim());
        }
        params.set('limit', '100');
        const qs = params.toString();
        return qs ? `${apiUrl}?${qs}` : apiUrl;
    }

    function renderLogs(logs) {
        if (!logs.length) {
            output.innerHTML = `<div class="log-empty">${escapeHtml(labels.noResults)}</div>`;
            return;
        }
        output.innerHTML = logs.map((l) => `
            <div class="log-entry">
                <span class="log-time">[${escapeHtml(l.time)}]</span>
                <span class="type-${escapeHtml(l.action)}">${escapeHtml(l.action)}</span>
                <span>${escapeHtml(l.detail)}</span>
            </div>`).join('');
    }

    async function refresh() {
        try {
            const res = await fetch(buildQuery());
            const data = await res.json();
            renderLogs(data.logs || []);
            if (counterEl) counterEl.textContent = formatEntries(data.total ?? data.logs?.length ?? 0);
            if (pingEl) pingEl.textContent = data.ping;
            emergency = data.emergency;
            document.body.classList.toggle('emergency-mode', emergency);
            if (statusPill) statusPill.className = 'pill ' + (emergency ? 'pill-error' : 'pill-online');
            if (statusText) statusText.textContent = emergency ? labels.critical : labels.online;
        } catch {
            document.body.classList.add('emergency-mode');
        }
    }

    function scheduleRefresh() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(refresh, 250);
    }

    actionFilter?.addEventListener('change', refresh);
    searchInput?.addEventListener('input', scheduleRefresh);

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
            const base = root.dataset.adminBase;
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
