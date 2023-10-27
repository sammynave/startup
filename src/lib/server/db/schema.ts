import { bigint, pgTable, timestamp, pgEnum, varchar } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['user', 'admin']);

/* AUTH Lucia */
export const users = pgTable('users', {
	id: varchar('id', { length: 15 }).primaryKey(),
	username: varchar('username', { length: 50 }).notNull().unique(),
	roles: roleEnum('roles')
		.array()
		.notNull()
		.default('{user}' as unknown as []),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const userKeys = pgTable('user_keys', {
	id: varchar('id', { length: 255 }).primaryKey(),
	userId: varchar('user_id', { length: 15 })
		.references(() => users.id)
		.notNull(),
	hashedPassword: varchar('hashed_password', { length: 255 })
});

export const userSessions = pgTable('user_sessions', {
	id: varchar('id', { length: 128 }).primaryKey(),
	userId: varchar('user_id', { length: 15 })
		.references(() => users.id)
		.notNull(),
	activeExpires: bigint('active_expires', { mode: 'bigint' }).notNull(),
	idleExpires: bigint('idle_expires', { mode: 'bigint' }).notNull()
});
/* END AUTH Lucia */
