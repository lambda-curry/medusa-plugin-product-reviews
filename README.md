<h1 align="center">Medusa Product Reviews Plugin</h1>

<p align="center">
  <img src="https://img.freepik.com/premium-vector/five-star-rating-icon-rating-stars-vector-flat-stars-isolated_118339-1270.jpg" alt="Medusa-extender logo" width="500" height="auto" />
</p>

[![npm version](https://badge.fury.io/js/@lambdacurry%2Fmedusa-plugin-product-reviews.svg)](https://badge.fury.io/js/@lambdacurry%2Fmedusa-plugin-product-reviews)

<p> Made with ❤️ by the team behind <a href="https://lambdacurry.dev">Lambda Curry</a> and <a href="https://market.haus">MarketHaus</a> </p>

## Compatibility

This is compatible with versions >= 1.12.0 of `@medusajs/medusa`.

### Warning

⚠️ This plugin is currently in beta. It is subject to breaking changes in the near future.

### TODO

[x] Create Medusa plugin

[x] Create Storefront Client

[ ] Better docs (🚧WIP)

[ ] Create Admin UI Widgets (🚧WIP)

[ ] Create Admin Client (🚧WIP)

## Features

- Ability to create reviews for a product (1-5 star rating, content text field, images field).
- Create product review requests (to ensure product reviews are verified purchases).
- Retrieve Review Stats for a product (average rating, rating count, breakdown by rating).
- Import product reviews via csv. (helpful for migrating from another e-commerce provider).

## How to Install

1\. Run the following command in the directory of your Medusa project:

```bash
yarn add @lambdacurry/medusa-plugin-product-reviews
```

2\. In `medusa-config.js` add the following at the end of the `plugins` array:

```js
const plugins = [
  // ...,
  {
    resolve: `@lambdacurry/medusa-plugin-product-reviews`,
  },
];
```

## How to use the client

1\. Run the following command in your storefront project

```bash
yarn add @lambdacurry/medusa-plugin-product-reviews-client
```

2\. Update your "@medusajs/medusa-js" client like the following.

```typescript
import { Medusa as MedusaBase } from "@medusajs/medusa-js";
import {
  ProductReviewResource,
  ProductReviewRequestResource,
  ProductReviewImageResource,
} from "@lambdacurry/medusa-plugin-product-reviews-client";

export class Medusa extends MedusaBase {
  public productReviews: ProductReviewsResource;
  public productReviewRequest: ProductReviewRequestResource;
  public productReviewImage: ProductReviewImageResource;

  constructor(config: Config) {
    super(config);
    this.productReviews = new ProductReviewsResource(this.client);
    this.productReviewRequests = new ProductReviewRequestsResource(this.client);
    this.productReviewImage = new ProductReviewImageResource(this.client);
  }
}
```

## Additional Configuration

If you wish to send notification emails using this plugin then you will need to extend the ProductReviewRequestService to work with your email sender. Here is an example subscriber file that can do that work.

```typescript
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
      { delay: SEVEN_DAYS }
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
```
