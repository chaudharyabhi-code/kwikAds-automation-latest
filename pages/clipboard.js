// Clipboard verification shared by the Ad Library and My Ads page objects.
//
// Verifying a copy by pasting with Ctrl+V is unreliable: it races the app's asynchronous
// clipboard write, and it reads the SHARED OS clipboard, so it regularly picked up whatever was
// last copied on the machine. navigator.clipboard.readText() is no better — it needs document
// focus and can be blocked outright, returning empty.
//
// Instead, hook the clipboard APIs and record what the page itself writes. That is the behaviour
// under test and it is fully deterministic. Install BEFORE triggering the copy.
export async function startCapturingClipboardWrites(page) {
  await page.evaluate(() => {
    window.__clipWrites = [];
    if (navigator.clipboard && navigator.clipboard.writeText) {
      const orig = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = (text) => {
        window.__clipWrites.push(String(text));
        return orig(text).catch(() => {});   // ignore OS-level permission failures
      };
    }
    // Fallback for the older textarea + execCommand('copy') technique
    const origExec = document.execCommand.bind(document);
    document.execCommand = (cmd, ...rest) => {
      if (String(cmd).toLowerCase() === 'copy') {
        const active = document.activeElement;
        if (active && 'value' in active) window.__clipWrites.push(String(active.value));
        else window.__clipWrites.push(String(window.getSelection() || ''));
      }
      return origExec(cmd, ...rest);
    };
  });
}

// Polls until the page has written something to the clipboard; returns that value, or ''.
export async function waitForClipboardWrite(page, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await page
      .evaluate(() => (window.__clipWrites || []).filter(Boolean).slice(-1)[0] || '')
      .catch(() => '');
    if (value.trim()) return value.trim();
    await page.waitForTimeout(200);
  }
  return '';
}
