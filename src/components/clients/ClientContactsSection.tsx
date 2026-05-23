"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserRound } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  notes: string | null;
};

export function ClientContactsSection({ clientId }: { clientId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/contacts`, { cache: "no-store" });
    const body = (await res.json().catch(() => null)) as
      | { ok: true; data: { contacts: Contact[] } }
      | { ok: false; error?: { message?: string } }
      | null;
    if (!res.ok || !body || !body.ok) {
      setError(body && !body.ok ? body.error?.message ?? "Failed to load contacts" : "Failed to load contacts");
      setContacts([]);
      return;
    }
    setError(null);
    setContacts(body.data.contacts);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/clients/${clientId}/contacts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        role: role.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        isPrimary,
      }),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null;
    setSaving(false);
    if (!res.ok || !body?.ok) {
      setError(body?.error?.message ?? "Create failed");
      return;
    }
    setName("");
    setRole("");
    setEmail("");
    setPhone("");
    setIsPrimary(false);
    await load();
  }

  async function setPrimary(contactId: string) {
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    if (res.ok) await load();
  }

  async function onDelete(contact: Contact) {
    if (!window.confirm(`Delete contact ${contact.name}?`)) return;
    const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null;
    if (!res.ok) {
      window.alert(body?.error?.message ?? "Delete failed");
      return;
    }
    await load();
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <UserRound className="h-4 w-4 text-muted-foreground" /> Contacts
      </h2>
      <form onSubmit={onCreate} className="grid max-w-3xl gap-2 rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-semibold">Add contact</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="Name" required />
          <input value={role} onChange={(e) => setRole(e.target.value)} className="form-input" placeholder="Role" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="Email" type="email" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" placeholder="Phone" />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
          Primary contact (invoice email default)
        </label>
        <Button type="submit" className="w-fit" disabled={saving}>
          {saving ? "Saving…" : "Add contact"}
        </Button>
      </form>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Primary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td className="font-medium">{contact.name}</td>
                    <td>{contact.role || "—"}</td>
                    <td>{contact.email || "—"}</td>
                    <td>{contact.phone || "—"}</td>
                    <td>{contact.isPrimary ? "Yes" : "—"}</td>
                    <td>
                      <div className="flex gap-1">
                        {!contact.isPrimary ? (
                          <button type="button" className="form-btn-outline h-7 px-2 text-xs" onClick={() => setPrimary(contact.id)}>
                            Set primary
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="form-btn-outline h-7 px-2 text-xs text-destructive"
                          onClick={() => onDelete(contact)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      No contacts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {error ? <div className="p-4 text-xs font-medium text-destructive">{error}</div> : null}
        </CardContent>
      </Card>
    </section>
  );
}
