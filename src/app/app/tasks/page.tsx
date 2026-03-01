import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { TaskRowActions } from "@/components/tasks/TaskRowActions";
import { AddTaskDependencyForm } from "@/components/tasks/AddTaskDependencyForm";

type Search = {
	view?: string;
};

const KANBAN_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;

export default async function TasksPage({ searchParams }: { searchParams?: Promise<Search> }) {
	const session = await requireSession();
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

	return (
		<div style={{ display: "grid", gap: 18 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
				<div>
				<h2 style={{ marginTop: 0, marginBottom: 6 }}>Tasks</h2>
				<p style={{ color: "#666", margin: 0 }}>Track due work and surface due-date notifications.</p>
				</div>
				<div style={{ display: "flex", gap: 8 }}>
					<Link
						href="/app/tasks"
						style={{
							padding: "6px 10px",
							border: "1px solid #ddd",
							borderRadius: 8,
							background: view === "list" ? "#f3f4f6" : "transparent",
						}}
					>
						List
					</Link>
					<Link
						href="/app/tasks?view=kanban"
						style={{
							padding: "6px 10px",
							border: "1px solid #ddd",
							borderRadius: 8,
							background: view === "kanban" ? "#f3f4f6" : "transparent",
						}}
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
				<div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead>
							<tr style={{ textAlign: "left", background: "#fafafa" }}>
								<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Title</th>
								<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Project</th>
								<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Client</th>
								<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Due</th>
								<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Status</th>
								<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Deps</th>
								<th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{tasks.map((task) => (
								<tr key={task.id}>
									<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1", fontWeight: 500 }}>{task.title}</td>
									<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
										{task.project ? `${task.project.keyPrefix} · ${task.project.name}` : "—"}
									</td>
									<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
										{task.client ? <Link href={`/app/clients/${task.client.id}`}>{task.client.name}</Link> : "—"}
									</td>
									<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
										{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "—"}
									</td>
									<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>{task.status}</td>
									<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1" }}>
										Blocked by {task._count.blockedBy} · Blocks {task._count.blocks}
									</td>
									<td style={{ padding: 10, borderBottom: "1px solid #f1f1f1", minWidth: 260 }}>
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
									<td colSpan={7} style={{ padding: 14, color: "#666" }}>
										No tasks yet.
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
			) : (
				<div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(220px, 1fr))", gap: 12 }}>
					{KANBAN_STATUSES.map((status) => {
						const bucket = tasks.filter((task) => task.status === status);
						return (
							<div key={status} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
								<div style={{ fontWeight: 700, marginBottom: 8 }}>
									{status} ({bucket.length})
								</div>
								<div style={{ display: "grid", gap: 8 }}>
									{bucket.map((task) => (
										<div key={task.id} style={{ border: "1px solid #f1f1f1", borderRadius: 10, padding: 8 }}>
											<div style={{ fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
											<div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
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
									{bucket.length === 0 ? <div style={{ color: "#666", fontSize: 13 }}>No tasks</div> : null}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
