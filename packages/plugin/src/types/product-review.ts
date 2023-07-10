export interface CreateProductReviewInput {
  product_id?: string;
  customer_id?: string;
  rating: number;
  content?: string;
  images?: (Express.Multer.File | string)[];
}

export interface UpdateProductReviewInput {
  product_id: string;
  product_variant_id?: string;
  customer_id?: string;
  rating: number;
  content?: string;
  images?: (Express.Multer.File | string)[];
}

export interface ProductReviewStats {
  product_id: string;
  average: number;
  count: number;
  by_rating: {
    rating: number;
    count: number;
  }[];
}
