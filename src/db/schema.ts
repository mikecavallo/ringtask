import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const numbers = sqliteTable('numbers', {
  id: text('id').primaryKey(),
  phoneNumber: text('phone_number').notNull().unique(),
  status: text('status', { enum: ['available', 'assigned', 'cooldown'] }).notNull().default('available'),
  assignedTo: text('assigned_to'),
  assignedAt: integer('assigned_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  cooldownUntil: integer('cooldown_until', { mode: 'timestamp' }),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  apiKey: text('api_key').notNull().unique(),
  email: text('email').notNull().unique(),
  credits: real('credits').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  numberId: text('number_id').notNull().references(() => numbers.id),
  direction: text('direction', { enum: ['in', 'out'] }).notNull(),
  from: text('from_number').notNull(),
  to: text('to_number').notNull(),
  body: text('body').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const calls = sqliteTable('calls', {
  id: text('id').primaryKey(),
  numberId: text('number_id').references(() => numbers.id),
  userId: text('user_id').notNull().references(() => users.id),
  toNumber: text('to_number').notNull(),
  missionText: text('mission_text').notNull(),
  status: text('status', { enum: ['pending', 'in-progress', 'completed', 'failed'] }).notNull().default('pending'),
  transcript: text('transcript'),
  durationSeconds: integer('duration_seconds'),
  creditsUsed: real('credits_used'),
  retellCallId: text('retell_call_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const usageLogs = sqliteTable('usage_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  creditsUsed: real('credits_used').notNull(),
  metadata: text('metadata'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
