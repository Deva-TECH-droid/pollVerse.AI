function getDisplayName(email, name) {
  if (name && name.trim()) return name.trim();
  const local = email.split('@')[0];
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = { getDisplayName };
