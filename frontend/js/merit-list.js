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

    const subjectHeaderCells = subjects
        .map(s => `<th style="padding:8px; border:1px solid #ddd; text-align:center; white-space:nowrap;">${esc(s.label)}</th>`)
        .join('');

    const bodyRows = merit.students.map((st, i) => {
        const bg = i % 2 ? '#f7f9fc' : 'transparent';
        const scoreCells = subjects.map(s => {
            const v = st.scores?.[s.key];
            return `<td style="padding:8px; border:1px solid #ddd; text-align:center;">${typeof v === 'number' ? v : '<span style="color:#9ca3af">—</span>'}</td>`;
        }).join('');
        const ind = st.indicator;
        const badge = ind
            ? `<span style="display:inline-block; padding:2px 8px; border-radius:4px; font-weight:700; font-size:11px; color:#fff; background:${MERIT_BADGE_COLORS[(ind.code || '').substring(0, 2)] || '#6b7280'};">${esc(ind.code)}</span> <span style="font-size:11px; color:#374151;">${esc(ind.label)}</span>`
            : '<span style="color:#9ca3af">—</span>';
        return `<tr style="background:${bg};">
            <td style="padding:8px; border:1px solid #ddd; text-align:center; font-weight:700;">${st.position || '—'}</td>
            <td style="padding:8px; border:1px solid #ddd; font-weight:600; white-space:nowrap;">${esc(st.name)}</td>
            <td style="padding:8px; border:1px solid #ddd; text-align:center;">${esc(st.admissionNumber) || '—'}</td>
            <td style="padding:8px; border:1px solid #ddd; text-align:center;">${esc(st.assessmentNumber) || '—'}</td>
            ${scoreCells}
            <td style="padding:8px; border:1px solid #ddd; text-align:center; font-weight:700;">${st.totalMarks || '—'}</td>
            <td style="padding:8px; border:1px solid #ddd; text-align:center; font-weight:700;">${st.meanScore !== null && st.meanScore !== undefined ? st.meanScore : '—'}</td>
            <td style="padding:8px; border:1px solid #ddd; white-space:nowrap;">${badge}</td>
        </tr>`;
    }).join('');

    resultsEl.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
                <tr style="background:#143a66; color:#fff;">
                    <th style="padding:8px; border:1px solid #143a66; text-align:center;">Pos.</th>
                    <th style="padding:8px; border:1px solid #143a66; text-align:left;">Student Name</th>
                    <th style="padding:8px; border:1px solid #143a66; text-align:center;">Adm. No.</th>
                    <th style="padding:8px; border:1px solid #143a66; text-align:center;">Assessment No. (UPI)</th>
                    ${subjectHeaderCells}
                    <th style="padding:8px; border:1px solid #143a66; text-align:center;">Total</th>
                    <th style="padding:8px; border:1px solid #143a66; text-align:center;">Mean</th>
                    <th style="padding:8px; border:1px solid #143a66; text-align:left;">Performance Indicator</th>
                </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
        </table>
        <p style="margin-top:10px; font-size:11px; color:#6b7280;">
            Indicators: EE = Exceeding Expectation, ME = Meeting Expectation, AE = Approaching Expectation, BE = Below Expectation.
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
