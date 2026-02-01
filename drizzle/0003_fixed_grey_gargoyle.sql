PRAGMA foreign_keys=off;
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `chats` ADD COLUMN `workspace_id` text REFERENCES workspaces(id);
--> statement-breakpoint
INSERT INTO `workspaces` (`id`, `user_id`, `name`, `created_at`, `updated_at`)
SELECT
  lower(
    hex(randomblob(4)) || '-' ||
    hex(randomblob(2)) || '-' ||
    hex(randomblob(2)) || '-' ||
    hex(randomblob(2)) || '-' ||
    hex(randomblob(6))
  ),
  `id`,
  'Ephemera',
  strftime('%Y-%m-%dT%H:%M:%fZ','now'),
  strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM `users`;
--> statement-breakpoint
UPDATE `chats`
SET `workspace_id` = (
  SELECT `workspaces`.`id`
  FROM `workspaces`
  WHERE `workspaces`.`user_id` = `chats`.`user_id`
  ORDER BY `workspaces`.`created_at`
  LIMIT 1
)
WHERE `workspace_id` IS NULL;
--> statement-breakpoint
CREATE TABLE `chats_new` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` integer NOT NULL,
  `workspace_id` text NOT NULL,
  `parent_id` text,
  `provider` text NOT NULL,
  `model` text NOT NULL,
  `model_params` text,
  `title` text,
  `messages` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `chats_new` (
  `id`,
  `user_id`,
  `workspace_id`,
  `parent_id`,
  `provider`,
  `model`,
  `model_params`,
  `title`,
  `messages`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `user_id`,
  `workspace_id`,
  `parent_id`,
  `provider`,
  `model`,
  `model_params`,
  `title`,
  `messages`,
  `created_at`,
  `updated_at`
FROM `chats`;
--> statement-breakpoint
DROP TABLE `chats`;
--> statement-breakpoint
ALTER TABLE `chats_new` RENAME TO `chats`;
--> statement-breakpoint
PRAGMA foreign_keys=on;
