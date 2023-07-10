import { BaseEntity, Order } from "@medusajs/medusa";
import { BeforeInsert, Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { generateEntityId } from "@medusajs/medusa/dist/utils";

@Entity()
export class ProductReviewRequest extends BaseEntity {
  @Index()
  @Column({ nullable: false })
  order_id: string;

  @OneToOne(() => Order)
  @JoinColumn({ name: "order_id" })
  order: Order;

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "p_rev_req");
  }
}
