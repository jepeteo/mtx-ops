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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Paperclip } from "lucide-react";

export default async function ProjectsPage() {
	const session = await requireSession();
	const canManageAttachments = session.role === "OWNER" || session.role === "ADMIN";

	const [projects, clients, milestones] = await Promise.all([
		db.project.findMany({
			where: { workspaceId: session.workspaceId },
			include: {
				client: { select: { id: true, name: true } },
				_count: { select: { tasks: true } },
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
				project: { select: { id: true, name: true, keyPrefix: true } },
			},
			orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
			take: 200,
		}),
	]);

	const projectIds = projects.map((p) => p.id);
	const projectAttachmentLinks =
		projectIds.length > 0
			? await db.attachmentLink.findMany({
					where: { workspaceId: session.workspaceId, entityType: "Project", entityId: { in: projectIds } },
					include: { attachment: true },
					orderBy: { createdAt: "desc" },
					take: 500,
			  })
			: [];

	const attachmentMap = new Map<string, typeof projectAttachmentLinks>();
	for (const link of projectAttachmentLinks) {
		const existing = attachmentMap.get(link.entityId);
		if (existing) existing.push(link);
		else attachmentMap.set(link.entityId, [link]);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-lg font-semibold">Projects</h1>
				<p className="text-sm text-muted-foreground">Workspace projects with key prefixes and scoped task context</p>
			</div>

			<CreateProjectForm clients={clients} />

			<Card>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<table className="data-table">
							<thead>
								<tr>
									<th>Project</th>
									<th>Prefix</th>
									<th>Client</th>
									<th>Status</th>
									<th>Tasks</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{projects.map((project) => (
									<tr key={project.id}>
										<td className="font-medium">{project.name}</td>
										<td><code className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{project.keyPrefix}</code></td>
										<td>
											<Link href={`/app/clients/${project.client.id}`} className="text-foreground hover:text-primary">{project.client.name}</Link>
										</td>
										<td><StatusPill status={project.status} /></td>
										<td>{project._count.tasks}</td>
										<td className="min-w-[300px]">
											<ProjectRowActions projectId={project.id} name={project.name} keyPrefix={project.keyPrefix} status={project.status} />
										</td>
									</tr>
								))}
								{projects.length === 0 && (
									<tr><td colSpan={6} className="empty-state">No projects yet.</td></tr>
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			<CreateMilestoneForm projects={projects.map((p) => ({ id: p.id, name: p.name, keyPrefix: p.keyPrefix }))} />

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Milestones</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<table className="data-table">
							<thead>
								<tr>
									<th>Milestone</th>
									<th>Project</th>
									<th>Due</th>
									<th>Status</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{milestones.map((m) => (
									<tr key={m.id}>
										<td className="font-medium">{m.title}</td>
										<td><code className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{m.project.keyPrefix}</code> {m.project.name}</td>
										<td>{m.dueAt ? new Date(m.dueAt).toLocaleDateString() : "—"}</td>
										<td><StatusPill status={m.status} /></td>
										<td className="min-w-[320px]">
											<MilestoneRowActions milestoneId={m.id} title={m.title} dueAt={m.dueAt ? m.dueAt.toISOString() : null} status={m.status} />
										</td>
									</tr>
								))}
								{milestones.length === 0 && (
									<tr><td colSpan={5} className="empty-state">No milestones yet.</td></tr>
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			<section className="space-y-3">
				<h2 className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4 text-muted-foreground" /> Project attachments</h2>
				{projects.length === 0 && <div className="text-sm text-muted-foreground">Create a project to attach files.</div>}
				<div className="grid gap-3">
					{projects.map((project) => {
						const links = attachmentMap.get(project.id) ?? [];
						return (
							<Card key={project.id}>
								<CardHeader className="pb-2">
									<CardTitle className="text-sm">{project.keyPrefix} · {project.name}</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{canManageAttachments ? (
										<UploadAttachmentForm entityType="Project" entityId={project.id} />
									) : (
										<div className="text-xs text-muted-foreground">Only Admin/Owner roles can upload and link attachments.</div>
									)}
									{links.length > 0 ? (
										<div className="grid gap-2">
											{links.slice(0, 20).map((link) => {
												const fileUrl = getAttachmentPublicUrl(link.attachment.storageKey);
												return (
													<div key={link.id} className="flex items-start justify-between rounded-md border border-border px-3 py-2">
														<div>
															<div className="text-sm font-medium">{link.label || link.attachment.fileName}</div>
															<div className="text-[11px] text-muted-foreground">{link.attachment.fileName} · {link.attachment.mimeType} · {(link.attachment.sizeBytes / 1024).toFixed(1)} KB</div>
														</div>
														<div className="flex items-center gap-2">
															{canManageAttachments && <AttachmentLinkActions linkId={link.id} />}
															{fileUrl ? <a href={fileUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">Open</a> : <span className="text-[11px] text-muted-foreground">No public URL</span>}
														</div>
													</div>
												);
											})}
										</div>
									) : (
										<div className="empty-state text-center">No project attachments yet.</div>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			</section>
		</div>
	);
}
