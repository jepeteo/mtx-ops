import type { Role } from "./types";

const ROLE_ORDER: Record<Role, number> = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function hasMinRole(currentRole: Role, minRole: Role) {
  return ROLE_ORDER[currentRole] >= ROLE_ORDER[minRole];
}
