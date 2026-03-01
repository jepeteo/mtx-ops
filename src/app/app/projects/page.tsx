import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import { ProjectRowActions } from "@/components/projects/ProjectRowActions";
import { CreateMilestoneForm } from "@/components/projects/CreateMilestoneForm";
import { MilestoneRowActions } from "@/components/projects/MilestoneRowActions";

export default async function ProjectsPage() {
	const session = await requireSession();

	const [projects, clients, milestones] = await Promise.all([
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
		db.milestone.findMany({
			where: { workspaceId: session.workspaceId },
			include: {
				project: {
					select: {
						id: true,
						name: true,
						keyPrefix: true,
					},
				},
			},
			orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
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
							<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Actions</th>
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
								<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1", minWidth: 300 }}>
									<ProjectRowActions
										projectId={project.id}
										name={project.name}
										keyPrefix={project.keyPrefix}
										status={project.status}
									/>
								</td>
							</tr>
						))}
						{projects.length === 0 ? (
							<tr>
								<td colSpan={6} style={{ padding: 14, color: "#666" }}>
									No projects yet.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>

			<CreateMilestoneForm projects={projects.map((project) => ({ id: project.id, name: project.name, keyPrefix: project.keyPrefix }))} />

			<div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr style={{ textAlign: "left", background: "#fafafa" }}>
							<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Milestone</th>
							<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Project</th>
							<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Due</th>
							<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Status</th>
							<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Actions</th>
						</tr>
					</thead>
					<tbody>
						{milestones.map((milestone) => (
							<tr key={milestone.id}>
								<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1", fontWeight: 500 }}>{milestone.title}</td>
								<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
									{milestone.project.keyPrefix} · {milestone.project.name}
								</td>
								<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
									{milestone.dueAt ? new Date(milestone.dueAt).toLocaleDateString() : "—"}
								</td>
								<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{milestone.status}</td>
								<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1", minWidth: 320 }}>
									<MilestoneRowActions
										milestoneId={milestone.id}
										title={milestone.title}
										dueAt={milestone.dueAt ? milestone.dueAt.toISOString() : null}
										status={milestone.status}
									/>
								</td>
							</tr>
						))}
						{milestones.length === 0 ? (
							<tr>
								<td colSpan={5} style={{ padding: 14, color: "#666" }}>
									No milestones yet.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</div>
	);
}
