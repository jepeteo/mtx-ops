import { requireAuth } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Logged in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <div>Email: {session.userEmail}</div>
          <div>Role: {session.role}</div>
          <div>Workspace: {session.workspaceId}</div>
        </CardContent>
      </Card>
    </div>
  );
}
