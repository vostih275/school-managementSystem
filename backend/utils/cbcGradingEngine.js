/**
 * CBC Grading Engine — Dual-mode grading for Kenyan Curriculum
 *
 * Modes:
 *   4-tier  → Pre-Primary (Baby Class, PP1, PP2) & Lower Primary (Grade 1–6)
 *              Rubric descriptors: EE | ME | AE | BE  (no numerical percentages)
 *   8-tier  → Junior Secondary (Grade 7–9)
 *              KJSEA percentage-based scale (re-exported from kjseaGrading.js)
 */

const kjsea = require('./kjseaGrading');

// ---------------------------------------------------------------------------
// Class-level detection
// ---------------------------------------------------------------------------

/**
 * Classes that use the 4-tier rubric (no marks/ranking allowed by KNEC policy)
 */
const PRIMARY_CLASSES = new Set([
    'baby class', 'pp1', 'pp2',
    'grade 1', 'grade 2', 'grade 3',
    'grade 4', 'grade 5', 'grade 6'
]);

/**
 * Returns 'primary' (4-tier) or 'jss' (8-tier) based on class name string.
 * Comparison is case-insensitive.
 */
const detectGradingScale = (className = '') => {
    if (!className) return 'jss';
    return PRIMARY_CLASSES.has(className.trim().toLowerCase()) ? 'primary' : 'jss';
};

// ---------------------------------------------------------------------------
// 4-Tier rubric constants & helpers
// ---------------------------------------------------------------------------

/**
 * Ordered tiers from highest to lowest (used for aggregate logic)
 */
const FOUR_TIER_ORDER = ['EE', 'ME', 'AE', 'BE'];

const FOUR_TIER_LABELS = {
    EE: 'Exceeding Expectation',
    ME: 'Meeting Expectation',
    AE: 'Approaching Expectation',
    BE: 'Below Expectation'
};

/**
 * Validate that a value is a legal 4-tier descriptor.
 */
const isValidRubric = (val) => FOUR_TIER_ORDER.includes(String(val).toUpperCase());

/**
 * Normalise a rubric string to uppercase, or return null if invalid.
 */
const normaliseRubric = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const u = String(val).toUpperCase().trim();
    return FOUR_TIER_ORDER.includes(u) ? u : null;
};

/**
 * Aggregate rule for two 4-tier rubric scores (KNEC CBC Primary policy):
 *
 *   Both the same        → that tier
 *   EE + ME or ME + EE  → EE   (strong average with effort)
 *   ME + AE or AE + ME  → ME   (central performance)
 *   AE + BE or BE + AE  → AE
 *   EE + AE / AE + EE  → ME   (wide spread — settle at middle)
 *   EE + BE / BE + EE  → AE   (extreme spread)
 *   ME + BE / BE + ME  → AE
 *   Single score only   → that score
 *
 * Returns: 'EE' | 'ME' | 'AE' | 'BE' | null
 */
const RUBRIC_AGGREGATE_TABLE = {
    'EE-EE': 'EE',
    'ME-ME': 'ME',
    'AE-AE': 'AE',
    'BE-BE': 'BE',
    'EE-ME': 'EE',  'ME-EE': 'EE',
    'ME-AE': 'ME',  'AE-ME': 'ME',
    'AE-BE': 'AE',  'BE-AE': 'AE',
    'EE-AE': 'ME',  'AE-EE': 'ME',
    'EE-BE': 'AE',  'BE-EE': 'AE',
    'ME-BE': 'AE',  'BE-ME': 'AE'
};

/**
 * Calculate the aggregate rubric for two Primary assessments.
 * Either or both may be null/undefined (only one assessment entered mid-term).
 *
 * @param {string|null} a1 - Assessment 1 rubric ('EE','ME','AE','BE' or null)
 * @param {string|null} a2 - Assessment 2 rubric ('EE','ME','AE','BE' or null)
 * @returns {{ rubric: string, label: string } | null}
 */
const calculatePrimaryGrade = (a1, a2) => {
    const r1 = normaliseRubric(a1);
    const r2 = normaliseRubric(a2);

    if (!r1 && !r2) return null;
    if (r1 && !r2) return { rubric: r1, label: FOUR_TIER_LABELS[r1] };
    if (!r1 && r2) return { rubric: r2, label: FOUR_TIER_LABELS[r2] };

    const key = `${r1}-${r2}`;
    const result = RUBRIC_AGGREGATE_TABLE[key] || null;
    if (!result) return null;
    return { rubric: result, label: FOUR_TIER_LABELS[result] };
};

/**
 * Determine the overall competency label for a student's set of rubric results
 * across all learning areas. Uses simple majority / lowest boundary logic:
 *
 *   All EE             → 'EE'
 *   Mostly EE/ME       → 'ME'
 *   Mostly AE or mixed → 'AE'
 *   Any BE present     → 'BE' (floor)
 *
 * @param {string[]} rubrics - Array of per-subject rubric codes
 * @returns {{ rubric: string, label: string } | null}
 */
const calculateOverallCompetency = (rubrics) => {
    const valid = rubrics.map(r => normaliseRubric(r)).filter(Boolean);
    if (valid.length === 0) return null;

    // Count occurrences
    const counts = { EE: 0, ME: 0, AE: 0, BE: 0 };
    for (const r of valid) counts[r]++;

    // BE floor: if any BE present, overall is at most AE
    if (counts.BE > 0) {
        const majority = counts.AE >= counts.ME ? 'AE' : 'ME';
        const result = counts.BE >= valid.length / 2 ? 'BE' : majority;
        return { rubric: result, label: FOUR_TIER_LABELS[result] };
    }

    // No BE: pick highest majority
    const order = ['EE', 'ME', 'AE'];
    let best = 'AE';
    for (const tier of order) {
        if (counts[tier] >= valid.length / 2) { best = tier; break; }
    }
    return { rubric: best, label: FOUR_TIER_LABELS[best] };
};

// ---------------------------------------------------------------------------
// Re-export 8-tier (KJSEA) functions unchanged for backward compatibility
// ---------------------------------------------------------------------------

module.exports = {
    // Mode detection
    detectGradingScale,
    PRIMARY_CLASSES,

    // 4-tier primary helpers
    FOUR_TIER_ORDER,
    FOUR_TIER_LABELS,
    isValidRubric,
    normaliseRubric,
    calculatePrimaryGrade,
    calculateOverallCompetency,

    // 8-tier KJSEA (re-exported)
    KJSEA_TIER_MAP: kjsea.KJSEA_TIER_MAP,
    OVERALL_GRADE_MAP: kjsea.OVERALL_GRADE_MAP,
    percentageToTier: kjsea.percentageToTier,
    totalMarksToGrade: kjsea.totalMarksToGrade,
    calculateAverage: kjsea.calculateAverage,
    formatTier: kjsea.formatTier,
    formatOverallGrade: kjsea.formatOverallGrade
};
