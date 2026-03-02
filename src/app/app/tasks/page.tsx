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
				client: {
					select: {
						id: true,
						name: true,
					},
				},
				project: {
					select: {
						id: true,
						name: true,
						keyPrefix: true,
					},
				},
				_count: {
					select: {
						blockedBy: true,
						blocks: true,
					},
				},
			},
			orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
			take: 200,
		}),
		db.client.findMany({
			where: { workspaceId: session.workspaceId },
			select: {
				id: true,
				name: true,
			},
			orderBy: { name: "asc" },
			take: 200,
		}),
		db.project.findMany({
			where: { workspaceId: session.workspaceId },
			select: {
				id: true,
				name: true,
				keyPrefix: true,
				clientId: true,
			},
			orderBy: [{ updatedAt: "desc" }],
			take: 200,
		}),
	]);

	const taskIds = tasks.map((task) => task.id);
	const taskAttachmentLinks =
		taskIds.length > 0
			? await db.attachmentLink.findMany({
					where: {
						workspaceId: session.workspaceId,
						entityType: "Task",
						entityId: { in: taskIds },
					},
					include: { attachment: true },
					orderBy: { createdAt: "desc" },
					take: 500,
			  })
			: [];

	const taskAttachmentMap = new Map<string, typeof taskAttachmentLinks>();
	for (const link of taskAttachmentLinks) {
		const existing = taskAttachmentMap.get(link.entityId);
		if (existing) {
			existing.push(link);
		} else {
			taskAttachmentMap.set(link.entityId, [link]);
		}
	}

	return (
		<div className="space-y-5">
			<div className="flex items-center justify-between gap-3">
				<div>
				<div className="text-xs font-semibold tracking-wider text-muted-foreground">DELIVERY</div>
				<h1 className="mt-1 text-xl font-semibold">Tasks</h1>
				<p className="mt-1 text-sm text-muted-foreground">Track due work and surface due-date notifications.</p>
				</div>
				<div className="flex gap-2 text-sm">
					<Link
						href="/app/tasks"
						className={`rounded-md border px-3 py-1 ${view === "list" ? "border-foreground bg-secondary" : "border-border"}`}
					>
						List
					</Link>
					<Link
						href="/app/tasks?view=kanban"
						className={`rounded-md border px-3 py-1 ${view === "kanban" ? "border-foreground bg-secondary" : "border-border"}`}
					>
						Kanban
					</Link>
				</div>
			</div>

			<CreateTaskForm clients={clients} projects={projects} />

			{tasks.length > 1 ? (
				<AddTaskDependencyForm tasks={tasks.map((task) => ({ id: task.id, title: task.title }))} />
			) : null}

			{view === "list" ? (
				<Card>
					<CardHeader>
						<CardTitle>Task list</CardTitle>
					</CardHeader>
					<CardContent className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="text-muted-foreground">
								<th className="py-2">Title</th>
								<th className="py-2">Project</th>
								<th className="py-2">Client</th>
								<th className="py-2">Due</th>
								<th className="py-2">Status</th>
								<th className="py-2">Deps</th>
								<th className="py-2">Actions</th>
							</tr>
						</thead>
						<tbody>
							{tasks.map((task) => (
								<tr key={task.id} className="border-t border-border">
									<td className="py-2 font-medium">{task.title}</td>
									<td className="py-2">
										{task.project ? `${task.project.keyPrefix} · ${task.project.name}` : "—"}
									</td>
									<td className="py-2">
										{task.client ? <Link href={`/app/clients/${task.client.id}`}>{task.client.name}</Link> : "—"}
									</td>
									<td className="py-2">
										{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "—"}
									</td>
									<td className="py-2">{task.status}</td>
									<td className="py-2">
										Blocked by {task._count.blockedBy} · Blocks {task._count.blocks}
									</td>
									<td className="min-w-[260px] py-2">
										<TaskRowActions
											taskId={task.id}
											title={task.title}
											status={task.status}
											dueAt={task.dueAt ? task.dueAt.toISOString() : null}
											projectId={task.projectId}
											projects={projects.map((project) => ({
												id: project.id,
												name: project.name,
												keyPrefix: project.keyPrefix,
											}))}
										/>
									</td>
								</tr>
							))}
							{tasks.length === 0 ? (
								<tr>
									<td colSpan={7} className="py-4 text-muted-foreground">
										No tasks yet.
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					{KANBAN_STATUSES.map((status) => {
						const bucket = tasks.filter((task) => task.status === status);
						return (
							<Card key={status}>
								<CardHeader>
									<CardTitle>
									{status} ({bucket.length})
									</CardTitle>
								</CardHeader>
								<CardContent className="grid gap-2">
									{bucket.map((task) => (
										<div key={task.id} className="rounded-md border border-border p-2">
											<div className="mb-1 font-semibold">{task.title}</div>
											<div className="mb-1 text-xs text-muted-foreground">
												{task.project ? `${task.project.keyPrefix} · ${task.project.name}` : "No project"}
											</div>
											<TaskRowActions
												taskId={task.id}
												title={task.title}
												status={task.status}
												dueAt={task.dueAt ? task.dueAt.toISOString() : null}
												projectId={task.projectId}
												projects={projects.map((project) => ({
													id: project.id,
													name: project.name,
													keyPrefix: project.keyPrefix,
												}))}
											/>
										</div>
									))}
									{bucket.length === 0 ? <div className="text-sm text-muted-foreground">No tasks</div> : null}
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			<section className="grid gap-3">
				<h3 className="text-base font-semibold">Task attachments</h3>
				{tasks.length === 0 ? <div className="text-sm text-muted-foreground">Create a task to attach files.</div> : null}
				{tasks.map((task) => {
					const links = taskAttachmentMap.get(task.id) ?? [];
					return (
						<div key={task.id} className="rounded-md border border-border p-3">
							<div className="mb-2 font-semibold">{task.title}</div>
							{canManageAttachments ? (
								<UploadAttachmentForm entityType="Task" entityId={task.id} />
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
								{links.length === 0 ? <div className="text-sm text-muted-foreground">No task attachments yet.</div> : null}
							</div>
						</div>
					);
				})}
			</section>
		</div>
	);
}
