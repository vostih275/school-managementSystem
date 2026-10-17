/**
 * newsletter.js — renders newsletter-type announcements inside the
 * Announcements section (`#newsletter-container`) on student/teacher pages.
 *
 * Fetches /api/announcements, picks documents with type === 'newsletter',
 * renders the newest one as a formatted document (headings, bullets,
 * uniform tables, sign-off) and wires a "Print / Download Newsletter"
 * button that uses window.print() with dedicated print CSS — matching the
 * report card print approach.
 */
(function () {
  const apiBase = `${(window.API_CONFIG?.BASE_URL || 'https://aic-school-system-c0j6.onrender.com').replace(/\/$/, '')}/api`;

  // Inject newsletter styles + print rules once
  const style = document.createElement('style');
  style.textContent = `
    .newsletter-doc { max-width: 780px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb;
      border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); padding: 36px 44px;
      font-family: Georgia, 'Times New Roman', serif; color: #1f2937; line-height: 1.65; }
    .newsletter-doc .nl-head { text-align: center; border-bottom: 3px double #143a66; padding-bottom: 14px; margin-bottom: 20px; }
    .newsletter-doc .nl-school { font-size: 13px; letter-spacing: 1px; color: #6b7280; text-transform: uppercase; }
    .newsletter-doc .nl-title { font-size: 22px; font-weight: 700; color: #143a66; margin: 6px 0 4px; }
    .newsletter-doc .nl-meta { font-size: 12.5px; color: #4b5563; }
    .newsletter-doc h3 { font-size: 15px; color: #143a66; margin: 22px 0 8px; }
    .newsletter-doc p { margin: 0 0 12px; font-size: 13.5px; text-align: justify; }
    .newsletter-doc ul { margin: 0 0 12px 22px; font-size: 13.5px; }
    .newsletter-doc table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 13px; }
    .newsletter-doc th { background: #143a66; color: #fff; padding: 7px 10px; border: 1px solid #143a66; text-align: left; }
    .newsletter-doc td { padding: 6px 10px; border: 1px solid #cbd5e1; }
    .newsletter-doc tr:nth-child(even) td { background: #f7f9fc; }
    .newsletter-doc .nl-note { font-weight: 700; font-size: 12.5px; color: #b23a00; margin: 8px 0 14px; }
    .newsletter-doc .nl-signoff { margin-top: 26px; font-size: 13.5px; }
    .newsletter-doc .nl-author { font-weight: 700; margin-top: 18px; }
    .newsletter-doc .nl-role { color: #4b5563; font-size: 12.5px; }
    .nl-actions { text-align: center; margin: 14px 0 20px; }
    .nl-actions .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 24px;
      background: #143a66; color: #fff; border: none; border-radius: 6px; font-size: 14px;
      font-weight: 600; cursor: pointer; }
    .nl-actions .btn:hover { background: #0f2d50; }

    @page newsletter-page { size: A4 portrait; margin: 15mm 16mm; }

    @media print {
      body.print-newsletter * { visibility: hidden; }
      body.print-newsletter .newsletter-doc,
      body.print-newsletter .newsletter-doc * { visibility: visible; }
      body.print-newsletter .newsletter-doc { position: absolute; left: 0; top: 0; width: 100%;
        border: none; box-shadow: none; padding: 0; page: newsletter-page; }
      body.print-newsletter .nl-actions { display: none !important; }
      body.print-newsletter .newsletter-doc h3 { page-break-after: avoid; }
      body.print-newsletter .newsletter-doc p,
      body.print-newsletter .newsletter-doc li { orphans: 3; widows: 3; }
      body.print-newsletter .newsletter-doc table,
      body.print-newsletter .newsletter-doc tr { page-break-inside: avoid; }
      body.print-newsletter .newsletter-doc .nl-signoff,
      body.print-newsletter .newsletter-doc .nl-head { page-break-inside: avoid; }
      body.print-newsletter .newsletter-doc th { -webkit-print-color-adjust: exact;
        print-color-adjust: exact; }
    }
  `;
  document.head.appendChild(style);

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const renderTable = (t) => {
    if (!t || !t.headers || !t.headers.length) return '';
    const head = t.headers.map(h => `<th>${esc(h)}</th>`).join('');
    const body = (t.rows || []).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
    return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  };

  const renderSection = (s) => {
    const paras = (s.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join('');
    const list = (s.bullets || []).length
      ? `<ul>${s.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : '';
    return `${s.heading ? `<h3>${esc(s.heading)}</h3>` : ''}${paras}${list}${renderTable(s.table)}${s.note ? `<div class="nl-note">${esc(s.note)}</div>` : ''}`;
  };

  const pdfName = (nl) =>
    nl.fileName || `${String(nl.title || 'Newsletter').replace(/[^\w]+/g, '_')}_AIC_Lokichoggio_Girls.pdf`;

  const downloadBtn = (id) => `
    <div class="nl-actions">
      <button id="${id}" class="btn newsletter-download-btn">
        <i class="fas fa-file-pdf"></i> Download Newsletter (PDF)
      </button>
    </div>`;

  const renderNewsletter = (nl) => `
    ${downloadBtn('print-newsletter-top')}
    <div class="newsletter-doc" id="newsletter-doc">
      <div class="nl-head">
        <div class="nl-school">A.I.C Lokichoggio Girls' Junior School</div>
        <div class="nl-title">${esc(nl.title)}</div>
        <div class="nl-meta">${esc(nl.dateLabel)} &nbsp;•&nbsp; ${esc(nl.audience)}</div>
      </div>
      ${(nl.sections || []).map(renderSection).join('')}
      <div class="nl-signoff">
        <div class="nl-author">${esc(nl.author)}</div>
        <div class="nl-role">${esc(nl.authorRole)}</div>
      </div>
    </div>
    ${downloadBtn('print-newsletter-bottom')}`;

  let currentPdfName = 'Newsletter.pdf';

  function printNewsletter() {
    document.body.classList.add('print-newsletter');
    // Temporarily set document.title so 'Save as PDF' suggests the clean file name
    const originalTitle = document.title;
    document.title = currentPdfName.replace(/\.pdf$/i, '');
    const cleanup = () => {
      document.body.classList.remove('print-newsletter');
      document.title = originalTitle;
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => window.print(), 60);
    setTimeout(cleanup, 60000);
  }

  async function loadNewsletter() {
    const container = document.getElementById('newsletter-container');
    if (!container) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${apiBase}/announcements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const announcements = await res.json().catch(() => []);
      const newsletters = (Array.isArray(announcements) ? announcements : [])
        .filter(a => a.type === 'newsletter')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (!newsletters.length) return;
      currentPdfName = pdfName(newsletters[0]);
      container.innerHTML = renderNewsletter(newsletters[0]);
      container.querySelectorAll('.newsletter-download-btn').forEach(btn =>
        btn.addEventListener('click', (e) => { e.preventDefault(); printNewsletter(); }));
    } catch (e) {
      console.error('Newsletter load failed:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', loadNewsletter);
})();
