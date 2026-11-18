// Refuse to run inside another site's frame (a meta CSP cannot set frame-ancestors). Code Apache-2.0.
if (window.top !== window.self) { document.documentElement.style.display = 'none'; try { window.top.location = window.self.location.href; } catch { /* blocked */ } }
