// Admin email whitelist
const ADMIN_EMAILS = [
  'brendan.stanton@gmail.com',
  'brendan@nysgpt.com'
];

/**
 * Check if a user has admin privileges based on their email
 */
export const isAdmin = (email: string | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
