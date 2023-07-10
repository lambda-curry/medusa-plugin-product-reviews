import { MigrationInterface, QueryRunner, TableForeignKey } from "typeorm"

export class productReview1683131541071 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "product_review" (
        "id" character varying NOT NULL, 
        "product_id" character varying NOT NULL, 
        "product_variant_id" character varying,
        "customer_id" character varying NOT NULL,
        "rating" integer NOT NULL, 
        "content" character varying NOT NULL, 
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
        "deleted_at" TIMESTAMP WITH TIME ZONE )`
    )
    await queryRunner.createPrimaryKey("product_review", ["id"])
    await queryRunner.createForeignKey(
      "product_review",
      new TableForeignKey({
        columnNames: ["product_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "product",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      })
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("product_review", true)
  }
}
