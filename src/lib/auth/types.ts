export type Role = "OWNER" | "ADMIN" | "MEMBER";

export type SessionPayload = {
  userId: string;
  userEmail: string;
  role: Role;
  workspaceId: string;
  iat: number;
  exp: number;
};
