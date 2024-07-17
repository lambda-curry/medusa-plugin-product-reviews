import { MigrationInterface, QueryRunner, TableForeignKey } from "typeorm";

export class productReviewImage1683131541072 implements MigrationInterface {
  // This is a join table for product reviews and images
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "product_review_images" (
        "product_review_id" character varying NOT NULL, 
        "image_id" character varying NOT NULL )`
    );

    await queryRunner.query(`
      ALTER TABLE "product_review_images"
      ADD CONSTRAINT "PK_product_review_images"
      PRIMARY KEY ("product_review_id", "image_id")
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_4f166bb8c2bfcef2498d97b407" ON "product_review_images" ("product_review_id") `
    );
    await queryRunner.query(`CREATE INDEX "IDX_2212515ba306c79f42c46a99dd" ON "product_review_images" ("image_id") `);

    await queryRunner.query(`
      ALTER TABLE "product_review_images"
      ADD CONSTRAINT "FK_product_review_images_product_review"
      FOREIGN KEY ("product_review_id")
      REFERENCES "product_review" ("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "product_review_images"
      ADD CONSTRAINT "FK_product_review_images_image"
      FOREIGN KEY ("image_id")
      REFERENCES "image" ("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_4f166bb8c2bfcef2498d97b407"`);
    await queryRunner.query(`DROP INDEX "IDX_IDX_2212515ba306c79f42c46a99dd"`);
    await queryRunner.dropTable("product_review_images", true);
  }
}
