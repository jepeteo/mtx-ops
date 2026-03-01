import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import Link from "next/link";

export default async function AdminUsersPage() {
	const session = await requireRole("ADMIN");

	const users = await db.user.findMany({
		where: { workspaceId: session.workspaceId },
		select: {
			id: true,
			email: true,
			name: true,
			role: true,
			status: true,
			createdAt: true,
		},
		orderBy: { createdAt: "desc" },
	});

	return (
		<div className="space-y-5">
			<div>
				<div className="text-xs font-semibold tracking-wider text-muted-foreground">ADMIN</div>
				<h1 className="mt-1 text-xl font-semibold">Users</h1>
			</div>

			<div className="flex gap-2 text-sm">
				<Link className="rounded-md border border-foreground bg-secondary px-3 py-1" href="/app/admin/users">
					Users
				</Link>
				<Link className="rounded-md border border-border px-3 py-1" href="/app/admin/operations">
					Operations
				</Link>
			</div>

			<CreateUserForm />

			<Card>
				<CardHeader>
					<CardTitle>Workspace users</CardTitle>
				</CardHeader>
				<CardContent>
					<AdminUsersTable actorId={session.userId} actorRole={session.role} users={users} />
				</CardContent>
			</Card>
		</div>
	);
}
