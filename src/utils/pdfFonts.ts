import type { jsPDF } from 'jspdf';

const FONT_NAME = 'VestigiaNoto';
let fontData: Promise<string> | undefined;

/** Cache the font download across exports; embed only used glyphs in each PDF. */
export async function registerDocumentFont(pdf: jsPDF) {
  fontData ??= (async () => {
    const response = await fetch('/fonts/NotoSansJP.ttf');
    if (!response.ok) throw new Error('The invoice font could not be loaded. Please try again.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 12 || bytes[0] !== 0 || bytes[1] !== 1 || bytes[2] !== 0 || bytes[3] !== 0) throw new Error('The invoice font is invalid. Please try again.');
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    return btoa(binary);
  })().catch(error => { fontData = undefined; throw error; });
  const data = await fontData;
  pdf.addFileToVFS('VestigiaNoto.ttf', data);
  pdf.addFont('VestigiaNoto.ttf', FONT_NAME, 'normal');
  pdf.addFont('VestigiaNoto.ttf', FONT_NAME, 'bold');
  return FONT_NAME;
}
