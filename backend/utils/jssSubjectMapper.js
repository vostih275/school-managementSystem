const { JUNIOR_SECONDARY_SUBJECTS } = require('../config/subjects');

// Build lookup maps for fast matching by code, short name, or canonical name
const codeMap = new Map();
const shortNameMap = new Map();
const nameMap = new Map();

JUNIOR_SECONDARY_SUBJECTS.forEach(subj => {
    codeMap.set(subj.code, subj);
    shortNameMap.set(subj.shortName.toLowerCase(), subj);
    nameMap.set(subj.name.toLowerCase(), subj);
});

// Aliases commonly found in Excel sheets or alternative spellings
const aliases = {
    'mathematics': 'Maths',
    'math': 'Maths',
    'mat': 'Maths',
    'integrated science': 'Science',
    'science and technology': 'Science',
    'sci': 'Science',
    'scie': 'Science',
    'agric': 'Agriculture',
    'agriculture': 'Agriculture',
    'agr': 'Agriculture',
    'social studies': 'Social Studies',
    'sst': 'Social Studies',
    'social': 'Social Studies',
    'c.r.e': 'CRE',
    'cre': 'CRE',
    'creative arts & sports': 'Creative Arts & Sports',
    'creative arts and sports': 'Creative Arts & Sports',
    'creative arts': 'Creative Arts & Sports',
    'cas': 'Creative Arts & Sports',
    'c.a.s': 'Creative Arts & Sports',
    'pre-technical': 'Pre-Technical',
    'pre technical': 'Pre-Technical',
    'pre-tech': 'Pre-Technical',
    'pretech': 'Pre-Technical',
    'english': 'English',
    'eng': 'English',
    'kiswahili': 'Kiswahili',
    'kis': 'Kiswahili',
    'swa': 'Kiswahili'
};

const aliasMap = new Map();
Object.entries(aliases).forEach(([alias, name]) => {
    const subject = nameMap.get(name.toLowerCase());
    if (subject) {
        aliasMap.set(alias.toLowerCase(), subject);
    }
});

/**
 * Normalize a raw subject string or code from Excel/marks entry to the official subject object.
 * @param {string|number} raw - code, short name, full name, or alias
 * @returns {{code, name, shortName}|null}
 */
function normalizeSubject(raw) {
    if (raw === null || raw === undefined) return null;
    const key = String(raw).trim();
    if (key === '') return null;

    const lowerKey = key.toLowerCase();

    // Direct code match (e.g. "901")
    if (codeMap.has(key)) return codeMap.get(key);

    // Short name (e.g. "ENG") or canonical name
    if (shortNameMap.has(lowerKey)) return shortNameMap.get(lowerKey);
    if (nameMap.has(lowerKey)) return nameMap.get(lowerKey);

    // Aliases
    if (aliasMap.has(lowerKey)) return aliasMap.get(lowerKey);

    // Extract a code embedded in the string (e.g. "901 - English")
    const codeMatch = key.match(/\b(90[1-3]|905|906|907|908|911|912)\b/);
    if (codeMatch && codeMap.has(codeMatch[1])) {
        return codeMap.get(codeMatch[1]);
    }

    return null;
}

module.exports = { normalizeSubject, JUNIOR_SECONDARY_SUBJECTS };
