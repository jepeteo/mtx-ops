import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import { ProjectRowActions } from "@/components/projects/ProjectRowActions";
import { CreateMilestoneForm } from "@/components/projects/CreateMilestoneForm";
import { MilestoneRowActions } from "@/components/projects/MilestoneRowActions";
import { UploadAttachmentForm } from "@/components/attachments/UploadAttachmentForm";
import { AttachmentLinkActions } from "@/components/attachments/AttachmentLinkActions";
import { getAttachmentPublicUrl } from "@/lib/storage/s3";

export default async function ProjectsPage() {
	const session = await requireSession();
	const canManageAttachments = session.role === "OWNER" || session.role === "ADMIN";

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

	const projectIds = projects.map((project) => project.id);
	const projectAttachmentLinks =
		projectIds.length > 0
			? await db.attachmentLink.findMany({
					where: {
						workspaceId: session.workspaceId,
						entityType: "Project",
						entityId: { in: projectIds },
					},
					include: { attachment: true },
					orderBy: { createdAt: "desc" },
					take: 500,
			  })
			: [];

	const attachmentMap = new Map<string, typeof projectAttachmentLinks>();
	for (const link of projectAttachmentLinks) {
		const existing = attachmentMap.get(link.entityId);
		if (existing) {
			existing.push(link);
		} else {
			attachmentMap.set(link.entityId, [link]);
		}
	}

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

			<section style={{ display: "grid", gap: 12 }}>
				<h3 style={{ margin: 0 }}>Project attachments</h3>
				{projects.length === 0 ? <div style={{ color: "#666" }}>Create a project to attach files.</div> : null}
				{projects.map((project) => {
					const links = attachmentMap.get(project.id) ?? [];
					return (
						<div key={project.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
							<div style={{ fontWeight: 600, marginBottom: 8 }}>
								{project.keyPrefix} · {project.name}
							</div>
							{canManageAttachments ? (
								<UploadAttachmentForm entityType="Project" entityId={project.id} />
							) : (
								<div style={{ color: "#666", marginBottom: 8 }}>Only Admin/Owner roles can upload and link attachments.</div>
							)}
							<div style={{ display: "grid", gap: 8, marginTop: 10 }}>
								{links.slice(0, 20).map((link) => {
									const fileUrl = getAttachmentPublicUrl(link.attachment.storageKey);
									return (
										<div key={link.id} style={{ border: "1px solid #f1f1f1", borderRadius: 10, padding: 10 }}>
											<div style={{ fontWeight: 600 }}>{link.label || link.attachment.fileName}</div>
											<div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
												{link.attachment.fileName} · {link.attachment.mimeType} · {(link.attachment.sizeBytes / 1024).toFixed(1)} KB
											</div>
											{canManageAttachments ? <AttachmentLinkActions linkId={link.id} /> : null}
											{fileUrl ? (
												<a href={fileUrl} target="_blank" rel="noreferrer">
													Open attachment
												</a>
											) : (
												<span style={{ color: "#666" }}>Storage public URL not configured</span>
											)}
										</div>
									);
								})}
								{links.length === 0 ? <div style={{ color: "#666" }}>No project attachments yet.</div> : null}
							</div>
						</div>
					);
				})}
			</section>
		</div>
	);
}
