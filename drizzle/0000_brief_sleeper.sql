CREATE TABLE `flight_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`claimed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `runs_player_created` ON `flight_runs` (`player_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `flight_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`name` text NOT NULL,
	`distance` real NOT NULL,
	`dx` real NOT NULL,
	`dz` real NOT NULL,
	`frames` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scores_distance` ON `flight_scores` (`distance`);--> statement-breakpoint
CREATE INDEX `scores_player` ON `flight_scores` (`player_id`);