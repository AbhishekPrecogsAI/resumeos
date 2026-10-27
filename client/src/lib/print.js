/**
 * Open rendered resume HTML in a new window and invoke print. The HTML comes from our template
 * renderer, which escapes all user text and contains no scripts.
 */
export function printHtml(html) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    return false;
  }
  win.addEventListener('load', () => {
    const go = () => {
      win.focus();
      win.print();
      URL.revokeObjectURL(url);
    };
    if (win.document.fonts?.ready) win.document.fonts.ready.then(go);
    else go();
  });
  return true;
}
