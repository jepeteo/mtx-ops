import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";

export default async function ProjectsPage() {
	const session = await requireSession();

	const [projects, clients] = await Promise.all([
		db.project.findMany({
			where: { workspaceId: session.workspaceId },
			include: {
				client: {
					select: {
						id: true,
						name: true,
					},
				},
				_count: {
					select: {
						tasks: true,
					},
				},
			},
			orderBy: [{ updatedAt: "desc" }],
			take: 200,
		}),
		db.client.findMany({
			where: { workspaceId: session.workspaceId },
			select: { id: true, name: true },
			orderBy: { name: "asc" },
			take: 200,
		}),
	]);

	return (
		<div style={{ display: "grid", gap: 18 }}>
			<div>
				<h2 style={{ marginTop: 0, marginBottom: 6 }}>Projects</h2>
				<p style={{ color: "#666", margin: 0 }}>Workspace projects with key prefixes and scoped task context.</p>
			</div>

			<CreateProjectForm clients={clients} />

			<div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr style={{ textAlign: "left", background: "#fafafa" }}>
							<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Project</th>
							<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Prefix</th>
							<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Client</th>
							<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Status</th>
							<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Tasks</th>
						</tr>
					</thead>
					<tbody>
						{projects.map((project) => (
							<tr key={project.id}>
								<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1", fontWeight: 500 }}>{project.name}</td>
								<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{project.keyPrefix}</td>
								<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
									<Link href={`/app/clients/${project.client.id}`}>{project.client.name}</Link>
								</td>
								<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{project.status}</td>
								<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{project._count.tasks}</td>
							</tr>
						))}
						{projects.length === 0 ? (
							<tr>
								<td colSpan={5} style={{ padding: 14, color: "#666" }}>
									No projects yet.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</div>
	);
}
