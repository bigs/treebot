import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Placeholder schema — we'll flesh this out when designing the
// tree-branching conversation model.
export const example = sqliteTable("example", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
