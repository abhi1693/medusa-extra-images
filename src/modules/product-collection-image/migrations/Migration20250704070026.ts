import { Migration } from "@mikro-orm/migrations"
// Historical identifier retained for existing installations. No data rewrite.
export class Migration20250704070026 extends Migration {
  async up() {
    this.addSql(
      'create table if not exists "product_collection_image" ("id" text primary key, "url" text not null, "rank" integer not null, "product_collection_id" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null);'
    )
    this.addSql(
      'create index if not exists "IDX_product_collection_image_deleted_at" on "product_collection_image" (deleted_at) where deleted_at is null;'
    )
    this.addSql(
      'create index if not exists "IDX_product_collection_image_product_collection_id" on "product_collection_image" (product_collection_id) where deleted_at is null;'
    )
  }
  async down() {
    throw new Error(
      "Image data is preserved. Restore a reviewed backup to reverse schema installation."
    )
  }
}
