'use client';

import React, { useEffect, useRef, useState } from 'react';
import { previewCopy, readHeaderImagePlacement } from '@/lib/docx-master';

const toBlob = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

/**
 * Shows the filled Word file on screen. This is a PREVIEW drawn by the browser: fonts and line
 * breaks can differ slightly from Word. The Word file that is downloaded is the exact document.
 */
export function MasterPreview({ bytes, onError }: { bytes: Uint8Array | null; onError?: (m: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!bytes || !el) return;
    let alive = true;
    (async () => {
      try {
        const { renderAsync } = await import('docx-preview');
        if (!alive) return;
        const scratch = document.createElement('div');
        await renderAsync(toBlob(await previewCopy(bytes)), scratch, undefined, { inWrapper: false, breakPages: true, ignoreLastRenderedPageBreak: true, useBase64URL: true });
        // The browser draws the header picture in the wrong place; put it where the Word file says.
        const place = await readHeaderImagePlacement(bytes).catch(() => null);
        const img = scratch.querySelector('section.docx > header img') as HTMLElement | null;
        const wrap = img?.parentElement as HTMLElement | null;
        if (place && img && wrap) {
          wrap.style.cssText = `position:absolute;left:${place.leftPx}px;top:${place.topPx}px;width:${place.widthPx}px;height:${place.heightPx}px;z-index:1`;
          img.style.cssText = `position:static;width:${place.widthPx}px;height:${place.heightPx}px`;
          const sec = wrap.closest('section') as HTMLElement | null;
          if (sec) sec.style.position = 'relative';
        }
        if (alive) el.replaceChildren(...Array.from(scratch.childNodes));
      } catch (e) {
        if (alive) onError?.(e instanceof Error ? e.message : 'The preview could not be drawn.');
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bytes]);
  // The page keeps its A4 size. On a narrow screen the whole page shrinks like a picture; text never re-wraps.
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setZoom(Math.min(1, Math.max(0.3, (el.clientWidth - 8) / 794)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="w-full overflow-x-auto">
      <div ref={host} className="master-preview" style={{ zoom, width: 794 }} />
    </div>
  );
}

/** Rough page count for the PAGES box: draws the file off screen and measures it. */
export async function estimatePages(bytes: Uint8Array): Promise<number> {
  const { renderAsync } = await import('docx-preview');
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden';
  document.body.appendChild(host);
  try {
    await renderAsync(toBlob(bytes), host, undefined, { inWrapper: false, breakPages: true, ignoreLastRenderedPageBreak: true, useBase64URL: true });
    const sections = Array.from(host.querySelectorAll('section.docx')) as HTMLElement[];
    if (sections.length === 0) return 1;
    let pages = 0;
    for (const s of sections) {
      const page = parseFloat(getComputedStyle(s).minHeight) || s.getBoundingClientRect().height;
      pages += Math.max(1, Math.ceil((s.getBoundingClientRect().height - 2) / page));
    }
    return pages;
  } finally {
    host.remove();
  }
}
