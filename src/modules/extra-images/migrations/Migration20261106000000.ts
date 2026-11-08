import { Migration } from "@mikro-orm/migrations"
export class Migration20261106000000 extends Migration {
  async up() {
    this.addSql(
      'create table if not exists "extra_image" ("id" text primary key, "owner_kind" text not null check ("owner_kind" in (\'category\', \'collection\')), "owner_id" text not null, "url" text null, "revision" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null);'
    )
    this.addSql(
      'create unique index if not exists "IDX_extra_image_owner" on "extra_image" ("owner_kind","owner_id") where deleted_at is null;'
    )
  }
  async down() {
    throw new Error(
      "Image records are retained. Restore a reviewed backup to reverse schema installation."
    )
  }
}
