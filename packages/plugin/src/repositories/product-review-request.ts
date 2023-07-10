import { ProductReviewRequest } from '../models';
import { dataSource } from '@medusajs/medusa/dist/loaders/database';

const ProductReviewRequestRepository =
  dataSource.getRepository(ProductReviewRequest);

export default ProductReviewRequestRepository;
