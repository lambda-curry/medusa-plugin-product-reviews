import { ProductReview } from "../models";
import { dataSource } from "@medusajs/medusa/dist/loaders/database";

const ProductReviewRepository = dataSource.getRepository(ProductReview);
export default ProductReviewRepository;
