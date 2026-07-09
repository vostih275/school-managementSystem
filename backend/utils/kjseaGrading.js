/**
 * KJSEA (Kenya Junior Secondary Education Assessment) Grading System
 * 8-Tier Scale for CBC Assessment
 */

// KJSEA 8-Tier Scale mapping
const KJSEA_TIER_MAP = [
    { min: 1, max: 10, points: 1, level: 0.5, code: 'BE', suffix: '2', label: 'Below Expectation' },
    { min: 11, max: 20, points: 2, level: 1.0, code: 'BE', suffix: '1', label: 'Below Expectation' },
    { min: 21, max: 30, points: 3, level: 1.5, code: 'AE', suffix: '2', label: 'Approaching Expectation' },
    { min: 31, max: 40, points: 4, level: 2.0, code: 'AE', suffix: '1', label: 'Approaching Expectation' },
    { min: 41, max: 57, points: 5, level: 2.5, code: 'ME', suffix: '2', label: 'Meeting Expectation' },
    { min: 58, max: 74, points: 6, level: 3.0, code: 'ME', suffix: '1', label: 'Meeting Expectation' },
    { min: 75, max: 89, points: 7, level: 3.5, code: 'EE', suffix: '2', label: 'Exceeding Expectation' },
    { min: 90, max: 100, points: 8, level: 4.0, code: 'EE', suffix: '1', label: 'Exceeding Expectation' }
];

// Overall Grading Scale for Total Marks (sum of all subject averages)
const OVERALL_GRADE_MAP = [
    { min: 1, max: 113, code: 'BE', suffix: '2', label: 'Below Expectation' },
    { min: 114, max: 226, code: 'BE', suffix: '1', label: 'Below Expectation' },
    { min: 227, max: 339, code: 'AE', suffix: '2', label: 'Approaching Expectation' },
    { min: 340, max: 452, code: 'AE', suffix: '1', label: 'Approaching Expectation' },
    { min: 453, max: 565, code: 'ME', suffix: '2', label: 'Meeting Expectation' },
    { min: 566, max: 678, code: 'ME', suffix: '1', label: 'Meeting Expectation' },
    { min: 679, max: 791, code: 'EE', suffix: '2', label: 'Exceeding Expectation' },
    { min: 792, max: 900, code: 'EE', suffix: '1', label: 'Exceeding Expectation' }
];

/**
 * Convert percentage (0-100) to KJSEA tier info
 */
const percentageToTier = (percentage) => {
    if (percentage === null || percentage === undefined || isNaN(percentage)) {
        return null;
    }
    const p = Math.max(0, Math.min(100, percentage));
    return KJSEA_TIER_MAP.find(tier => p >= tier.min && p <= tier.max) || null;
};

/**
 * Convert total marks to overall grade
 */
const totalMarksToGrade = (totalMarks) => {
    if (totalMarks === null || totalMarks === undefined || isNaN(totalMarks)) {
        return null;
    }
    const t = Math.max(0, Math.min(900, totalMarks));
    return OVERALL_GRADE_MAP.find(grade => t >= grade.min && t <= grade.max) || null;
};

/**
 * Calculate average of two assessment scores
 */
const calculateAverage = (score1, score2) => {
    const validScores = [score1, score2].filter(s => s !== null && s !== undefined && !isNaN(s));
    if (validScores.length === 0) return null;
    return Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100;
};

/**
 * Format tier as string (e.g., "EE 1", "ME 2")
 */
const formatTier = (tier) => {
    if (!tier) return 'N/A';
    return `${tier.code} ${tier.suffix}`;
};

/**
 * Format overall grade as string (e.g., "EE-1", "ME-2")
 */
const formatOverallGrade = (grade) => {
    if (!grade) return 'N/A';
    return `${grade.code}-${grade.suffix}`;
};

module.exports = {
    KJSEA_TIER_MAP,
    OVERALL_GRADE_MAP,
    percentageToTier,
    totalMarksToGrade,
    calculateAverage,
    formatTier,
    formatOverallGrade
};
