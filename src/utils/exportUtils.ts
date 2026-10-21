import { Platform, Share } from 'react-native';

export type ExportFormat = 'excel' | 'word' | 'html' | 'csv';

export interface ExportTableData {
  title: string;
  subtitle?: string;
  fileBaseName: string;
  headers: string[];
  rows: string[][];
}

export async function exportTableReport(
  data: ExportTableData,
  format: ExportFormat
): Promise<void> {
  const { title, subtitle = '', fileBaseName, headers, rows } = data;
  let fileName = `${fileBaseName}.csv`;
  let mimeType = 'text/csv;charset=utf-8;';
  let content = '';

  if (format === 'csv') {
    fileName = `${fileBaseName}.csv`;
    mimeType = 'text/csv;charset=utf-8;';
    const csvRows = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','));
    content = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
  } else if (format === 'excel') {
    fileName = `${fileBaseName}.xls`;
    mimeType = 'application/vnd.ms-excel;charset=utf-8;';
    const ths = headers.map(h => `<th style="background-color:#0f172a;color:#ffffff;padding:10px 12px;border:1px solid #0f172a;font-weight:bold;text-align:left;">${h}</th>`).join('');
    const trs = rows.map((r, ri) => {
      const bg = ri % 2 === 1 ? '#f8fafc' : '#ffffff';
      const tds = r.map(c => `<td style="padding:8px 12px;border:1px solid #cbd5e1;background-color:${bg};">${c || ''}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');

    content = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" />
      <style>
        body { font-family: Calibri, Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        h2 { color: #6d28d9; margin-bottom: 4px; }
        p { color: #64748b; margin-top: 0; font-size: 13px; }
      </style>
      </head>
      <body>
        <h2>${title}</h2>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
        <table>
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </body>
      </html>
    `;
  } else if (format === 'word') {
    fileName = `${fileBaseName}.doc`;
    mimeType = 'application/msword;charset=utf-8;';
    const ths = headers.map(h => `<th style="background-color:#0f172a;color:#ffffff;padding:8px 10px;border:1px solid #0f172a;font-weight:bold;font-size:10pt;text-align:left;">${h}</th>`).join('');
    const trs = rows.map((r, ri) => {
      const bg = ri % 2 === 1 ? '#f8fafc' : '#ffffff';
      const tds = r.map(c => `<td style="padding:8px 10px;border:1px solid #cbd5e1;font-size:10pt;background-color:${bg};">${c || ''}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');

    content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${title}</title>
      <style>
        body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; margin: 30px; color: #0f172a; }
        .header { border-bottom: 3px solid #7c3aed; padding-bottom: 10px; margin-bottom: 16px; }
        h1 { color: #5b21b6; font-size: 18pt; margin: 0 0 4px 0; }
        .meta { color: #64748b; font-size: 10.5pt; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        .footer { margin-top: 24px; font-size: 8.5pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
      </style>
      </head>
      <body>
        <div class='header'>
          <h1>${title}</h1>
          ${subtitle ? `<p class='meta'>${subtitle}</p>` : ''}
        </div>
        <table>
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
        <div class='footer'>Loveworld Singers Rehearsal Hub &bull; Generated on ${new Date().toLocaleString()}</div>
      </body>
      </html>
    `;
  } else if (format === 'html') {
    fileName = `${fileBaseName}.html`;
    mimeType = 'text/html;charset=utf-8;';
    const ths = headers.map(h => `<th style="background:#0f172a;color:#ffffff;padding:10px 12px;font-weight:600;text-align:left;">${h}</th>`).join('');
    const trs = rows.map((r, ri) => {
      const bg = ri % 2 === 1 ? '#f8fafc' : '#ffffff';
      const tds = r.map(c => `<td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;background-color:${bg};">${c || ''}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');

    content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #0f172a; background: #fff; }
          .header { border-bottom: 2px solid #7c3aed; padding-bottom: 12px; margin-bottom: 20px; }
          h1 { color: #6d28d9; margin: 0 0 6px 0; font-size: 22px; }
          p { margin: 0; color: #64748b; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          @media print {
            body { margin: 0; padding: 10mm; }
            @page { size: auto; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
        <table>
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </body>
      </html>
    `;
  }

  // 1. Web browser download
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // 2. Mobile device native file share via expo-file-system
  try {
    const FileSystem = require('expo-file-system/legacy') || require('expo-file-system');
    const cacheDir = FileSystem?.cacheDirectory || FileSystem?.documentDirectory;
    if (cacheDir) {
      const fileUri = `${cacheDir}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType?.UTF8 || 'utf8' });
      await Share.share(
        Platform.OS === 'ios'
          ? { url: fileUri, title: fileName }
          : { title: fileName, message: `${title} - ${subtitle || fileName}` }
      );
      return;
    }
  } catch (fsErr) {
    // fallback
  }

  await Share.share({ title: fileName, message: content });
}
