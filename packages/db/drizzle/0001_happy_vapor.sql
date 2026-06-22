CREATE TABLE "patent_drawings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patent_id" uuid NOT NULL,
	"page" integer NOT NULL,
	"png_data" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patent_drawings" ADD CONSTRAINT "patent_drawings_patent_id_patents_id_fk" FOREIGN KEY ("patent_id") REFERENCES "public"."patents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_patent_drawings_patent_page" ON "patent_drawings" USING btree ("patent_id","page");--> statement-breakpoint
CREATE INDEX "idx_patent_drawings_patent" ON "patent_drawings" USING btree ("patent_id");