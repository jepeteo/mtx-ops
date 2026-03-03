import { requireSession } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewClientPage() {
  await requireSession();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/clients" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to Clients
        </Link>
        <h1 className="text-lg font-semibold">New client</h1>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-sm">Client details</CardTitle>
          <CardDescription>Create a new client record in this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/clients" method="post" className="grid gap-4">
            <div className="form-row">
              <label className="form-label">Name</label>
              <input name="name" required className="form-input" placeholder="Client name" />
            </div>

            <div className="form-row">
              <label className="form-label">Status</label>
              <select name="status" defaultValue="ACTIVE" className="form-select">
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="form-btn">Create client</button>
              <Link href="/app/clients" className="form-btn-outline">Cancel</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
