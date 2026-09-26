window.SA = window.SA || {};

SA.store = (() => {
  'use strict';

  const MAX_UNDO = 200;
  const COALESCE_MS = 400;
  const AREAS = ['project', 'style', 'script', 'overrides', 'keyframes', 'media', 'view'];

  const state = {
    project: null,
    selection: { paths: [], kind: null },
    playhead: 0,
    playing: false,
    view: { zoom: 1, guides: false, snapping: true, panels: { media: true, inspector: true, timeline: true } },
    version: Object.fromEntries(AREAS.map((area) => [area, 0])),
  };

  const listeners = new Set();
  const undoStack = [];
  const redoStack = [];
  let coalesce = { key: null, time: 0 };
  let dirty = false;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function bump(areas) {
    for (const area of areas || ['project']) {
      if (state.version[area] == null) state.version[area] = 0;
      state.version[area] += 1;
    }
  }

  function emit() {
    for (const entry of [...listeners]) {
      try {
        entry.fn(state);
      } catch (error) {
        if (typeof console !== 'undefined') console.error(error);
      }
    }
  }

  function subscribe(selector, fn) {
    const entry = { selector, fn };
    listeners.add(entry);
    fn(state);
    return () => listeners.delete(entry);
  }

  function load(project) {
    state.project = project;
    state.playhead = 0;
    state.playing = false;
    state.selection = { paths: [], kind: null };
    undoStack.length = 0;
    redoStack.length = 0;
    coalesce = { key: null, time: 0 };
    bump(['project', 'style', 'script', 'overrides', 'keyframes', 'media']);
    emit();
  }

  function dispatch(command) {
    if (!state.project || !command) return;
    const areas = command.areas || ['project'];
    const before = clone(state.project);
    command.do(state.project, state);
    const after = clone(state.project);
    const now = Date.now();
    const mergeable = !!command.coalesceKey && coalesce.key === command.coalesceKey && now - coalesce.time < COALESCE_MS && undoStack.length;
    if (mergeable) {
      undoStack[undoStack.length - 1].after = after;
      undoStack[undoStack.length - 1].label = command.label || undoStack[undoStack.length - 1].label;
    } else {
      undoStack.push({ label: command.label || 'edit', before, after, areas });
      if (undoStack.length > MAX_UNDO) undoStack.shift();
    }
    redoStack.length = 0;
    coalesce = { key: command.coalesceKey || null, time: now };
    bump(areas);
    dirty = true;
    emit();
  }

  function applySnapshot(snapshot, areas) {
    state.project = clone(snapshot);
    bump(areas || ['project']);
    dirty = true;
    emit();
  }

  function undo() {
    if (!undoStack.length) return false;
    const entry = undoStack.pop();
    redoStack.push(entry);
    applySnapshot(entry.before, entry.areas);
    return true;
  }

  function redo() {
    if (!redoStack.length) return false;
    const entry = redoStack.pop();
    undoStack.push(entry);
    applySnapshot(entry.after, entry.areas);
    return true;
  }

  function canUndo() {
    return undoStack.length > 0;
  }

  function canRedo() {
    return redoStack.length > 0;
  }

  function setSelection(paths, kind) {
    state.selection = { paths: [...(paths || [])], kind: kind || null };
    bump(['view']);
    emit();
  }

  function setPlayhead(seconds) {
    state.playhead = Math.max(0, seconds || 0);
    emit();
  }

  function setPlaying(value) {
    state.playing = !!value;
    emit();
  }

  function setView(patch) {
    state.view = { ...state.view, ...patch };
    bump(['view']);
    emit();
  }

  function setPanels(patch) {
    state.view = { ...state.view, panels: { ...state.view.panels, ...patch } };
    bump(['view']);
    emit();
  }

  function markClean() {
    dirty = false;
  }

  function isDirty() {
    return dirty;
  }

  function findCue(cueId) {
    const cues = state.project && state.project.script ? state.project.script.cues : [];
    return cues.find((cue) => cue.id === cueId) || null;
  }

  function snapshotCue(cue) {
    return cue ? clone(cue) : null;
  }

  function replaceCue(cueId, next) {
    const project = state.project;
    const cues = project.script.cues;
    const index = cues.findIndex((cue) => cue.id === cueId);
    if (index < 0) return;
    if (next) cues[index] = next;
    else cues.splice(index, 1);
  }

  const commands = {
    setProp(path, propPath, value, options) {
      dispatch({
        label: `set ${propPath}`,
        areas: ['overrides'],
        coalesceKey: options && options.coalesceKey,
        do(project) {
          const overrides = project.overrides[path] || (project.overrides[path] = {});
          const before = overrides[propPath];
          overrides[propPath] = value;
          return before;
        },
        undo(project) {
          const overrides = project.overrides[path];
          if (!overrides) return;
          delete overrides[propPath];
        },
      });
    },
    setOutput(patch) {
      dispatch({
        label: 'output',
        areas: ['project'],
        do(project) {
          project.output = { ...project.output, ...patch };
          if (patch.aspect) SA.project.setDimensions(project, patch.aspect);
          if (!patch.aspect && patch.width) project.output.width = patch.width;
        },
      });
    },
    setMeta(patch) {
      dispatch({
        label: 'meta',
        areas: ['project'],
        do(project) {
          project.meta = { ...project.meta, ...patch, updatedAt: new Date().toISOString() };
        },
      });
    },
    editCueText(cueId, text, options) {
      const cue = findCue(cueId);
      if (!cue) return;
      const before = snapshotCue(cue);
      dispatch({
        label: 'edit text',
        areas: ['script'],
        coalesceKey: options && options.coalesceKey,
        do(project) {
          const target = project.script.cues.find((entry) => entry.id === cueId);
          if (!target) return;
          target.text = String(text);
          const orphans = [];
          for (const key of Object.keys(project.overrides)) {
            if (key.startsWith(`cue:${cueId}/`) || key === `cue:${cueId}`) orphans.push(key);
          }
          target.orphanEdits = orphans.length;
        },
        undo(project) {
          replaceCue(cueId, clone(before));
        },
      });
    },
    addCue(cue) {
      dispatch({
        label: 'add cue',
        areas: ['script'],
        do(project) {
          project.script.cues.push(clone(cue));
          project.script.cues.sort((a, b) => a.start - b.start);
        },
      });
    },
    deleteCue(cueId) {
      const cue = findCue(cueId);
      if (!cue) return;
      dispatch({
        label: 'delete cue',
        areas: ['script'],
        do(project) {
          project.script.cues = project.script.cues.filter((entry) => entry.id !== cueId);
        },
        undo(project) {
          project.script.cues.push(clone(cue));
          project.script.cues.sort((a, b) => a.start - b.start);
        },
      });
    },
    moveCue(cueId, start, options) {
      const cue = findCue(cueId);
      if (!cue) return;
      const before = snapshotCue(cue);
      const duration = cue.end - cue.start;
      dispatch({
        label: 'move cue',
        areas: ['script'],
        coalesceKey: options && options.coalesceKey,
        do(project) {
          const target = project.script.cues.find((entry) => entry.id === cueId);
          if (!target) return;
          target.start = Math.max(0, start);
          target.end = target.start + duration;
        },
        undo(project) {
          replaceCue(cueId, clone(before));
        },
      });
    },
    trimCue(cueId, edge, time, options) {
      const cue = findCue(cueId);
      if (!cue) return;
      const before = snapshotCue(cue);
      dispatch({
        label: 'trim cue',
        areas: ['script'],
        coalesceKey: options && options.coalesceKey,
        do(project) {
          const target = project.script.cues.find((entry) => entry.id === cueId);
          if (!target) return;
          if (edge === 'start') target.start = Math.max(0, Math.min(time, target.end - 0.2));
          else target.end = Math.max(target.start + 0.2, time);
        },
        undo(project) {
          replaceCue(cueId, clone(before));
        },
      });
    },
    splitCue(cueId, time) {
      const cue = findCue(cueId);
      if (!cue || time <= cue.start || time >= cue.end) return;
      dispatch({
        label: 'split cue',
        areas: ['script'],
        do(project) {
          const target = project.script.cues.find((entry) => entry.id === cueId);
          if (!target) return;
          const second = { ...clone(target), id: `${cueId}_${Math.random().toString(16).slice(2, 6)}`, start: time };
          target.end = time;
          project.script.cues.push(second);
          project.script.cues.sort((a, b) => a.start - b.start);
        },
        undo(project) {
          project.script.cues = project.script.cues.filter((entry) => !entry.id.startsWith(`${cueId}_`));
          replaceCue(cueId, clone(cue));
        },
      });
    },
    mergeCues(cueId) {
      const cue = findCue(cueId);
      if (!cue) return;
      const cues = [...state.project.script.cues].sort((a, b) => a.start - b.start);
      const index = cues.findIndex((entry) => entry.id === cueId);
      const next = cues[index + 1];
      if (!next) return;
      dispatch({
        label: 'merge cues',
        areas: ['script'],
        do(project) {
          const target = project.script.cues.find((entry) => entry.id === cueId);
          const follower = project.script.cues.find((entry) => entry.id === next.id);
          if (!target || !follower) return;
          target.end = follower.end;
          target.text = `${target.text} ${follower.text}`.trim();
          project.script.cues = project.script.cues.filter((entry) => entry.id !== next.id);
        },
        undo(project) {
          replaceCue(cueId, clone(cue));
          project.script.cues.push(clone(next));
          project.script.cues.sort((a, b) => a.start - b.start);
        },
      });
    },
    importSrt(cues, options) {
      dispatch({
        label: 'import srt',
        areas: ['script'],
        do(project) {
          project.script.cues = clone(cues || []);
          project.script.imported = true;
          if (options && options.name) project.script.sourceName = options.name;
        },
      });
    },
    generateScript(cues, options) {
      dispatch({
        label: 'generate script',
        areas: ['script', 'style'],
        do(project) {
          project.script.cues = clone(cues || []);
          if (options) project.script.options = clone(options);
        },
      });
    },
    addKeyframe(path, propPath, key) {
      dispatch({
        label: 'add keyframe',
        areas: ['keyframes'],
        do(project) {
          const tracks = project.keyframes[path] || (project.keyframes[path] = {});
          const track = tracks[propPath] || (tracks[propPath] = []);
          track.push(clone(key));
          track.sort((a, b) => a.t - b.t);
        },
      });
    },
    moveKeyframe(path, propPath, index, time) {
      dispatch({
        label: 'move keyframe',
        areas: ['keyframes'],
        do(project) {
          const track = project.keyframes[path] && project.keyframes[path][propPath];
          if (!track || !track[index]) return;
          track[index].t = time;
          track.sort((a, b) => a.t - b.t);
        },
      });
    },
    deleteKeyframe(path, propPath, index) {
      dispatch({
        label: 'delete keyframe',
        areas: ['keyframes'],
        do(project) {
          const track = project.keyframes[path] && project.keyframes[path][propPath];
          if (!track) return;
          track.splice(index, 1);
          if (!track.length) delete project.keyframes[path][propPath];
        },
      });
    },
    setKeyframeEase(path, propPath, index, ease) {
      dispatch({
        label: 'keyframe ease',
        areas: ['keyframes'],
        do(project) {
          const track = project.keyframes[path] && project.keyframes[path][propPath];
          if (track && track[index]) track[index].ease = ease;
        },
      });
    },
    resetOverrides(path, group) {
      const existing = state.project.overrides[path];
      if (!existing) return;
      dispatch({
        label: 'reset overrides',
        areas: ['overrides'],
        do(project) {
          if (!group) delete project.overrides[path];
          else delete project.overrides[path][group];
        },
        undo(project) {
          project.overrides[path] = clone(existing);
        },
      });
    },
    setStyle(scope, patch, options) {
      dispatch({
        label: 'set style',
        areas: ['style'],
        coalesceKey: options && options.coalesceKey,
        do(project) {
          if (scope === 'project') project.style = SA.project.mergeDeep(project.style, patch);
          else if (scope && scope.cueId) {
            project.cueStyles[scope.cueId] = SA.project.mergeDeep(project.cueStyles[scope.cueId] || {}, patch);
          } else if (scope && scope.beatId) {
            project.beatStyles[scope.beatId] = SA.project.mergeDeep(project.beatStyles[scope.beatId] || {}, patch);
          }
        },
      });
    },
    setPalette(palettes) {
      dispatch({
        label: 'palettes',
        areas: ['style'],
        do(project) {
          project.palettes = clone(palettes || []);
        },
      });
    },
    addMedia(entry) {
      const kind = (entry && entry.kind) || 'images';
      dispatch({
        label: 'add media',
        areas: ['media'],
        do(project) {
          if (kind === 'audio') project.media.audio = clone(entry);
          else project.media[kind].push(clone(entry));
        },
      });
    },
    removeMedia(kind, id) {
      const media = state.project.media;
      const snapshot = kind === 'audio' ? clone(media.audio) : clone(media[kind]);
      dispatch({
        label: 'remove media',
        areas: ['media'],
        do(project) {
          if (kind === 'audio') project.media.audio = null;
          else project.media[kind] = project.media[kind].filter((entry) => entry.id !== id);
        },
        undo(project) {
          if (kind === 'audio') project.media.audio = clone(snapshot);
          else project.media[kind] = clone(snapshot);
        },
      });
    },
  };

  return {
    state,
    subscribe,
    load,
    dispatch,
    undo,
    redo,
    canUndo,
    canRedo,
    setSelection,
    setPlayhead,
    setPlaying,
    setView,
    setPanels,
    markClean,
    isDirty,
    findCue,
    commands,
    clone,
  };
})();
