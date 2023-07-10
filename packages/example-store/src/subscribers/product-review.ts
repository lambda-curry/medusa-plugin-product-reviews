import { ProductReviewRequestService } from "@lambdacurry/medusa-plugin-product-reviews";
import { EventBusService, Order, OrderService } from "@medusajs/medusa";

const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;

export default class ProductReviewSubscriber {
  private eventBusService_: EventBusService;
  private productReviewRequestService_: ProductReviewRequestService;
  private orderService_: OrderService;

  constructor({ eventBusService, orderService, productReviewRequestService }) {
    this.eventBusService_ = eventBusService;
    this.orderService_ = orderService;
    this.productReviewRequestService_ = productReviewRequestService;

    this.eventBusService_.subscribe(OrderService.Events.PLACED, this.handleOrderPlaced.bind(this));
    this.eventBusService_.subscribe("email.order_product_review_request", this.handleSendReviewRequestEmail.bind(this));
  }

  private async handleOrderPlaced({ id }: { id: Order["id"] }) {
    const reviewRequest = await this.productReviewRequestService_.create(id);
    await this.eventBusService_.emit(
      "email.order_product_review_request",
      { order_id: id, review_request_id: reviewRequest.id },
      { delay: SEVEN_DAYS } // 7 days
    );
  }

  private async handleSendReviewRequestEmail({ order_id, review_request_id }) {
    const order = await this.orderService_.retrieve(order_id, {
      relations: ["items", "items.variant", "items.variant.product", "customer"],
    });
    const reviewRequest = await this.productReviewRequestService_.retrieve(review_request_id);

    if (order.status !== "canceled") {
      // yourEmailService.sendOrderReviewRequestEmail(order, reviewRequest)
    }
  }
}
