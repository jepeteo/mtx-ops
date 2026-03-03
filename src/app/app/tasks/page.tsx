import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { TaskRowActions } from "@/components/tasks/TaskRowActions";
import { AddTaskDependencyForm } from "@/components/tasks/AddTaskDependencyForm";
import { UploadAttachmentForm } from "@/components/attachments/UploadAttachmentForm";
import { AttachmentLinkActions } from "@/components/attachments/AttachmentLinkActions";
import { getAttachmentPublicUrl } from "@/lib/storage/s3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Paperclip } from "lucide-react";

type Search = {
	view?: string;
};

const KANBAN_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;

export default async function TasksPage({ searchParams }: { searchParams?: Promise<Search> }) {
	const session = await requireSession();
	const canManageAttachments = session.role === "OWNER" || session.role === "ADMIN";
	const resolvedSearch = (await searchParams) ?? {};
	const view = resolvedSearch.view === "kanban" ? "kanban" : "list";

	const [tasks, clients, projects] = await Promise.all([
		db.task.findMany({
			where: { workspaceId: session.workspaceId },
			include: {
				client: { select: { id: true, name: true } },
				project: { select: { id: true, name: true, keyPrefix: true } },
				_count: { select: { blockedBy: true, blocks: true } },
			},
			orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
			take: 200,
		}),
		db.client.findMany({
			where: { workspaceId: session.workspaceId },
			select: { id: true, name: true },
			orderBy: { name: "asc" },
			take: 200,
		}),
		db.project.findMany({
			where: { workspaceId: session.workspaceId },
			select: { id: true, name: true, keyPrefix: true, clientId: true },
			orderBy: [{ updatedAt: "desc" }],
			take: 200,
		}),
	]);

	const taskIds = tasks.map((t) => t.id);
	const taskAttachmentLinks =
		taskIds.length > 0
			? await db.attachmentLink.findMany({
					where: { workspaceId: session.workspaceId, entityType: "Task", entityId: { in: taskIds } },
					include: { attachment: true },
					orderBy: { createdAt: "desc" },
					take: 500,
			  })
			: [];

	const taskAttachmentMap = new Map<string, typeof taskAttachmentLinks>();
	for (const link of taskAttachmentLinks) {
		const existing = taskAttachmentMap.get(link.entityId);
		if (existing) existing.push(link);
		else taskAttachmentMap.set(link.entityId, [link]);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h1 className="text-lg font-semibold">Tasks</h1>
					<p className="text-sm text-muted-foreground">Track due work and surface due-date notifications</p>
				</div>
				<div className="tab-bar">
					<Link href="/app/tasks" className={view === "list" ? "active" : ""}>List</Link>
					<Link href="/app/tasks?view=kanban" className={view === "kanban" ? "active" : ""}>Kanban</Link>
				</div>
			</div>

			<CreateTaskForm clients={clients} projects={projects} />

			{tasks.length > 1 && (
				<AddTaskDependencyForm tasks={tasks.map((t) => ({ id: t.id, title: t.title }))} />
			)}

			{view === "list" ? (
				<Card>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<table className="data-table">
								<thead>
									<tr>
										<th>Title</th>
										<th>Project</th>
										<th>Client</th>
										<th>Due</th>
										<th>Status</th>
										<th>Deps</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{tasks.map((task) => (
										<tr key={task.id}>
											<td className="font-medium">{task.title}</td>
											<td>
												{task.project ? (
													<span><code className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{task.project.keyPrefix}</code> {task.project.name}</span>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</td>
											<td>
												{task.client ? <Link href={`/app/clients/${task.client.id}`} className="text-foreground hover:text-primary">{task.client.name}</Link> : <span className="text-muted-foreground">—</span>}
											</td>
											<td>{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "—"}</td>
											<td><StatusPill status={task.status} /></td>
											<td className="text-xs text-muted-foreground">
												{task._count.blockedBy > 0 && <span className="text-destructive">Blocked by {task._count.blockedBy}</span>}
												{task._count.blockedBy > 0 && task._count.blocks > 0 && " · "}
												{task._count.blocks > 0 && <span>Blocks {task._count.blocks}</span>}
												{task._count.blockedBy === 0 && task._count.blocks === 0 && "—"}
											</td>
											<td className="min-w-[260px]">
												<TaskRowActions
													taskId={task.id}
													title={task.title}
													status={task.status}
													dueAt={task.dueAt ? task.dueAt.toISOString() : null}
													projectId={task.projectId}
													projects={projects.map((p) => ({ id: p.id, name: p.name, keyPrefix: p.keyPrefix }))}
												/>
											</td>
										</tr>
									))}
									{tasks.length === 0 && (
										<tr><td colSpan={7} className="empty-state">No tasks yet.</td></tr>
									)}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{KANBAN_STATUSES.map((status) => {
						const bucket = tasks.filter((t) => t.status === status);
						return (
							<div key={status} className="space-y-2">
								<div className="flex items-center gap-2 px-1">
									<StatusPill status={status} />
									<span className="text-xs text-muted-foreground">({bucket.length})</span>
								</div>
								<div className="grid gap-2">
									{bucket.map((task) => (
										<Card key={task.id} className="transition-colors hover:border-primary/30">
											<CardContent className="p-3">
												<div className="mb-1.5 text-sm font-medium">{task.title}</div>
												<div className="mb-2 text-[11px] text-muted-foreground">
													{task.project ? `${task.project.keyPrefix} · ${task.project.name}` : "No project"}
												</div>
												<TaskRowActions
													taskId={task.id}
													title={task.title}
													status={task.status}
													dueAt={task.dueAt ? task.dueAt.toISOString() : null}
													projectId={task.projectId}
													projects={projects.map((p) => ({ id: p.id, name: p.name, keyPrefix: p.keyPrefix }))}
												/>
											</CardContent>
										</Card>
									))}
									{bucket.length === 0 && <div className="empty-state rounded-lg border border-dashed border-border p-4 text-center">No tasks</div>}
								</div>
							</div>
						);
					})}
				</div>
			)}

			<section className="space-y-3">
				<h2 className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4 text-muted-foreground" /> Task attachments</h2>
				{tasks.length === 0 && <div className="text-sm text-muted-foreground">Create a task to attach files.</div>}
				<div className="grid gap-3">
					{tasks.map((task) => {
						const links = taskAttachmentMap.get(task.id) ?? [];
						return (
							<Card key={task.id}>
								<CardHeader className="pb-2">
									<CardTitle className="text-sm">{task.title}</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{canManageAttachments ? (
										<UploadAttachmentForm entityType="Task" entityId={task.id} />
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
										<div className="empty-state text-center">No task attachments yet.</div>
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
