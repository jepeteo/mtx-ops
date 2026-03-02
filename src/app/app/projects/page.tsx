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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
		<div className="space-y-5">
			<div>
				<div className="text-xs font-semibold tracking-wider text-muted-foreground">DELIVERY</div>
				<h1 className="mt-1 text-xl font-semibold">Projects</h1>
				<p className="mt-1 text-sm text-muted-foreground">Workspace projects with key prefixes and scoped task context.</p>
			</div>

			<CreateProjectForm clients={clients} />

			<Card>
				<CardHeader>
					<CardTitle>Projects</CardTitle>
				</CardHeader>
				<CardContent className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<thead>
						<tr className="text-muted-foreground">
							<th className="py-2">Project</th>
							<th className="py-2">Prefix</th>
							<th className="py-2">Client</th>
							<th className="py-2">Status</th>
							<th className="py-2">Tasks</th>
							<th className="py-2">Actions</th>
						</tr>
					</thead>
					<tbody>
						{projects.map((project) => (
							<tr key={project.id} className="border-t border-border">
								<td className="py-2 font-medium">{project.name}</td>
								<td className="py-2">{project.keyPrefix}</td>
								<td className="py-2">
									<Link href={`/app/clients/${project.client.id}`}>{project.client.name}</Link>
								</td>
								<td className="py-2">{project.status}</td>
								<td className="py-2">{project._count.tasks}</td>
								<td className="min-w-[300px] py-2">
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
								<td colSpan={6} className="py-4 text-muted-foreground">
									No projects yet.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
				</CardContent>
			</Card>

			<CreateMilestoneForm projects={projects.map((project) => ({ id: project.id, name: project.name, keyPrefix: project.keyPrefix }))} />

			<Card>
				<CardHeader>
					<CardTitle>Milestones</CardTitle>
				</CardHeader>
				<CardContent className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<thead>
						<tr className="text-muted-foreground">
							<th className="py-2">Milestone</th>
							<th className="py-2">Project</th>
							<th className="py-2">Due</th>
							<th className="py-2">Status</th>
							<th className="py-2">Actions</th>
						</tr>
					</thead>
					<tbody>
						{milestones.map((milestone) => (
							<tr key={milestone.id} className="border-t border-border">
								<td className="py-2 font-medium">{milestone.title}</td>
								<td className="py-2">
									{milestone.project.keyPrefix} · {milestone.project.name}
								</td>
								<td className="py-2">
									{milestone.dueAt ? new Date(milestone.dueAt).toLocaleDateString() : "—"}
								</td>
								<td className="py-2">{milestone.status}</td>
								<td className="min-w-[320px] py-2">
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
								<td colSpan={5} className="py-4 text-muted-foreground">
									No milestones yet.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
				</CardContent>
			</Card>

			<section className="grid gap-3">
				<h3 className="text-base font-semibold">Project attachments</h3>
				{projects.length === 0 ? <div className="text-sm text-muted-foreground">Create a project to attach files.</div> : null}
				{projects.map((project) => {
					const links = attachmentMap.get(project.id) ?? [];
					return (
						<div key={project.id} className="rounded-md border border-border p-3">
							<div className="mb-2 font-semibold">
								{project.keyPrefix} · {project.name}
							</div>
							{canManageAttachments ? (
								<UploadAttachmentForm entityType="Project" entityId={project.id} />
							) : (
								<div className="mb-2 text-sm text-muted-foreground">Only Admin/Owner roles can upload and link attachments.</div>
							)}
							<div className="mt-2 grid gap-2">
								{links.slice(0, 20).map((link) => {
									const fileUrl = getAttachmentPublicUrl(link.attachment.storageKey);
									return (
										<div key={link.id} className="rounded-md border border-border p-3">
											<div className="font-semibold">{link.label || link.attachment.fileName}</div>
											<div className="mb-1 text-xs text-muted-foreground">
												{link.attachment.fileName} · {link.attachment.mimeType} · {(link.attachment.sizeBytes / 1024).toFixed(1)} KB
											</div>
											{canManageAttachments ? <AttachmentLinkActions linkId={link.id} /> : null}
											{fileUrl ? (
												<a href={fileUrl} target="_blank" rel="noreferrer">
													Open attachment
												</a>
											) : (
												<span className="text-sm text-muted-foreground">Storage public URL not configured</span>
											)}
										</div>
									);
								})}
								{links.length === 0 ? <div className="text-sm text-muted-foreground">No project attachments yet.</div> : null}
							</div>
						</div>
					);
				})}
			</section>
		</div>
	);
}
