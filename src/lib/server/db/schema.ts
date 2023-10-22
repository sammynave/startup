import { bigint, text, pgTable, timestamp } from 'drizzle-orm/pg-core';

/* AUTH Lucia */
export const users = pgTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const userKeys = pgTable('user_keys', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.references(() => users.id)
		.notNull(),
	hashedPassword: text('hashed_password')
});

export const userSessions = pgTable('user_sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.references(() => users.id)
		.notNull(),
	activeExpires: bigint('active_expires', { mode: 'bigint' }).notNull(),
	idleExpires: bigint('idle_expires', { mode: 'bigint' }).notNull()
});
/* END AUTH Lucia */
