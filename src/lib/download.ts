/** Triggers a client-side file download. Returns false if the browser blocked it. */
export function downloadText(fileName: string, text: string, mime = 'application/json'): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

export function byteSize(text: string): number {
  return new Blob([text]).size;
}
