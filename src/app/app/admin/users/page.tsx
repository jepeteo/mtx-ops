import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserForm } from "@/components/admin/CreateUserForm";

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

			<CreateUserForm />

			<Card>
				<CardHeader>
					<CardTitle>Workspace users</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="text-muted-foreground">
									<th className="py-2">Email</th>
									<th className="py-2">Name</th>
									<th className="py-2">Role</th>
									<th className="py-2">Status</th>
									<th className="py-2">Created</th>
								</tr>
							</thead>
							<tbody>
								{users.map((user) => (
									<tr key={user.id} className="border-t border-border">
										<td className="py-2">{user.email}</td>
										<td className="py-2">{user.name ?? "-"}</td>
										<td className="py-2">{user.role}</td>
										<td className="py-2">{user.status}</td>
										<td className="py-2">{new Date(user.createdAt).toLocaleString()}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
