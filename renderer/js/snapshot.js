(() => {
  'use strict';

  const i18n = SA.i18n;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function fmtInt(n) {
    return new Intl.NumberFormat(i18n.locale()).format(Math.round(n || 0));
  }

  function fmtNum(n) {
    const value = n || 0;
    if (value >= 10000) {
      return new Intl.NumberFormat(i18n.locale(), { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    }
    return fmtInt(value);
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat(i18n.locale(), { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));
    } catch {
      return '';
    }
  }

  function fmtDuration(seconds) {
    if (!seconds) return '—';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  function detailText(badge) {
    const detail = badge.detail;
    if (!detail) return '';
    if (detail.type === 'song' && detail.song) {
      const statKey = detail.stat || 'plays';
      return `${detail.song.title} · ${fmtNum(detail.song[statKey] || 0)} ${i18n.t(`stats.${statKey}`)}`;
    }
    if (detail.type === 'count') return i18n.tPlural('achievements.songsCount', detail.n);
    if (detail.type === 'date') return fmtDate(detail.value);
    return '';
  }

  function render(data) {
    const evaluation = SA.achievements.evaluate(data);
    const profile = data.profile;

    const avatar = document.getElementById('snap-avatar');
    if (profile.avatar) {
      avatar.src = profile.avatar;
      avatar.hidden = false;
    } else {
      avatar.hidden = true;
    }
    document.getElementById('snap-name').textContent = profile.displayName || profile.handle;
    document.getElementById('snap-verified').hidden = !profile.isVerified;
    document.getElementById('snap-handle').textContent = `@${profile.handle}`;
    const description = document.getElementById('snap-desc');
    description.textContent = profile.description || '';
    description.hidden = !profile.description;

    const percent = Math.round(evaluation.completion * 100);
    document.getElementById('snap-ring').style.setProperty('--p', `${percent}%`);
    document.getElementById('snap-percent').textContent = `${percent}%`;
    document.getElementById('snap-summary').textContent = i18n.t('achievements.summary', {
      unlocked: evaluation.unlockedCount,
      total: evaluation.total,
    });

    const agg = evaluation.agg;
    const tiles = [
      [i18n.t('stats.songs'), fmtInt(agg.songCount)],
      [i18n.t('stats.plays'), fmtNum(agg.totalPlays)],
      [i18n.t('stats.likes'), fmtNum(agg.totalLikes)],
      [i18n.t('stats.comments'), fmtNum(agg.totalComments)],
      [i18n.t('stats.runtime'), fmtDuration(agg.totalDuration)],
      [i18n.t('stats.followers'), fmtNum(agg.followers)],
    ];
    document.getElementById('snap-stats').innerHTML = tiles
      .map(([label, value]) => `<div class="snap-tile"><span class="snap-tile-value">${esc(value)}</span><span class="snap-tile-label">${esc(label)}</span></div>`)
      .join('');

    const grid = document.getElementById('snap-grid');
    grid.innerHTML = evaluation.badges
      .map((badge) => {
        const progress = Math.round(badge.progress * 100);
        const progressText = badge.kind === 'metric' || badge.kind === 'best' ? `${fmtNum(badge.current)} / ${fmtNum(badge.target)}` : '';
        return `
          <article class="snap-badge ${badge.unlocked ? 'is-unlocked' : 'is-locked'}" data-category="${esc(badge.category)}" data-tier="${esc(badge.tier)}">
            <div class="snap-badge-head">
              <span class="snap-badge-icon"><svg class="icon"><use href="#ic-${badge.icon}"></use></svg></span>
              <h3>${esc(i18n.t(`badges.${badge.id}.name`))}</h3>
            </div>
            <p class="snap-badge-desc">${esc(i18n.t(`badges.${badge.id}.desc`))}</p>
            <div class="snap-badge-detail">${esc(detailText(badge))}</div>
            <div class="snap-badge-progress">
              <div class="snap-bar"><i data-progress="${progress}"></i></div>
              <span class="snap-progress-text">${esc(progressText)}</span>
            </div>
          </article>`;
      })
      .join('');

    for (const bar of grid.querySelectorAll('.snap-bar > i')) {
      bar.style.width = `${bar.dataset.progress}%`;
    }

    document.getElementById('snap-generated').textContent = i18n.t('snapshot.generated', { date: fmtDate(new Date().toISOString()) });
  }

  async function waitForImages() {
    const pending = [...document.images].filter((img) => img.src && !img.complete && !img.hidden);
    if (!pending.length) return;
    await Promise.all(
      pending.map(
        (img) =>
          new Promise((resolve) => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
            setTimeout(done, 8000);
          })
      )
    );
  }

  async function finish() {
    await waitForImages();
    try {
      await document.fonts.ready;
    } catch {}
    window.sunoApi.snapshotReady();
  }

  window.sunoApi.onSnapshotData(({ data, lang }) => {
    i18n.set(lang || 'en');
    document.documentElement.lang = i18n.lang();
    render(data);
    finish();
  });
})();
