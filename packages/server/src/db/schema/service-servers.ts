import { relations } from "drizzle-orm";
import {
	boolean,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { nanoid } from "nanoid";
import { z } from "zod";
import { server } from "./server";

export const serviceType = pgEnum("serviceType", [
	"application",
	"compose",
	"postgres",
	"mysql",
	"mariadb",
	"mongo",
	"redis",
	"libsql",
]);

export const replicationStatus = pgEnum("replicationStatus", [
	"synced",
	"syncing",
	"error",
	"pending",
]);

export const serviceServers = pgTable("serviceServers", {
	id: text("id")
		.notNull()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	serviceId: text("serviceId").notNull(),
	serviceType: serviceType("serviceType").notNull(),
	serverId: text("serverId")
		.notNull()
		.references(() => server.serverId, { onDelete: "cascade" }),
	isPrimary: boolean("isPrimary").notNull().default(false),
	replicationStatus: replicationStatus("replicationStatus")
		.notNull()
		.default("pending"),
	replicationError: text("replicationError"),
	lastSyncedAt: timestamp("lastSyncedAt"),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const serviceServersRelations = relations(
	serviceServers,
	({ one }) => ({
		server: one(server, {
			fields: [serviceServers.serverId],
			references: [server.serverId],
		}),
	}),
);

const createSchema = createInsertSchema(serviceServers, {
	id: z.string().min(1),
	serviceId: z.string().min(1),
	serviceType: z.enum([
		"application",
		"compose",
		"postgres",
		"mysql",
		"mariadb",
		"mongo",
		"redis",
		"libsql",
	]),
	serverId: z.string().min(1),
	isPrimary: z.boolean().default(false),
	replicationStatus: z
		.enum(["synced", "syncing", "error", "pending"])
		.default("pending"),
});

export const apiCreateServiceServer = createSchema.pick({
	serviceId: true,
	serviceType: true,
	serverId: true,
	isPrimary: true,
});

export const apiFindServiceServers = z.object({
	serviceId: z.string().min(1),
	serviceType: z.enum([
		"application",
		"compose",
		"postgres",
		"mysql",
		"mariadb",
		"mongo",
		"redis",
		"libsql",
	]),
});

export const apiUpdateServiceServerStatus = createSchema.pick({
	id: true,
	replicationStatus: true,
	replicationError: true,
});

export const apiSwitchoverServicePrimary = z.object({
	serviceId: z.string().min(1),
	serviceType: z.enum([
		"application",
		"compose",
		"postgres",
		"mysql",
		"mariadb",
		"mongo",
		"redis",
		"libsql",
	]),
	newPrimaryServerId: z.string().min(1),
});
