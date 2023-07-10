import { BaseResource, ResponsePromise } from "@medusajs/medusa-js";
import {
  CreateProductReviewReq,
  CreateProductReviewRes,
  DeleteProductReviewRes,
  ProductReview,
  ProductReviewStats,
  ProductReviewStatsQuery,
  ReviewsListQueryOptions,
  ReviewsRetrieveQueryOptions,
  UpdateProductReviewReq,
} from "./types";
import qs from "qs";

export class ProductReviewsResource extends BaseResource {
  create(
    data: CreateProductReviewReq,
    customHeaders: Record<string, any> = {}
  ): ResponsePromise<CreateProductReviewRes> {
    const path = `/store/product-reviews`;

    if (typeof data.rating === "string") {
      data.rating = parseInt(data.rating);
    }

    return this.client.request("POST", path, data, {}, customHeaders);
  }

  update(
    data: UpdateProductReviewReq,
    customHeaders: Record<string, any> = {}
  ): ResponsePromise<CreateProductReviewRes> {
    const path = `/store/product-reviews/${data.id}`;

    if (typeof data.rating === "string") {
      data.rating = parseInt(data.rating);
    }
    if (typeof data?.images_keep === "string") {
      const keepString = data?.images_keep as string;
      data.images_keep = keepString.split(",");
    }

    return this.client.request("POST", path, data, {}, customHeaders);
  }

  list(
    options: ReviewsListQueryOptions = {},
    customHeaders: Record<string, any> = {}
  ): ResponsePromise<{
    reviews: ProductReview[];
    count: number;
  }> {
    const query = qs.stringify(options);
    const path = `/store/product-reviews${query ? `?${query}` : ""}`;

    return this.client.request("GET", path, {}, {}, customHeaders);
  }

  retrieve(
    handleOrId: string,
    options: ReviewsRetrieveQueryOptions = {},
    customHeaders: Record<string, any> = {}
  ): ResponsePromise<{ review: ProductReview }> {
    const query = qs.stringify(options);
    const path = `/store/product-reviews/${handleOrId}${query ? `?${query}` : ""}`;

    return this.client.request("GET", path, {}, {}, customHeaders);
  }

  retrieveStats(
    options: ProductReviewStatsQuery,
    customHeaders: Record<string, any> = {}
  ): ResponsePromise<{
    stats: ProductReviewStats[];
  }> {
    const query = qs.stringify(options);
    const path = `/store/product-reviews/stats${query ? `?${query}` : ""}`;
    return this.client.request("GET", path, {}, {}, customHeaders);
  }

  delete(productId: string, customHeaders: Record<string, any> = {}): ResponsePromise<DeleteProductReviewRes> {
    const path = `/store/product-reviews/${productId}`;

    return this.client.request("DELETE", path, {}, {}, customHeaders);
  }
}
