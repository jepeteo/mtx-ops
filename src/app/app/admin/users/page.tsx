import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent } from "@/components/ui/card";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import Link from "next/link";

export default async function AdminUsersPage() {
	const session = await requireRole("ADMIN");

	const users = await db.user.findMany({
		where: { workspaceId: session.workspaceId },
		select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
		orderBy: { createdAt: "desc" },
	});

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-lg font-semibold">Users</h1>
				<p className="text-sm text-muted-foreground">Manage workspace users, roles, and access</p>
			</div>

			<nav className="tab-bar">
				<Link href="/app/admin/users" className="active">Users</Link>
				<Link href="/app/admin/operations">Operations</Link>
				<Link href="/app/admin/activity">Activity</Link>
			</nav>

			<CreateUserForm />

			<Card>
				<CardContent className="p-0">
					<AdminUsersTable actorId={session.userId} actorRole={session.role} users={users} />
				</CardContent>
			</Card>
		</div>
	);
}
