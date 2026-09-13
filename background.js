// Derived from Picture-in-Picture Everywhere. Copyright 2018 Google LLC.
// SPDX-License-Identifier: Apache-2.0. See LICENSE and NOTICE.
const pending = new Set();
async function handleClick(tab) {
  if (!tab.id || pending.has(tab.id)) return;
  pending.add(tab.id);
  try {
    await chrome.scripting.executeScript({target: {tabId: tab.id, allFrames: true}, files: ['controller.js']});
    const results = await chrome.scripting.executeScript({
      target: {tabId: tab.id, allFrames: true},
      func: () => globalThis.__pipMemoryController?.scan()
    });
    // Close the active frame first; do not open another frame during a toggle.
    const active = results.find(r => r.result?.active);
    const candidates = results.filter(r => r.result?.area > 0)
      .sort((a, b) => b.result.area - a.result.area || a.frameId - b.frameId);
    const selected = active || candidates[0];
    if (!selected) throw new Error('没有找到已加载、可见的视频；浏览器内部页面不支持注入。');
    const {pipSize} = await chrome.storage.local.get('pipSize');
    const [result] = await chrome.scripting.executeScript({
      target: {tabId: tab.id, frameIds: [selected.frameId]},
      func: size => globalThis.__pipMemoryController.toggle(size),
      args: [pipSize || null]
    });
    if (!result?.result?.ok) throw new Error(result?.result?.error || '画中画请求失败');
    await chrome.action.setBadgeText({tabId: tab.id, text: ''});
    await chrome.action.setTitle({tabId: tab.id, title: `切换画中画（Alt+P） · ${result.result.mode || '已关闭'}`});
  } catch (error) {
    await chrome.action.setBadgeText({tabId: tab.id, text: '!'}).catch(() => {});
    await chrome.action.setTitle({tabId: tab.id, title: error.message}).catch(() => {});
  } finally {
    pending.delete(tab.id);
  }
}
chrome.action.onClicked.addListener(handleClick);
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.tab || message?.type !== 'pip-size') return;
  const {width, height} = message.size || {};
  if (![width, height].every(v => Number.isInteger(v) && v >= 100 && v <= 8192)) {
    respond({ok: false}); return;
  }
  chrome.storage.local.set({pipSize: {width, height}}).then(
    () => respond({ok: true}), () => respond({ok: false})
  );
  return true;
});
