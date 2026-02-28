"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Role = "OWNER" | "ADMIN" | "MEMBER";

type CreateUserResponse =
  | { ok: true; data: { user: { id: string; email: string; role: Role } } }
  | { ok: false; error: { message: string } };

export function CreateUserForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name: name || undefined, password, role }),
    });

    const body = (await response.json().catch(() => null)) as CreateUserResponse | null;
    setSaving(false);

    if (!response.ok || !body || !body.ok) {
      setError(body && !body.ok ? body.error.message : "Failed to create user");
      return;
    }

    setEmail("");
    setName("");
    setPassword("");
    setRole("MEMBER");
    window.location.reload();
  }

  return (
    <form className="grid gap-3 rounded-md border border-border bg-card p-4" onSubmit={onSubmit}>
      <div className="text-sm font-medium">Create user</div>

      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <Input placeholder="Name (optional)" value={name} onChange={(event) => setName(event.target.value)} />

      <Input
        type="password"
        placeholder="Temporary password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        minLength={8}
        required
      />

      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={role}
        onChange={(event) => setRole(event.target.value as Role)}
      >
        <option value="MEMBER">Member</option>
        <option value="ADMIN">Admin</option>
        <option value="OWNER">Owner</option>
      </select>

      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}

      <Button type="submit" disabled={saving}>
        {saving ? "Creating..." : "Create user"}
      </Button>
    </form>
  );
}
