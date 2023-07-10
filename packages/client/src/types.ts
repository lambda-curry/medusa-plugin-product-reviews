import type { Product, ProductVariant, Image } from "@medusajs/medusa";

export interface ProductReviewStatsQuery {
  product_id: string[];
}

export interface ReviewsListQueryOptions {
  limit?: number;
  offset?: number;
  fields?: string;
  id?: string | string[];
  order_id?: string;
  product_id?: string | string[];
  product_variant_id?: string;
  customer_id?: string;
  content?: string;
  rating?: number;
}

export interface ReviewsRetrieveQueryOptions {
  fields?: string;
  expand?: string;
}

export interface CreateProductReviewReq {
  product_id: string;
  product_variant_id?: string;
  content?: string;
  rating: number;
  images?: (Express.Multer.File | string)[];
  review_request_id?: string;
}

export interface EditProductReviewReq extends CreateProductReviewReq {
  id: string;
}
export interface CreateProductReviewRes {
  review: ProductReview;
}

export interface UpdateProductReviewReq {
  id: string;
  product_id: string;
  product_variant_id?: string;
  content?: string;
  rating: number;
  images?: (Express.Multer.File | string)[];
  images_keep?: string[];
  review_request_id?: string;
}

export interface DeleteProductReviewRes {
  success: boolean;
  message: string;
}

export interface ProductReviewStats {
  product_id: string;
  count: number;
  average: number;
  by_rating: {
    count: number;
    rating: number;
  }[];
}

export interface ProductReview {
  id?: string;
  product_id: string;
  product: Product;
  product_variant_id?: string;
  product_variant?: ProductVariant;
  customer_id: string;
  content: string;
  images?: Image[];
  rating: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date;
}

export interface ProductReviewRequest {
  id: string;
  order_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date;
}

export declare type ProductReviewUploadImageRes = {
  uploads: {
    url: string;
  }[];
};
