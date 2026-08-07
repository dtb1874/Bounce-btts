export const MEMBER_EMAIL_DOMAIN = "members.bouncebtts.app";

export function normaliseUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function usernameToEmail(username: string) {
  return `${normaliseUsername(username)}@${MEMBER_EMAIL_DOMAIN}`;
}
