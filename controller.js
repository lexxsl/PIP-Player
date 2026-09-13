// Video selection adapted from Picture-in-Picture Everywhere.
// Copyright 2018 Google LLC. SPDX-License-Identifier: Apache-2.0.
// Changes: coordinated frame selection, Document PiP, restoration and cleanup.
(() => {
  if (globalThis.__pipMemoryController) return;
  const DEBUG = false;
  const log = (...args) => { if (DEBUG) console.debug('[PiP Memory]', ...args); };
  let session = null, busy = false, requestedSize = null;
  // Sites can keep changing video.style after adoption into the PiP document.
  const VIDEO_STYLE = 'all:initial!important;display:block!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;max-width:100%!important;max-height:100%!important;box-sizing:border-box!important;position:absolute!important;inset:0!important;transform:none!important;translate:none!important;rotate:none!important;scale:none!important;clip:auto!important;clip-path:none!important;object-fit:contain!important;object-position:50% 50%!important;margin:0!important;padding:0!important;border:0!important;';
  function saveSize(s) {
    if (s.mode !== 'Document PiP') return;
    const size = {width: Math.round(s.window.innerWidth), height: Math.round(s.window.innerHeight)};
    if (size.width < 100 || size.height < 100) return;
    try {
      globalThis.chrome?.runtime?.sendMessage({type: 'pip-size', size})?.catch(() => {});
    } catch (e) { log('size save unavailable', e.message); }
  }
  function area(video) {
    const rect = video.getClientRects()[0];
    return rect ? rect.width * rect.height : 0;
  }
  function candidates() {
    return [...document.querySelectorAll('video')]
      .filter(v => v.readyState > 0 && !v.disablePictureInPicture && area(v) > 0)
      .filter(v => { const s = getComputedStyle(v); return s.visibility !== 'hidden' && s.display !== 'none'; })
      .sort((a, b) => area(b) - area(a));
  }
  function cleanup(s) {
    s.resize?.disconnect(); s.mutation?.disconnect();
    s.styleObserver?.disconnect();
    if (s.onResize) s.window.removeEventListener('resize', s.onResize);
    if (s.sizeTimer) clearTimeout(s.sizeTimer);
    if (s.timer) clearTimeout(s.timer);
  }
  function restore(s) {
    if (s.restored) return;
    saveSize(s);
    s.restored = true;
    cleanup(s);
    // Placeholder retains exact order even if siblings have changed.
    if (s.anchor?.parentNode) s.anchor.replaceWith(s.video);
    else if (s.parent) s.parent.insertBefore(s.video, s.next?.parentNode === s.parent ? s.next : null);
    for (const [name, value] of Object.entries(s.attributes)) {
      if (value === null) s.video.removeAttribute(name);
      else s.video.setAttribute(name, value);
    }
    if (session === s) session = null;
    log('restored', s.video.isConnected);
  }
  function watch(s) {
    const queue = () => {
      if (s.timer || session !== s) return;
      s.timer = setTimeout(async () => {
        s.timer = null;
        if (busy || session !== s) return;
        if (s.mode === 'Document PiP' && !s.anchor.isConnected) {
          restore(s); s.window.close(); return;
        }
        const next = candidates()[0];
        // Compare against the page placeholder, not the floating video's size.
        const currentArea = s.anchor ? area(s.anchor) : area(s.video);
        if (!next || next === s.video || area(next) <= currentArea) return;
        busy = true;
        try {
          if (s.mode === 'Document PiP') {
            const pip = s.window;
            restore(s);
            mount(next, pip);
          } else {
            await startTraditional(next);
          }
        } catch (e) { log('switch failed', e.name); }
        finally { busy = false; }
      }, 150);
    };
    s.resize = new ResizeObserver(queue);
    s.resize.observe(s.anchor || s.video);
    for (const v of candidates()) s.resize.observe(v);
    s.mutation = new MutationObserver(() => {
      for (const v of candidates()) s.resize.observe(v);
      queue();
    });
    s.mutation.observe(document.documentElement, {childList: true, subtree: true});
  }
  function mount(video, pip) {
    if (!video.parentNode) throw new DOMException('Video is detached', 'InvalidStateError');
    const s = {video, window: pip, mode: 'Document PiP', parent: video.parentNode, next: video.nextSibling,
      attributes: Object.fromEntries(['style', 'controls', '__pip__'].map(k => [k, video.getAttribute(k)]))};
    s.anchor = document.createElement('div');
    const rect = video.getClientRects()[0];
    s.anchor.style.cssText = `width:${rect?.width || 0}px;height:${rect?.height || 0}px;background:black;`;
    s.anchor.setAttribute('aria-hidden', 'true');
    video.replaceWith(s.anchor);
    session = s;
    try {
      pip.document.body.append(video);
      video.style.cssText = VIDEO_STYLE;
      const enforcedStyle = video.getAttribute('style');
      s.styleObserver = new MutationObserver(() => {
        if (!s.restored && video.getAttribute('style') !== enforcedStyle) video.setAttribute('style', enforcedStyle);
      });
      s.styleObserver.observe(video, {attributes: true, attributeFilter: ['style']});
      s.onResize = () => {
        if (s.sizeTimer) clearTimeout(s.sizeTimer);
        s.sizeTimer = setTimeout(() => { s.sizeTimer = null; saveSize(s); }, 350);
      };
      pip.addEventListener('resize', s.onResize);
      video.controls = true;
      video.setAttribute('__pip__', 'true');
      pip.addEventListener('pagehide', () => restore(s), {once: true});
      watch(s);
    } catch (e) { restore(s); throw e; }
  }
  async function startTraditional(video) {
    const pip = await video.requestPictureInPicture();
    const previous = session;
    if (previous) cleanup(previous);
    const s = {video, window: pip, mode: 'Video PiP', attributes: {'__pip__': video.getAttribute('__pip__')}};
    session = s; video.setAttribute('__pip__', 'true');
    video.addEventListener('leavepictureinpicture', () => restore(s), {once: true});
    watch(s);
  }
  async function start(video) {
    if (window === window.top && window.documentPictureInPicture?.requestWindow) {
      let pip;
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        // Keep this document's first request size stable for native placement reuse.
        pip = await window.documentPictureInPicture.requestWindow({...requestedSize, preferInitialWindowPlacement: false});
        const style = pip.document.createElement('style');
        style.textContent = 'html,body{width:100%;height:100%;margin:0;padding:0;overflow:hidden;background:black}body{position:relative}video{object-fit:contain!important;object-position:center!important}';
        pip.document.head.append(style);
        mount(video, pip);
        return;
      } catch (e) {
        if (session?.mode === 'Document PiP') restore(session);
        pip?.close();
        log('Document fallback', e.name, e.message);
      }
    }
    await startTraditional(video);
  }
  globalThis.__pipMemoryController = {
    scan() {
      return {active: !!session || !!document.pictureInPictureElement, area: area(candidates()[0] || document.createElement('video'))};
    },
    async toggle(size) {
      if (busy) return {ok: true, mode: session?.mode};
      busy = true;
      try {
        if (session?.mode === 'Document PiP') { const s = session; restore(s); s.window.close(); return {ok: true}; }
        if (document.pictureInPictureElement) { await document.exitPictureInPicture(); return {ok: true}; }
        const video = candidates()[0];
        if (!video) throw new DOMException('No loaded visible video', 'InvalidStateError');
        if (!requestedSize) {
          const valid = size && Number.isFinite(size.width) && Number.isFinite(size.height) && size.width >= 100 && size.height >= 100 && size.width <= 8192 && size.height <= 8192;
          requestedSize = valid ? {width: Math.round(size.width), height: Math.round(size.height)} : {width: 640, height: 360};
        }
        await start(video);
        return {ok: true, mode: session.mode};
      } catch (e) { return {ok: false, error: `${e.name}: ${e.message}`}; }
      finally { busy = false; }
    }
  };
  window.addEventListener('pagehide', () => {
    if (session?.mode === 'Document PiP') { const s = session; restore(s); s.window.close(); }
    else if (session) cleanup(session);
  });
})();
