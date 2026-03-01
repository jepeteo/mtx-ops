import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/db";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { TaskRowActions } from "@/components/tasks/TaskRowActions";
import { AddTaskDependencyForm } from "@/components/tasks/AddTaskDependencyForm";

export default async function TasksPage() {
	const session = await requireSession();

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
			<div>
				<h2 style={{ marginTop: 0, marginBottom: 6 }}>Tasks</h2>
				<p style={{ color: "#666", margin: 0 }}>Track due work and surface due-date notifications.</p>
			</div>

			<CreateTaskForm clients={clients} projects={projects} />

			{tasks.length > 1 ? (
				<AddTaskDependencyForm tasks={tasks.map((task) => ({ id: task.id, title: task.title }))} />
			) : null}

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
									<TaskRowActions taskId={task.id} status={task.status} />
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
		</div>
	);
}
