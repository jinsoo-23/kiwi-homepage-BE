import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  smallint,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users 테이블
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  refreshToken: text('refresh_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Customers 테이블
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Inquiries 테이블
export const inquiries = pgTable('inquiries', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  idempotencyKey: varchar('idempotency_key', { length: 64 }).unique(),
  name: varchar('name', { length: 100 }).notNull(),
  companyName: varchar('company_name', { length: 200 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  inquiryType: varchar('inquiry_type', { length: 50 }).notNull(),
  message: text('message').notNull(),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(),
  teamsStatus: varchar('teams_status', { length: 20 }).default('PENDING'),
  retryCount: smallint('retry_count').default(0),
  lastError: text('last_error'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ConsentHistories 테이블
export const consentHistories = pgTable('consent_histories', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  consentType: varchar('consent_type', { length: 50 }).notNull(),
  consented: boolean('consented').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// PrivacyPolicies 테이블
export const privacyPolicies = pgTable('privacy_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  version: varchar('version', { length: 20 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations 정의
export const customersRelations = relations(customers, ({ many }) => ({
  inquiries: many(inquiries),
  consentHistories: many(consentHistories),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  customer: one(customers, {
    fields: [inquiries.customerId],
    references: [customers.id],
  }),
}));

export const consentHistoriesRelations = relations(consentHistories, ({ one }) => ({
  customer: one(customers, {
    fields: [consentHistories.customerId],
    references: [customers.id],
  }),
}));

// 타입 추론
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;

export type ConsentHistory = typeof consentHistories.$inferSelect;
export type NewConsentHistory = typeof consentHistories.$inferInsert;

export type PrivacyPolicy = typeof privacyPolicies.$inferSelect;
export type NewPrivacyPolicy = typeof privacyPolicies.$inferInsert;
