import { requireSession } from "@/lib/auth/guards";

export default async function NewClientPage() {
  await requireSession();
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>New client</h2>
      <form action="/api/clients" method="post" style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label>
          Name
          <input name="name" required style={{ width: "100%", padding: 8 }} />
        </label>

        <label>
          Status
          <select name="status" defaultValue="ACTIVE" style={{ width: "100%", padding: 8 }}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>

        <button type="submit">Create</button>
      </form>
    </div>
  );
}
