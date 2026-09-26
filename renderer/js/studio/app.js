(() => {
  'use strict';

  const i18n = SA.i18n;
  const store = SA.store;
  const platform = SA.platform;
  const LS_KEY = 'sa.studio.layout';
  const MIN = { media: 200, inspector: 280, timeline: 140 };

  const el = {};
  let layout = { mediaW: 260, inspectorW: 340, timelineH: 240, panels: { media: true, inspector: true, timeline: true }, preset: 'standard' };
  let autosaveEnabled = true;
  let toastTimer = null;
  let evaluationCache = { dataset: null, evaluation: null };
  let lastVersions = {};
  let rafId = null;
  let playAnchor = 0;
  let playFrom = 0;

  function t(key, vars) {
    return i18n.t(key, vars);
  }

  function cacheElements() {
    el.studio = document.getElementById('studio');
    el.avatar = document.getElementById('media-avatar');
    el.name = document.getElementById('media-name');
    el.handle = document.getElementById('media-handle');
    el.songs = document.getElementById('media-songs');
    el.cues = document.getElementById('media-cues');
    el.aspect = document.getElementById('media-aspect');
    el.duration = document.getElementById('media-duration');
    el.canvas = document.getElementById('preview-canvas');
    el.previewStage = document.querySelector('.preview-stage');
    el.welcome = document.getElementById('welcome');
    el.welcomeImport = document.getElementById('welcome-import');
    el.welcomeOpen = document.getElementById('welcome-open');
    el.welcomeSrt = document.getElementById('welcome-srt');
    el.tpStart = document.getElementById('tp-start');
    el.tpPrev = document.getElementById('tp-prev');
    el.tpPlay = document.getElementById('tp-play');
    el.tpNext = document.getElementById('tp-next');
    el.tpEnd = document.getElementById('tp-end');
    el.tpTime = document.getElementById('tp-time');
    el.tpAspect = document.getElementById('tp-aspect');
    el.inspectorCues = document.getElementById('inspector-cues');
    el.toast = document.getElementById('toast');
    el.dialogRoot = document.getElementById('dialog-root');
    el.splitMedia = document.getElementById('split-media');
    el.splitInspector = document.getElementById('split-inspector');
    el.splitTimeline = document.getElementById('split-timeline');
  }

  function project() {
    return store.state.project;
  }

  function evaluation() {
    const data = project() && project().dataset;
    if (!data) return null;
    if (evaluationCache.dataset === data && evaluationCache.evaluation) return evaluationCache.evaluation;
    evaluationCache = { dataset: data, evaluation: SA.achievements.evaluate(data) };
    return evaluationCache.evaluation;
  }

  function duration() {
    const cues = project() ? project().script.cues : [];
    return cues.reduce((max, cue) => Math.max(max, cue.end || 0), 0);
  }

  function formatClock(seconds) {
    const value = Math.max(0, seconds || 0);
    const minutes = Math.floor(value / 60);
    const rest = value % 60;
    return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
  }

  function loadLayout() {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (stored && stored.panels) layout = { ...layout, ...stored, panels: { ...layout.panels, ...stored.panels } };
    } catch {
      /* ignore */
    }
  }

  function saveLayout() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(layout));
    } catch {
      /* ignore */
    }
  }

  function applyLayout() {
    el.studio.classList.toggle('panel-hidden-media', !layout.panels.media);
    el.studio.classList.toggle('panel-hidden-inspector', !layout.panels.inspector);
    el.studio.classList.toggle('panel-hidden-timeline', !layout.panels.timeline);
    document.documentElement.style.setProperty('--media-w', `${Math.max(0, layout.mediaW)}px`);
    document.documentElement.style.setProperty('--inspector-w', `${Math.max(0, layout.inspectorW)}px`);
    document.documentElement.style.setProperty('--timeline-h', `${Math.max(0, layout.timelineH)}px`);
  }

  function setLayout(name) {
    if (name === 'reset') {
      layout = { mediaW: 260, inspectorW: 340, timelineH: 240, panels: { media: true, inspector: true, timeline: true }, preset: 'standard' };
    } else if (name === 'wide') {
      layout = { ...layout, preset: 'wide', timelineH: 160, panels: { ...layout.panels, media: false, timeline: true, inspector: true } };
    } else if (name === 'timeline') {
      layout = { ...layout, preset: 'timeline', timelineH: Math.round(window.innerHeight * 0.45), panels: { media: true, inspector: true, timeline: true } };
    } else {
      layout = { ...layout, preset: 'standard', mediaW: 260, inspectorW: 340, timelineH: 240, panels: { media: true, inspector: true, timeline: true } };
    }
    applyLayout();
    saveLayout();
    SA.menu.refresh();
    renderPreview();
  }

  function setupSplitter(node, axis) {
    node.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      node.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startY = event.clientY;
      const start = { mediaW: layout.mediaW, inspectorW: layout.inspectorW, timelineH: layout.timelineH };
      const onMove = (moveEvent) => {
        if (axis === 'media') layout.mediaW = Math.max(MIN.media, start.mediaW + (moveEvent.clientX - startX));
        else if (axis === 'inspector') layout.inspectorW = Math.max(MIN.inspector, start.inspectorW - (moveEvent.clientX - startX));
        else layout.timelineH = Math.max(MIN.timeline, start.timelineH - (moveEvent.clientY - startY));
        applyLayout();
      };
      const onUp = () => {
        node.removeEventListener('pointermove', onMove);
        node.removeEventListener('pointerup', onUp);
        saveLayout();
        renderPreview();
      };
      node.addEventListener('pointermove', onMove);
      node.addEventListener('pointerup', onUp);
    });
  }

  function applyStaticText() {
    document.documentElement.lang = i18n.lang();
    for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
    for (const node of document.querySelectorAll('[data-i18n-title]')) node.title = t(node.dataset.i18nTitle);
    document.title = t('studio.title');
  }

  function toast(key, vars) {
    el.toast.textContent = t(key, vars);
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.hidden = true;
    }, 3200);
  }

  function renderMedia() {
    const doc = project();
    const dataset = doc && doc.dataset;
    const profile = dataset && dataset.profile;
    if (profile) {
      if (profile.avatar) {
        el.avatar.src = profile.avatar;
        el.avatar.hidden = false;
      } else {
        el.avatar.hidden = true;
      }
      el.name.textContent = profile.displayName || profile.handle || '—';
      el.handle.textContent = profile.handle ? `@${profile.handle}` : '';
    } else {
      el.avatar.hidden = true;
      el.name.textContent = '—';
      el.handle.textContent = '';
    }
    el.songs.textContent = dataset ? dataset.songs.length : 0;
    el.cues.textContent = doc ? doc.script.cues.length : 0;
    el.aspect.textContent = doc ? doc.output.aspect : '16:9';
    el.duration.textContent = formatClock(duration());
  }

  function renderInspector() {
    const doc = project();
    el.inspectorCues.innerHTML = '';
    if (!doc || !doc.script.cues.length) return;
    for (const cue of doc.script.cues.slice(0, 40)) {
      const chip = document.createElement('div');
      chip.className = 'cue-chip';
      const time = document.createElement('strong');
      time.textContent = formatClock(cue.start);
      const text = document.createElement('span');
      text.textContent = (cue.text || '').split('\n')[0];
      chip.appendChild(time);
      chip.appendChild(text);
      el.inspectorCues.appendChild(chip);
    }
  }

  function renderTimeline() {
    const doc = project();
    el.duration.textContent = doc ? formatClock(duration()) : '0:00.00';
  }

  function renderPreview() {
    const doc = project();
    const dataset = doc && doc.dataset;
    el.welcome.hidden = !!dataset;
    const size = doc && doc.output.aspect === '9:16' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
    el.canvas.width = size.width;
    el.canvas.height = size.height;
    const ctx = el.canvas.getContext('2d');
    ctx.clearRect(0, 0, size.width, size.height);
    if (!dataset) return;
    SA.card.draw(ctx, {
      dataset,
      evaluation: evaluation(),
      aspect: doc.output.aspect,
      theme: SA.card.theme(doc),
      images: {},
      lang: i18n.lang(),
      generatedAt: new Date().toISOString(),
    });
  }

  function renderTransport() {
    const doc = project();
    el.tpTime.textContent = `${formatClock(store.state.playhead)} / ${formatClock(doc ? duration() : 0)}`;
    el.tpPlay.textContent = store.state.playing ? '⏸' : '▶';
    el.tpAspect.textContent = doc ? doc.output.aspect : '16:9';
  }

  function renderAll() {
    renderMedia();
    renderTimeline();
    renderInspector();
    renderPreview();
    renderTransport();
    SA.menu.refresh();
  }

  function tick() {
    if (!store.state.playing) return;
    const total = duration();
    const now = performance.now();
    const next = playFrom + (now - playAnchor) / 1000;
    if (next >= total) {
      stopPlayback();
      store.setPlayhead(total);
      return;
    }
    store.setPlayhead(next);
    rafId = requestAnimationFrame(tick);
  }

  function startPlayback() {
    if (store.state.playing) return;
    if (store.state.playhead >= duration()) store.setPlayhead(0);
    playFrom = store.state.playhead;
    playAnchor = performance.now();
    store.setPlaying(true);
    rafId = requestAnimationFrame(tick);
  }

  function stopPlayback() {
    store.setPlaying(false);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function togglePlay() {
    if (store.state.playing) stopPlayback();
    else startPlayback();
  }

  function seek(seconds) {
    store.setPlayhead(Math.max(0, Math.min(duration(), seconds)));
    if (store.state.playing) {
      playFrom = store.state.playhead;
      playAnchor = performance.now();
    }
  }

  function stepFrame(direction, large) {
    const fps = project() ? project().output.fps : 30;
    seek(store.state.playhead + direction * (large ? 1 : 1 / fps));
  }

  function cueTimes() {
    return (project() ? project().script.cues : []).map((cue) => cue.start).sort((a, b) => a - b);
  }

  function jumpCue(direction) {
    const times = cueTimes();
    const current = store.state.playhead;
    if (!times.length) return;
    if (direction > 0) {
      const next = times.find((time) => time > current + 1e-4);
      seek(next == null ? duration() : next);
    } else {
      const previous = [...times].reverse().find((time) => time < current - 1e-4);
      seek(previous == null ? 0 : previous);
    }
  }

  function currentCue() {
    const cues = project() ? project().script.cues : [];
    const selected = store.state.selection.paths[0] || '';
    const selectedId = selected.startsWith('cue:') ? selected.slice(4).split('/')[0] : null;
    if (selectedId) {
      const found = cues.find((cue) => cue.id === selectedId);
      if (found) return found;
    }
    return cues.find((cue) => store.state.playhead >= cue.start && store.state.playhead <= cue.end) || null;
  }

  function splitAtPlayhead() {
    const cue = currentCue();
    if (!cue) return;
    store.commands.splitCue(cue.id, store.state.playhead);
    toast('studio.toast.saved');
  }

  function distributeCues() {
    const doc = project();
    if (!doc || !doc.script.cues.length) return;
    store.dispatch({
      label: 'distribute cues',
      areas: ['script'],
      do(projectDoc) {
        const cues = [...projectDoc.script.cues].sort((a, b) => a.start - b.start);
        let cursor = cues.length ? cues[0].start : 0;
        for (const cue of cues) {
          const length = cue.end - cue.start;
          cue.start = cursor;
          cue.end = cursor + length;
          cursor = cue.end + 0.3;
        }
      },
    });
  }

  function generateScriptDialog() {
    const doc = project();
    if (!doc || !doc.dataset) {
      toast('studio.toast.needData');
      return;
    }
    const options = doc.script.options || {};
    const reveal = options.reveal || {};
    const stats = options.stats || {};
    const topSongs = options.topSongs || {};
    const timing = options.timing || {};
    el.dialogRoot.innerHTML = '';
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.innerHTML = `
      <h3>${t('studio.dialog.script.title')}</h3>
      <label><input type="checkbox" data-field="intro" ${options.intro === false ? '' : 'checked'} />${t('studio.dialog.script.intro')}</label>
      <label><input type="checkbox" data-field="reveal" ${reveal.enabled === false ? '' : 'checked'} />${t('studio.dialog.script.reveal')}</label>
      <div class="field"><span>${t('studio.dialog.script.which')}</span>
        <select data-field="which">
          <option value="unlocked"${reveal.which !== 'all' ? ' selected' : ''}>${t('studio.dialog.script.unlocked')}</option>
          <option value="all"${reveal.which === 'all' ? ' selected' : ''}>${t('studio.dialog.script.all')}</option>
        </select>
      </div>
      <label><input type="checkbox" data-field="stats" ${stats.enabled === false ? '' : 'checked'} />${t('studio.dialog.script.stats')}</label>
      <label><input type="checkbox" data-field="topSongs" ${topSongs.enabled === false ? '' : 'checked'} />${t('studio.dialog.script.topSongs')}</label>
      <div class="field"><span>${t('studio.dialog.script.count')}</span><input type="number" min="0" max="10" value="${topSongs.n == null ? 3 : topSongs.n}" data-field="topCount" /></div>
      <label><input type="checkbox" data-field="completion" ${options.completion === false ? '' : 'checked'} />${t('studio.dialog.script.completion')}</label>
      <label><input type="checkbox" data-field="outro" ${options.outro === false ? '' : 'checked'} />${t('studio.dialog.script.outro')}</label>
      <div class="field"><span>${t('studio.dialog.script.perCue')}</span><input type="number" min="0.5" max="10" step="0.1" value="${timing.perCue == null ? 2.8 : timing.perCue}" data-field="perCue" /></div>
      <div class="field"><span>${t('studio.dialog.script.gap')}</span><input type="number" min="0" max="2" step="0.05" value="${timing.gap == null ? 0.3 : timing.gap}" data-field="gap" /></div>
      <div class="dialog-actions">
        <button type="button" class="btn" data-action="cancel">${t('studio.dialog.script.cancel')}</button>
        <button type="button" class="btn btn-primary" data-action="generate">${t('studio.dialog.script.generate')}</button>
      </div>`;
    el.dialogRoot.appendChild(dialog);
    el.dialogRoot.hidden = false;
    const field = (name) => dialog.querySelector(`[data-field="${name}"]`);
    dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      el.dialogRoot.hidden = true;
    });
    dialog.querySelector('[data-action="generate"]').addEventListener('click', () => {
      const nextOptions = {
        intro: field('intro').checked,
        reveal: { enabled: field('reveal').checked, which: field('which').value, order: (reveal.order || 'grid') },
        stats: { enabled: field('stats').checked, items: stats.items || undefined },
        topSongs: { enabled: field('topSongs').checked, n: Number(field('topCount').value) || 0, by: topSongs.by || ['plays', 'likes'] },
        completion: field('completion').checked,
        outro: field('outro').checked,
        timing: { perCue: Number(field('perCue').value) || 2.8, gap: Number(field('gap').value) || 0, introLen: timing.introLen || 3.5, outroLen: timing.outroLen || 3 },
      };
      const cues = SA.scriptGen.build(evaluation(), doc.dataset, nextOptions, i18n.t, SA.format);
      store.commands.generateScript(cues, nextOptions);
      el.dialogRoot.hidden = true;
      toast('studio.toast.scriptGenerated', { n: cues.length });
    });
  }

  async function saveImage(aspect, type) {
    const doc = project();
    if (!doc || !doc.dataset) {
      toast('studio.toast.needData');
      return;
    }
    try {
      const profile = doc.dataset.profile || {};
      const avatar = await platform.loadImage(profile.avatar, profile.displayName || profile.handle);
      const blob = await SA.card.renderToBlob({
        dataset: doc.dataset,
        evaluation: evaluation(),
        aspect,
        theme: SA.card.theme(doc),
        images: { avatar },
        lang: i18n.lang(),
        generatedAt: new Date().toISOString(),
        type,
        quality: 0.92,
      });
      const extension = type === 'image/png' ? 'png' : 'jpg';
      const result = await platform.saveFile({ blob, name: `suno-${aspect.replace(':', 'x')}.${extension}`, mime: type });
      if (!result || result.canceled) toast('studio.toast.cancelled');
      else toast('studio.toast.imageSaved', { path: result.filePath });
    } catch {
      toast('studio.toast.error');
    }
  }

  async function openProject() {
    try {
      const result = await SA.io.open();
      if (result.canceled) return;
      toast('studio.toast.opened');
    } catch (error) {
      toast(error.code === 'newer-version' ? 'studio.toast.newerVersion' : 'studio.toast.invalidProject');
    }
  }

  async function openRecent(entry) {
    if (!entry || !entry.project) {
      toast('studio.toast.error');
      return;
    }
    try {
      SA.io.loadFromObject(entry.project);
      toast('studio.toast.opened');
    } catch {
      toast('studio.toast.invalidProject');
    }
  }

  async function saveProject() {
    const doc = project();
    if (!doc) return;
    const result = await SA.io.save(doc);
    if (result.canceled) toast('studio.toast.cancelled');
    else toast('studio.toast.saved');
  }

  async function saveProjectAs() {
    const doc = project();
    if (!doc) return;
    const result = await SA.io.save(doc, { name: SA.io.fileName(doc) });
    if (result.canceled) toast('studio.toast.cancelled');
    else toast('studio.toast.saved');
  }

  async function importSrt() {
    try {
      const result = await SA.io.readSrt();
      if (result.canceled) return;
      toast('studio.toast.srtImported', { n: result.cues.length });
      if (result.warnings && result.warnings.length) toast('studio.toast.srtWarnings', { n: result.warnings.length });
    } catch {
      toast('studio.toast.error');
    }
  }

  async function importProfile() {
    try {
      const result = await SA.io.importProfile();
      if (result.canceled) return;
      toast('studio.toast.profileImported');
    } catch {
      toast('studio.toast.error');
    }
  }

  async function exportSrt() {
    const doc = project();
    if (!doc) return;
    const result = await SA.io.exportSrt(doc, false);
    if (result.canceled) toast('studio.toast.cancelled');
    else toast('studio.toast.srtExported', { path: result.filePath });
  }

  function newProject() {
    SA.io.newProject({ lang: i18n.lang() });
    toast('studio.toast.newProject');
  }

  function backHome() {
    window.location.href = 'index.html';
  }

  function setAspect(aspect) {
    if (!project()) return;
    store.commands.setOutput({ aspect });
    renderAll();
  }

  function togglePanel(name) {
    layout.panels[name] = !layout.panels[name];
    applyLayout();
    saveLayout();
    SA.menu.refresh();
    renderPreview();
  }

  function setLanguage(code) {
    i18n.set(code);
    try {
      localStorage.setItem('sa.lang', code);
    } catch {
      /* ignore */
    }
    applyStaticText();
    SA.menu.build();
    renderAll();
    toast('studio.toast.languageChanged');
  }

  function toggleGuides() {
    store.setView({ guides: !store.state.view.guides });
  }

  function toggleSnapping() {
    store.setView({ snapping: !store.state.view.snapping });
  }

  function toggleAutosave() {
    autosaveEnabled = !autosaveEnabled;
    if (autosaveEnabled) SA.io.startAutosave(project, 30);
    else SA.io.stopAutosave();
    SA.menu.refresh();
  }

  function bindEvents() {
    el.welcomeImport.addEventListener('click', importProfile);
    el.welcomeOpen.addEventListener('click', openProject);
    el.welcomeSrt.addEventListener('click', importSrt);
    el.tpStart.addEventListener('click', () => seek(0));
    el.tpEnd.addEventListener('click', () => seek(duration()));
    el.tpPrev.addEventListener('click', () => jumpCue(-1));
    el.tpNext.addEventListener('click', () => jumpCue(1));
    el.tpPlay.addEventListener('click', togglePlay);
    el.tpAspect.addEventListener('click', () => setAspect(project() && project().output.aspect === '16:9' ? '9:16' : '16:9'));
    setupSplitter(el.splitMedia, 'media');
    setupSplitter(el.splitInspector, 'inspector');
    setupSplitter(el.splitTimeline, 'timeline');
    document.addEventListener('keydown', (event) => {
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        store.redo();
        return;
      }
      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveProject();
        return;
      }
      if (mod && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        openProject();
        return;
      }
      if (mod && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        importProfile();
        return;
      }
      if (mod && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        toast('studio.toast.notYet');
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'ArrowLeft') {
        stepFrame(-1, event.shiftKey);
      } else if (event.key === 'ArrowRight') {
        stepFrame(1, event.shiftKey);
      } else if (event.key === 'ArrowUp') {
        jumpCue(-1);
      } else if (event.key === 'ArrowDown') {
        jumpCue(1);
      } else if (event.key === 'Home') {
        seek(0);
      } else if (event.key === 'End') {
        seek(duration());
      } else if (event.key === 's' || event.key === 'S') {
        splitAtPlayhead();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        const cue = currentCue();
        if (cue) store.commands.deleteCue(cue.id);
      } else if (event.key === 'Escape') {
        store.setSelection([], null);
        el.dialogRoot.hidden = true;
      }
    });
    window.addEventListener('resize', renderPreview);
    store.subscribe('all', (state) => {
      const areas = Object.keys(state.version);
      const changed = areas.some((area) => state.version[area] !== lastVersions[area]);
      lastVersions = { ...state.version };
      if (changed) renderAll();
      else renderTransport();
    });
  }

  function menuHandlers() {
    return {
      newProject,
      openProject,
      openRecent,
      saveProject,
      saveProjectAs,
      importProfile,
      importSrt,
      backHome,
      generateScript: generateScriptDialog,
      distributeCues,
      exportSrt,
      exportVideo: () => toast('studio.toast.notYet'),
      setAspect,
      setLanguage,
      togglePanel,
      setLayout,
      toggleGuides,
      toggleSnapping,
      toggleAutosave,
      isAutosaveEnabled: () => autosaveEnabled,
      getAspect: () => (project() ? project().output.aspect : '16:9'),
      isPanelVisible: (name) => !!layout.panels[name],
      getLayout: () => layout.preset,
      areGuidesOn: () => !!store.state.view.guides,
      isSnappingOn: () => !!store.state.view.snapping,
    };
  }

  async function startup() {
    cacheElements();
    loadLayout();
    applyLayout();
    i18n.set(localStorage.getItem('sa.lang') || i18n.detect());
    applyStaticText();
    bindEvents();
    SA.menu.init({ handlers: menuHandlers() });
    platform.recent.list().then(SA.menu.setRecent).catch(() => {});

    let handoff = null;
    if (!platform.isElectron) {
      if (window.location.hash === '#handoff') handoff = await platform.readHandoff();
    } else {
      const payload = await Promise.race([
        platform.waitForHandoff(),
        new Promise((resolve) => setTimeout(() => resolve(null), 900)),
      ]);
      if (payload && (payload.data || payload.dataset)) handoff = { dataset: payload.data || payload.dataset, lang: payload.lang };
    }

    let projectDoc = null;
    if (handoff && handoff.dataset) {
      projectDoc = SA.project.create({ dataset: handoff.dataset, lang: handoff.lang || i18n.lang(), aspect: '16:9' });
    } else {
      projectDoc = await SA.io.loadAutosave();
    }

    if (projectDoc) {
      store.load(projectDoc);
    } else {
      SA.io.newProject({ lang: i18n.lang() });
    }
    SA.io.startAutosave(project, autosaveEnabled ? 30 : 999999);
    renderAll();
  }

  window.SA.studio = { startup, renderAll };
  startup();
})();
