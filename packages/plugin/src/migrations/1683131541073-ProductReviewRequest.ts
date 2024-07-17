import { MigrationInterface, QueryRunner, TableForeignKey } from "typeorm";

export class productReviewRequest1683131541073 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "product_review_request" (
      "id" character varying NOT NULL, 
      "order_id" character varying NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
      "deleted_at" TIMESTAMP WITH TIME ZONE )`
    );

    await queryRunner.query(`
      ALTER TABLE "product_review_request"
      ADD CONSTRAINT "PK_product_review_request" PRIMARY KEY ("id");

      ALTER TABLE "product_review_request"
      ADD CONSTRAINT "FK_product_review_request_order"
      FOREIGN KEY ("order_id")
      REFERENCES "order" ("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("product_review_request", true);
  }
}
