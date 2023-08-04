import wrapHandler from "@medusajs/medusa/dist/api/middlewares/await-middleware";
import { validator } from "@medusajs/medusa/dist/utils/validator";
import { Request, Response } from "express";
import ProductReviewService from "../../services/product-review";
import { omit } from "lodash";
import {
  CreateProductReviewReq,
  StoreGetProductReviewStatsParams,
  StoreGetProductReviewsParams,
  UpdateProductReviewReq,
} from "../../validators";
import { MedusaError } from "medusa-core-utils";
import { Customer, CustomerService, OrderService, Selector } from "@medusajs/medusa";
import { RouteConfig } from "..";
import { ProductReviewRequestService } from "../../services";
import { ProductReview } from "../../models";

export const routes: RouteConfig[] = [
  {
    requiredAuth: false,
    path: "/store/product-reviews",
    method: "get",
    handlers: [wrapHandler(listProductReviews)],
  },
  {
    requiredAuth: false,
    path: "/store/product-reviews/stats",
    method: "get",
    handlers: [wrapHandler(productReviewStats)],
  },
  {
    requiredAuth: true,
    path: "/store/product-reviews",
    method: "post",
    handlers: [wrapHandler(createProductReview)],
  },
  {
    requiredAuth: true,
    path: "/store/product-reviews/:product_review_id",
    method: "post",
    handlers: [wrapHandler(updateProductReview)],
  },

  // Admin API's
  {
    requiredAuth: true,
    path: "/admin/product-reviews",
    method: "get",
    handlers: [wrapHandler(listProductReviews)],
  },
  {
    requiredAuth: true,
    path: "/admin/product-reviews/:id",
    method: "delete",
    handlers: [wrapHandler(deleteProductReview)],
  },
];

export const defaultProductReviewRelations = ["images", "customer"];

async function _validatedCustomer(req: Request): Promise<Customer> {
  const customerService = req.scope.resolve<CustomerService>("customerService");

  if (req.user?.customer_id) return await customerService.retrieve(req.user.customer_id);

  const requestId = req.body.review_request_id || req.query.review_request_id || req.params.review_request_id;

  if (!requestId) return null;

  const requestService = req.scope.resolve<ProductReviewRequestService>("productReviewRequestService");

  const request = await requestService.retrieve(requestId, { relations: ["order", "order.customer"] });

  return request?.order?.customer;
}

async function createProductReview(req: Request, res: Response) {
  const productReviewService = req.scope.resolve<ProductReviewService>("productReviewService");

  const validated = await validator(CreateProductReviewReq, req.body);

  const customer = await _validatedCustomer(req);

  if (!customer) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "No customer found for request");

  const review = await productReviewService.create({
    ...validated,
    customer_id: customer.id,
  });

  res.json({ review });
}

async function listProductReviews(req: Request, res: Response) {
  const productReviewService = req.scope.resolve<ProductReviewService>("productReviewService");
  const orderService = req.scope.resolve<OrderService>("orderService");

  const validated = await validator(StoreGetProductReviewsParams, req.query);
  let filter = validated;

  if (validated.order_id) {
    const order = await orderService.retrieve(validated.order_id, {
      relations: ["items", "items.variant", "items.variant.product"],
    });

    if (!order) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No reviews found matching order");

    filter.product_id = order?.items.map((item) => item.variant.product_id);
    filter.customer_id = order?.customer_id;
    delete filter.order_id;
  }

  const selector: Omit<StoreGetProductReviewsParams, "fields" | "expand" | "offset" | "limit"> = omit(
    validated,
    "fields",
    "expand",
    "offset",
    "limit"
  );

  const [reviews, count] = await productReviewService.listAndCount(
    {
      ...(selector as Selector<ProductReview>),
    },
    {
      order: { updated_at: "DESC" },
      skip: validated.offset,
      take: validated.limit,
      select: validated.fields ? (validated.fields.split(",") as (keyof ProductReview)[]) : undefined,
      relations: validated.expand ? [...new Set(validated.expand.split(","))] : defaultProductReviewRelations,
    }
  );

  res.status(200).json({ reviews, count });
}

async function productReviewStats(req: Request, res: Response) {
  const productReviewService = req.scope.resolve<ProductReviewService>("productReviewService");

  const validated = await validator(StoreGetProductReviewStatsParams, req.query);

  const stats = await productReviewService.stats(validated);

  res.status(200).json({ stats });
}

async function updateProductReview(req: Request, res: Response) {
  const productReviewService = req.scope.resolve<ProductReviewService>("productReviewService");

  const validated = await validator(UpdateProductReviewReq, req.body);

  const customer = await _validatedCustomer(req);

  if (!customer) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No customer found for request");

  const currentReview = await productReviewService.retrieve(validated.id);

  if (!currentReview || currentReview.customer_id !== customer.id)
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Review does not exist or does not belong to customer");

  const review = await productReviewService.update(validated);

  res.json({ review });
}

async function deleteProductReview(req: Request, res: Response) {
  const reviewService = req.scope.resolve<ProductReviewService>("productReviewService");

  const { id } = req.params;

  const review = await reviewService.retrieve(id);

  if (!review) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Could not find review");

  await reviewService.delete(id);

  res.status(200).json({ success: true });
}
