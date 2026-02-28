"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    <tr className="border-t border-border">
      <td className="py-2">{user.email}</td>
      <td className="py-2">{user.name ?? "-"}</td>
      <td className="py-2">{userRole}</td>
      <td className="py-2">{userStatus}</td>
      <td className="py-2">{new Date(user.createdAt).toLocaleString()}</td>
      <td className="py-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={nextRole}
            onChange={(event) => setNextRole(event.target.value as Role)}
            disabled={!canManage || savingRole}
          >
            {roleOptions(actorRole).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <Button size="sm" variant="outline" onClick={onSaveRole} disabled={!canManage || savingRole || nextRole === userRole}>
            {savingRole ? "Saving..." : "Save role"}
          </Button>

          <Button
            size="sm"
            variant={userStatus === "ACTIVE" ? "destructive" : "secondary"}
            onClick={onToggleStatus}
            disabled={!canManage || savingStatus || (canDisableSelf && userStatus === "ACTIVE")}
          >
            {savingStatus ? "Updating..." : userStatus === "ACTIVE" ? "Disable" : "Activate"}
          </Button>

          <Button size="sm" variant="ghost" onClick={onResetPassword} disabled={!canManage || savingPassword}>
            {savingPassword ? "Resetting..." : "Reset password"}
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
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-2">Email</th>
            <th className="py-2">Name</th>
            <th className="py-2">Role</th>
            <th className="py-2">Status</th>
            <th className="py-2">Created</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserActionsRow key={user.id} user={user} actorRole={actorRole} actorId={actorId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
