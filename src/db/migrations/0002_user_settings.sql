CREATE TABLE `user_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nickname` text DEFAULT 'You' NOT NULL,
	`main_api_base_url` text DEFAULT 'https://api.openai.com/v1' NOT NULL,
	`main_api_key` text DEFAULT '' NOT NULL,
	`main_api_model` text DEFAULT 'gpt-4o-mini' NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `user_settings` (`id`, `nickname`, `main_api_base_url`, `main_api_key`, `main_api_model`) VALUES (1, 'You', 'https://api.openai.com/v1', '', 'gpt-4o-mini');
