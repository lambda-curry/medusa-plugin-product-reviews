import { Customer, Image, Product, SoftDeletableEntity } from "@medusajs/medusa";
import { BeforeInsert, Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne } from "typeorm";
import { Max, Min } from "class-validator";
import { generateEntityId } from "@medusajs/medusa/dist/utils";

@Entity()
export class ProductReview extends SoftDeletableEntity {
  @Index()
  @Column({ type: "varchar", nullable: false })
  product_id: string;

  @Index()
  @Column({ type: "varchar", nullable: true })
  product_variant_id: string;

  @Column({ type: "varchar", nullable: true })
  customer_id: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: "customer_id" })
  customer: Customer;

  @Column({ type: "int" })
  @Min(1)
  @Max(5)
  rating: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ nullable: false })
  content: string;

  @ManyToMany(() => Image, { cascade: ["insert"] })
  @JoinTable({
    name: "product_review_images",
    joinColumn: {
      name: "product_review_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "image_id",
      referencedColumnName: "id",
    },
  })
  images: Image[];

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "p_rev");
  }
}
