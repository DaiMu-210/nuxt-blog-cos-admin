export type ToastLike = {
  success: (message: string) => any;
  error: (message: string) => any;
};

async function copyText(text: string) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', 'true');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  if (!ok) throw new Error('copy failed');
}

export function enhanceCodeBlocks(root: ParentNode, opts?: { toast?: ToastLike }) {
  const pres = Array.from(root.querySelectorAll('pre'));
  for (const pre of pres) {
    if (pre.getAttribute('data-code-enhanced') === '1') continue;
    const code = pre.querySelector('code');
    if (!code) continue;
    pre.setAttribute('data-code-enhanced', '1');
    pre.classList.add('tw-codeblock');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tw-codecopy';
    btn.textContent = '复制';
    btn.addEventListener('click', async () => {
      const text = (code as HTMLElement).innerText || code.textContent || '';
      if (!text) return;
      try {
        await copyText(text);
        btn.textContent = '已复制';
        opts?.toast?.success?.('已复制');
        window.setTimeout(() => {
          if (btn.isConnected) btn.textContent = '复制';
        }, 900);
      } catch {
        opts?.toast?.error?.('复制失败');
      }
    });

    pre.appendChild(btn);
  }
}

