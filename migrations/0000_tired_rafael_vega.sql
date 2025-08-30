CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_holes" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"hole" integer NOT NULL,
	"par" integer NOT NULL,
	"stroke_index" integer NOT NULL,
	CONSTRAINT "course_hole_unique" UNIQUE("course_id","hole"),
	CONSTRAINT "course_stroke_index_unique" UNIQUE("course_id","stroke_index")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"par" integer NOT NULL,
	"slope" integer NOT NULL,
	"rating" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"player_id" text NOT NULL,
	"course_handicap" integer NOT NULL,
	"playing_ch" integer NOT NULL,
	"group_id" text,
	"has_paid" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"name" text NOT NULL,
	"tee_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hole_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"hole" integer NOT NULL,
	"strokes" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"handicap_index" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"date" text NOT NULL,
	"course_id" text NOT NULL,
	"holes" integer DEFAULT 18 NOT NULL,
	"net_allowance" integer DEFAULT 100 NOT NULL,
	"passcode" text NOT NULL,
	"pot_amount" integer,
	"participants_for_skins" integer,
	"skins_carry" boolean DEFAULT false NOT NULL,
	"gross_prize" integer,
	"net_prize" integer,
	"is_final" boolean DEFAULT false NOT NULL,
	"finalized_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
