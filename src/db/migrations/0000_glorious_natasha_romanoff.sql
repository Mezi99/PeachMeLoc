CREATE TABLE `agents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`avatar` text DEFAULT '🤖' NOT NULL,
	`persona_prompt` text NOT NULL,
	`llm_base_url` text DEFAULT 'https://api.openai.com/v1' NOT NULL,
	`llm_api_key` text DEFAULT '' NOT NULL,
	`llm_model` text DEFAULT 'gpt-4o-mini' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thread_id` integer NOT NULL,
	`content` text NOT NULL,
	`author_type` text NOT NULL,
	`author_name` text NOT NULL,
	`author_avatar` text DEFAULT '👤' NOT NULL,
	`agent_id` integer,
	`created_at` integer,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `threads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT 'General' NOT NULL,
	`author_name` text DEFAULT 'You' NOT NULL,
	`created_at` integer,
	`last_activity_at` integer,
	`reply_count` integer DEFAULT 0 NOT NULL
);
