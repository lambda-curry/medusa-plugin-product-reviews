import { IsString, IsNumber, IsOptional, IsArray, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { IsType } from "@medusajs/medusa/dist/utils/validators/is-type";

export class CreateProductReviewReq {
  @IsString()
  @IsOptional()
  product_id?: string;

  @IsString()
  @IsOptional()
  customer_id?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsOptional()
  images?: (File | string)[];

  @IsString()
  @IsOptional()
  review_request_id?: string;
}

export class UpdateProductReviewReq {
  @IsString()
  id: string;

  @IsString()
  @IsOptional()
  product_id?: string;

  @IsString()
  @IsOptional()
  customer_id?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsOptional()
  images?: (File | string)[];

  @IsArray()
  @IsOptional()
  images_keep?: string[];

  @IsString()
  @IsOptional()
  review_request_id?: string;
}

export class ProductReviewsPaginationParam {
  @IsString()
  @IsOptional()
  fields?: string;

  @IsString()
  @IsOptional()
  expand?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  q?: string;
}

export class StoreGetProductReviewsParams extends ProductReviewsPaginationParam {
  @IsOptional()
  @IsType([String, [String]])
  id?: string | string[];

  @IsString()
  @IsOptional()
  order_id?: string;

  @IsOptional()
  @IsType([String, [String]])
  customer_id?: string | string[];

  @IsType([String, [String]])
  @IsOptional()
  product_id?: string | string[];

  @IsType([String, [String]])
  @IsOptional()
  product_variant_id?: string[];

  @IsType([String, [String]])
  @IsOptional()
  rating?: number[];
}

export class StoreGetProductReviewStatsParams {
  @IsType([[String]])
  product_id: string[];
}

export class AdminGetProductReviewsParams extends StoreGetProductReviewsParams {}
