// Generates auto-generated login credentials for a teacher.
// Rules:
//   Email:    full name without titles, lowercased and de-spaced + "@gmail.com"
//   Password: lowercased first name without titles + "1234!"

const TITLES = ['Mrs', 'Mdm', 'Mr', 'Ms', 'Dr', 'Prof'];
const TITLE_REGEX = new RegExp(`^(${TITLES.join('|')})\\.?\\s*`, 'i');

function normalizeName(name) {
  if (!name) return '';
  return name.replace(TITLE_REGEX, '').trim();
}

function generateTeacherEmail(name) {
  const clean = normalizeName(name).toLowerCase().replace(/\s+/g, '');
  return `${clean}@gmail.com`;
}

function generateTeacherPassword(name) {
  const clean = normalizeName(name);
  const firstName = clean.split(/\s+/)[0].toLowerCase();
  return `${firstName}1234!`;
}

function generateTeacherCredentials(name) {
  return {
    email: generateTeacherEmail(name),
    password: generateTeacherPassword(name)
  };
}

module.exports = {
  normalizeName,
  generateTeacherEmail,
  generateTeacherPassword,
  generateTeacherCredentials
};
