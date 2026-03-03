"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

type Role = "OWNER" | "ADMIN" | "MEMBER";
type UserStatus = "ACTIVE" | "DISABLED";

type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: string;
  createdAt: Date;
};

type AdminUsersTableProps = {
  actorId: string;
  actorRole: Role;
  users: UserRecord[];
};

type ErrorEnvelope = {
  ok: false;
  error: {
    message: string;
  };
};

function canManageUser(actorRole: Role, targetRole: Role) {
  if (actorRole === "OWNER") return true;
  return targetRole === "MEMBER";
}

function roleOptions(actorRole: Role): Role[] {
  if (actorRole === "OWNER") return ["MEMBER", "ADMIN", "OWNER"];
  return ["MEMBER", "ADMIN"];
}

function roleBadge(role: Role) {
  const colors: Record<Role, string> = {
    OWNER: "bg-primary/15 text-primary",
    ADMIN: "bg-warning/15 text-warning",
    MEMBER: "bg-secondary text-muted-foreground",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${colors[role]}`}>
      {role}
    </span>
  );
}

function UserActionsRow({
  user,
  actorRole,
  actorId,
}: {
  user: UserRecord;
  actorRole: Role;
  actorId: string;
}) {
  const [nextRole, setNextRole] = useState<Role>(user.role);
  const [savingRole, setSavingRole] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRole = user.role as Role;
  const userStatus = (user.status === "DISABLED" ? "DISABLED" : "ACTIVE") as UserStatus;
  const canManage = canManageUser(actorRole, userRole);
  const canDisableSelf = user.id === actorId;

  async function updateUser(payload: { role?: Role; status?: UserStatus }) {
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ErrorEnvelope | null;
      setError(body && !body.ok ? body.error.message : "Update failed");
      return false;
    }

    setError(null);
    window.location.reload();
    return true;
  }

  async function onSaveRole() {
    setSavingRole(true);
    await updateUser({ role: nextRole });
    setSavingRole(false);
  }

  async function onToggleStatus() {
    setSavingStatus(true);
    await updateUser({ status: userStatus === "ACTIVE" ? "DISABLED" : "ACTIVE" });
    setSavingStatus(false);
  }

  async function onResetPassword() {
    const nextPassword = window.prompt("Enter temporary password (min 8 chars)");
    if (!nextPassword) return;

    setSavingPassword(true);

    const response = await fetch(`/api/admin/users/${user.id}/password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: nextPassword }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ErrorEnvelope | null;
      setError(body && !body.ok ? body.error.message : "Password reset failed");
      setSavingPassword(false);
      return;
    }

    setSavingPassword(false);
    setError(null);
  }

  return (
    <tr>
      <td className="font-medium">{user.email}</td>
      <td>{user.name ?? <span className="text-muted-foreground">—</span>}</td>
      <td>{roleBadge(userRole)}</td>
      <td><StatusPill status={userStatus} /></td>
      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
      <td>
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            className="form-select h-7 text-xs"
            value={nextRole}
            onChange={(event) => setNextRole(event.target.value as Role)}
            disabled={!canManage || savingRole}
          >
            {roleOptions(actorRole).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <Button size="sm" variant="outline" onClick={onSaveRole} disabled={!canManage || savingRole || nextRole === userRole}>
            {savingRole ? "Saving…" : "Save role"}
          </Button>

          <Button
            size="sm"
            variant={userStatus === "ACTIVE" ? "destructive" : "secondary"}
            onClick={onToggleStatus}
            disabled={!canManage || savingStatus || (canDisableSelf && userStatus === "ACTIVE")}
          >
            {savingStatus ? "Updating…" : userStatus === "ACTIVE" ? "Disable" : "Activate"}
          </Button>

          <Button size="sm" variant="ghost" onClick={onResetPassword} disabled={!canManage || savingPassword}>
            {savingPassword ? "Resetting…" : "Reset password"}
          </Button>
        </div>
        {error ? <div className="mt-1 text-xs text-destructive">{error}</div> : null}
      </td>
    </tr>
  );
}

export function AdminUsersTable({ actorId, actorRole, users }: AdminUsersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserActionsRow key={user.id} user={user} actorRole={actorRole} actorId={actorId} />
          ))}
          {users.length === 0 && (
            <tr><td colSpan={6} className="empty-state">No users found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
