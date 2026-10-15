const { buildMeritList, generateMeritListPdf } = require('../services/meritListService');
const { buildMeritListWorkbook } = require('../services/reportExportService');

const safeFilePart = (s) => String(s || '').replace(/[^\w]+/g, '_');

/**
 * Shared loader — validates params and builds the merit list.
 * Sends the error response itself and returns null on failure.
 */
const loadMeritList = async (req, res) => {
    const { className } = req.params;
    const { term, year, academicYear } = req.query;

    if (!className) {
        res.status(400).json({ success: false, message: 'className is required' });
        return null;
    }

    const merit = await buildMeritList(className, term || 'Term 1', academicYear || year);
    if (!merit) {
        res.status(404).json({
            success: false,
            message: `No students found in class "${className}".`
        });
        return null;
    }
    return merit;
};

// @desc    Class merit list ("Term Examination & Assessment Merit Schedule") as JSON
// @route   GET /api/merit-list/:className?term=Term 1&year=2026
// @access  Private (Teacher/Admin)
exports.getMeritList = async (req, res) => {
    try {
        const merit = await loadMeritList(req, res);
        if (!merit) return;
        res.json({ success: true, data: merit });
    } catch (error) {
        console.error('Error building merit list:', error);
        res.status(500).json({ success: false, message: 'Server error building merit list', error: error.message });
    }
};

// @desc    Download the merit list as PDF
// @route   GET /api/merit-list/:className/pdf?term=Term 1&year=2026
// @access  Private (Teacher/Admin)
exports.downloadMeritListPdf = async (req, res) => {
    try {
        const merit = await loadMeritList(req, res);
        if (!merit) return;
        const pdfBuffer = await generateMeritListPdf(merit);
        const fileName = `MeritList_${safeFilePart(merit.className)}_${safeFilePart(merit.term)}_${merit.year}.pdf`;
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating merit list PDF:', error);
        res.status(500).json({ success: false, message: 'Server error generating merit list PDF', error: error.message });
    }
};

// @desc    Download the merit list as Excel (XLSX)
// @route   GET /api/merit-list/:className/excel?term=Term 1&year=2026
// @access  Private (Teacher/Admin)
exports.downloadMeritListExcel = async (req, res) => {
    try {
        const merit = await loadMeritList(req, res);
        if (!merit) return;
        const buffer = buildMeritListWorkbook(merit);
        const fileName = `MeritList_${safeFilePart(merit.className)}_${safeFilePart(merit.term)}_${merit.year}.xlsx`;
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': buffer.length
        });
        res.send(buffer);
    } catch (error) {
        console.error('Error generating merit list Excel:', error);
        res.status(500).json({ success: false, message: 'Server error generating merit list Excel', error: error.message });
    }
};
