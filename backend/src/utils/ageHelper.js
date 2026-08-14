/**
 * Helper to calculate exact age from date of birth (DOB) and validate 18+ requirement.
 */

function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function is18Plus(dob) {
  const age = calculateAge(dob);
  return age !== null && age >= 18;
}

module.exports = {
  calculateAge,
  is18Plus,
};
