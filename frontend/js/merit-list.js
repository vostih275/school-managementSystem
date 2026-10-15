/**
 * merit-list.js — "Term Examination & Assessment Merit Schedule" (class mark list)
 * Loaded on the teacher dashboard after report-cards.js (provides apiBase,
 * showAlert and downloadFileBlob globals).
 */

const meritApiBase = `${(window.API_CONFIG?.BASE_URL || 'https://aic-school-system-c0j6.onrender.com').replace(/\/$/, '')}/api`;

const meritAlert = (msg, type) => {
    if (typeof showAlert === 'function') showAlert(msg, type);
    else if (typeof showToast === 'function') showToast(msg, type);
    else alert(msg);
};

const MERIT_BADGE_COLORS = { EE: '#198754', ME: '#0d6efd', AE: '#fd7e14', BE: '#dc3545' };

function meritSelections() {
    const className = document.getElementById('merit-class')?.value.trim() || '';
    const term = document.getElementById('merit-term')?.value.trim() || 'Term 1';
    const year = document.getElementById('merit-year')?.value.trim() || String(new Date().getFullYear());
    return { className, term, year };
}

async function generateMeritList() {
    const { className, term, year } = meritSelections();
    const resultsEl = document.getElementById('merit-list-results');
    const headerEl = document.getElementById('merit-list-header');
    const pdfBtn = document.getElementById('merit-download-pdf');
    const excelBtn = document.getElementById('merit-download-excel');
    const genBtn = document.getElementById('generate-merit-list');

    if (!className) {
        meritAlert('Please select a class first.', 'error');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        meritAlert('You are not authenticated. Please log in again.', 'error');
        return;
    }

    if (genBtn) {
        genBtn.disabled = true;
        genBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    }
    if (resultsEl) resultsEl.innerHTML = '<p style="text-align:center; padding:20px;">Loading merit list...</p>';
    if (headerEl) headerEl.style.display = 'none';
    if (pdfBtn) pdfBtn.style.display = 'none';
    if (excelBtn) excelBtn.style.display = 'none';

    try {
        const url = `${meritApiBase}/merit-list/${encodeURIComponent(className)}?term=${encodeURIComponent(term)}&year=${encodeURIComponent(year)}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.message || `Server returned ${response.status}`);
        }
        renderMeritList(payload.data);
        if (pdfBtn) pdfBtn.style.display = 'inline-block';
        if (excelBtn) excelBtn.style.display = 'inline-block';
    } catch (error) {
        console.error('Merit list error:', error);
        if (resultsEl) {
            resultsEl.innerHTML = `<p style="text-align:center; color:#dc3545; padding:20px;">${error.message}</p>`;
        }
        meritAlert(`Failed to load merit list: ${error.message}`, 'error');
    } finally {
        if (genBtn) {
            genBtn.disabled = false;
            genBtn.innerHTML = '<i class="fas fa-list-ol"></i> Generate Merit List';
        }
    }
}

function renderMeritList(merit) {
    const resultsEl = document.getElementById('merit-list-results');
    const headerEl = document.getElementById('merit-list-header');
    const subtitleEl = document.getElementById('merit-list-subtitle');
    if (!resultsEl || !merit) return;

    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const subjects = merit.subjects || [];

    if (subtitleEl) {
        subtitleEl.textContent = `${merit.schoolName || ''} — ${merit.className} • ${merit.term} ${merit.year} • ${merit.rankedCount} ranked of ${merit.classSize}`;
    }
    if (headerEl) headerEl.style.display = 'block';

    if (!merit.students || merit.students.length === 0) {
        resultsEl.innerHTML = '<p style="text-align:center; padding:20px;">No students found in this class.</p>';
        return;
    }

    // KNEC grid: top row = paper code + short name (spans Mark | L.P), second row = sub-columns
    const subjectHeaderCells = subjects
        .map(s => `<th colspan="2" style="padding:6px 4px; border:1px solid #143a66; text-align:center; white-space:nowrap;"><span style="color:#c9a227;">${esc(s.code || '')}</span> ${esc(s.short || s.label)}</th>`)
        .join('');
    const subHeaderCells = subjects
        .map(() => '<th style="padding:4px; border:1px solid #143a66; text-align:center; background:#1d4e89; font-size:10px;">Mark</th><th style="padding:4px; border:1px solid #143a66; text-align:center; background:#1d4e89; font-size:10px;">L.P</th>')
        .join('');

    const bodyRows = merit.students.map((st, i) => {
        const bg = i % 2 ? '#f7f9fc' : 'transparent';
        const scoreCells = subjects.map(s => {
            const v = st.scores?.[s.key];
            const p = st.lp?.[s.key];
            return `<td style="padding:6px; border:1px solid #ddd; text-align:center;">${typeof v === 'number' ? v : '<span style="color:#9ca3af">—</span>'}</td>` +
                   `<td style="padding:6px; border:1px solid #ddd; text-align:center; color:#143a66;">${p !== null && p !== undefined ? p : '<span style="color:#9ca3af">—</span>'}</td>`;
        }).join('');
        const lvKey = String(st.level || '').replace(/[^A-Za-z]/g, '').substring(0, 2);
        const badge = st.level
            ? `<span style="display:inline-block; padding:2px 8px; border-radius:4px; font-weight:700; font-size:11px; color:#fff; background:${MERIT_BADGE_COLORS[lvKey] || '#6b7280'};">${esc(st.level)}</span>`
            : '<span style="color:#9ca3af">—</span>';
        return `<tr style="background:${bg};">
            <td style="padding:6px; border:1px solid #ddd; font-weight:600; white-space:nowrap;">${esc(st.name)}</td>
            <td style="padding:6px; border:1px solid #ddd; text-align:center;">${esc(st.admissionNumber) || '—'}</td>
            <td style="padding:6px; border:1px solid #ddd; text-align:center;">${esc(st.assessmentNumber) || '—'}</td>
            ${scoreCells}
            <td style="padding:6px; border:1px solid #ddd; text-align:center; font-weight:700;">${st.totalMarks || '—'}</td>
            <td style="padding:6px; border:1px solid #ddd; text-align:center; font-weight:700;">${st.aggregatePoints !== null && st.aggregatePoints !== undefined ? st.aggregatePoints : '—'}</td>
            <td style="padding:6px; border:1px solid #ddd; text-align:center;">${badge}</td>
            <td style="padding:6px; border:1px solid #ddd; text-align:center; font-weight:700;">${st.position || '—'}</td>
        </tr>`;
    }).join('');

    resultsEl.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead>
                <tr style="background:#143a66; color:#fff;">
                    <th rowspan="2" style="padding:8px; border:1px solid #143a66; text-align:left;">Student Name</th>
                    <th rowspan="2" style="padding:8px; border:1px solid #143a66; text-align:center;">Adm. No.</th>
                    <th rowspan="2" style="padding:8px; border:1px solid #143a66; text-align:center;">Assessment No. (UPI)</th>
                    ${subjectHeaderCells}
                    <th rowspan="2" style="padding:8px; border:1px solid #143a66; text-align:center;">TOTAL</th>
                    <th rowspan="2" style="padding:8px; border:1px solid #143a66; text-align:center;">AG.P</th>
                    <th rowspan="2" style="padding:8px; border:1px solid #143a66; text-align:center;">LEVEL</th>
                    <th rowspan="2" style="padding:8px; border:1px solid #143a66; text-align:center;">POS</th>
                </tr>
                <tr>${subHeaderCells}</tr>
            </thead>
            <tbody>${bodyRows}</tbody>
        </table>
        <p style="margin-top:10px; font-size:11px; color:#6b7280;">
            L.P = Level Points (E.E1 = 8, E.E2 = 7, M.E1 = 6, M.E2 = 5, A.E1 = 4, A.E2 = 3, B.E1 = 2, B.E2 = 1). AG.P = total Level Points. LEVEL: E.E = Exceeding Expectation, M.E = Meeting Expectation, A.E = Approaching Expectation, B.E = Below Expectation.
        </p>`;
}

function downloadMeritListPdf() {
    const { className, term, year } = meritSelections();
    if (!className) { meritAlert('Please select a class first.', 'error'); return; }
    const url = `${meritApiBase}/merit-list/${encodeURIComponent(className)}/pdf?term=${encodeURIComponent(term)}&year=${encodeURIComponent(year)}`;
    const fileName = `MeritList_${className.replace(/[^\w]+/g, '_')}_${term.replace(/\s+/g, '')}_${year}.pdf`;
    downloadFileBlob(url, fileName, document.getElementById('merit-download-pdf'));
}

function downloadMeritListExcel() {
    const { className, term, year } = meritSelections();
    if (!className) { meritAlert('Please select a class first.', 'error'); return; }
    const url = `${meritApiBase}/merit-list/${encodeURIComponent(className)}/excel?term=${encodeURIComponent(term)}&year=${encodeURIComponent(year)}`;
    const fileName = `MeritList_${className.replace(/[^\w]+/g, '_')}_${term.replace(/\s+/g, '')}_${year}.xlsx`;
    downloadFileBlob(url, fileName, document.getElementById('merit-download-excel'));
}

document.addEventListener('DOMContentLoaded', function() {
    const yearInput = document.getElementById('merit-year');
    if (yearInput) {
        if (typeof populateAcademicYearSelect === 'function') {
            populateAcademicYearSelect(yearInput);
        } else {
            // Fallback: populate current year +/- 2 if the shared helper isn't loaded
            const currentYear = new Date().getFullYear();
            yearInput.innerHTML = '';
            for (let y = currentYear - 2; y <= currentYear + 2; y++) {
                const option = document.createElement('option');
                option.value = y;
                option.textContent = y;
                yearInput.appendChild(option);
            }
            yearInput.value = String(currentYear);
        }
    }

    const genBtn = document.getElementById('generate-merit-list');
    if (genBtn) genBtn.addEventListener('click', function(e) { e.preventDefault(); generateMeritList(); });

    const pdfBtn = document.getElementById('merit-download-pdf');
    if (pdfBtn) pdfBtn.addEventListener('click', function(e) { e.preventDefault(); downloadMeritListPdf(); });

    const excelBtn = document.getElementById('merit-download-excel');
    if (excelBtn) excelBtn.addEventListener('click', function(e) { e.preventDefault(); downloadMeritListExcel(); });
});
