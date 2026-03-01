import { z } from "zod";

export const AttachmentEntityTypeSchema = z.enum(["Client", "Project", "Task"]);

export type AttachmentEntityType = z.infer<typeof AttachmentEntityTypeSchema>;
