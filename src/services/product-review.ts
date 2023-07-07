import {
  EventBusService,
  TransactionBaseService,
  buildQuery,
  IFileService as FileService,
  Selector,
  FindConfig,
} from "@medusajs/medusa";
import ProductReviewRepository from "../repositories/product-review";
import { EntityManager, FindOptionsWhere, In } from "typeorm";
import { ProductReview } from "../models";
import { ProductReviewImageService } from "../services";
import { MedusaError, isDefined } from "medusa-core-utils";
import { CreateProductReviewReq, UpdateProductReviewReq } from "../validators";
import ImageRepository from "@medusajs/medusa/dist/repositories/image";
import { ProductReviewStats } from "../types/product-review";

type InjectedDependencies = {
  manager: EntityManager;
  readonly productReviewRepository: typeof ProductReviewRepository;
  readonly imageRepository: typeof ImageRepository;
  fileService: FileService;
  eventBusService: EventBusService;
  productReviewImageService: ProductReviewImageService;
};

class ProductReviewService extends TransactionBaseService {
  static readonly resolutionKey = "productReviewService";

  protected manager_: EntityManager;
  protected readonly transactionManager_: EntityManager | undefined;
  protected readonly fileService: FileService;
  protected readonly productReviewImageService: ProductReviewImageService;
  protected readonly eventBusService: EventBusService;
  private readonly productReviewRepository_: typeof ProductReviewRepository;
  private readonly imageRepository_: typeof ImageRepository;

  static readonly Events = {
    CREATED: "product_review.created",
    UPDATED: "product_review.updated",
    DELETED: "product_review.deleted",
  };

  constructor(container: InjectedDependencies) {
    super(container);
    this.manager_ = container.manager;
    this.eventBusService = container.eventBusService;
    this.productReviewImageService = container.productReviewImageService;
    this.productReviewRepository_ = container.productReviewRepository;
    this.imageRepository_ = container.imageRepository;
  }

  public async list(
    selector: Selector<ProductReview> = {},
    config?: FindConfig<ProductReview>
  ): Promise<ProductReview[]> {
    const repo = this.activeManager_.withRepository(this.productReviewRepository_);
    const query = buildQuery(selector, config);
    return await repo.find(query);
  }

  public async stats(filter: { product_id: string[] }): Promise<ProductReviewStats[]> {
    const repo = this.activeManager_.withRepository(this.productReviewRepository_);

    const query = repo
      .createQueryBuilder("review")
      .where(filter)
      .select("rating, COUNT(*) AS count", "product_id")
      .groupBy("review.rating")
      .addGroupBy("review.product_id");

    const results: { rating: string; count: string; product_id: string }[] = await query.getRawMany();

    const parsedResults = results.map(({ rating, count, product_id }) => ({
      rating: parseInt(rating),
      count: parseInt(count),
      product_id,
    }));

    return filter.product_id.map((product_id) => {
      const filteredResults = parsedResults.filter((r) => r.product_id === product_id);

      const count = filteredResults.reduce((total, review) => total + review.count, 0);

      const totalRatings = filteredResults.reduce((total, review) => total + review.rating * review.count, 0);

      const average = parseFloat((totalRatings / count).toFixed(2));

      const by_rating = Array.from({ length: 6 }, (_, index) => {
        const review = filteredResults.find((review) => review.rating === index);
        return {
          count: review?.count || 0,
          rating: index,
        };
      });

      return {
        product_id,
        average,
        count,
        by_rating,
      };
    });
  }

  async listAndCount(
    selector: Selector<ProductReview>,
    config: FindConfig<ProductReview>
  ): Promise<[ProductReview[], number]> {
    const repo = this.activeManager_.withRepository(this.productReviewRepository_);

    const query = buildQuery(selector, config);

    return await repo.findAndCount(query);
  }

  async retrieve(reviewId: string, config: FindConfig<ProductReview> = {}): Promise<ProductReview | never> {
    if (!isDefined(reviewId)) throw new MedusaError(MedusaError.Types.NOT_FOUND, `"reviewId" must be defined`);

    const repo = this.activeManager_.withRepository(this.productReviewRepository_);

    const query = buildQuery({ id: reviewId }, config);

    const productReviewRequest = await repo.findOne(query);

    return productReviewRequest;
  }

  async getAverageRating(where: FindOptionsWhere<ProductReview> = {}) {
    const repo = this.activeManager_.withRepository(this.productReviewRepository_);

    const averageRating = await repo.average("rating", where);

    return averageRating.toFixed(2);
  }

  async create(data: CreateProductReviewReq): Promise<ProductReview> {
    return await this.atomicPhase_(async (transactionManager: EntityManager) => {
      const repo = this.activeManager_.withRepository(this.productReviewRepository_);

      const { product_id, customer_id, rating, content } = data;

      const images = await this.productReviewImageService
        .withTransaction(transactionManager)
        .upsert(data.images as any);

      const createdReview = await repo.create({
        product_id,
        customer_id,
        content,
        rating,
        images,
      });

      const productReview = await repo.save(createdReview);

      await this.eventBusService.withTransaction(transactionManager).emit(ProductReviewService.Events.CREATED, {
        id: productReview.id,
        product_id: productReview.product_id,
        product_variant_id: productReview.product_variant_id,
        customer_id: productReview.customer_id,
      });

      return productReview;
    });
  }

  async update(data: UpdateProductReviewReq) {
    return await this.atomicPhase_(async (manager_) => {
      const repo = manager_.withRepository(this.productReviewRepository_);
      const imageRepo = manager_.withRepository(this.imageRepository_);

      const productReview = await repo.findOne(buildQuery({ id: data.id }));

      const imagesToKeep = data?.images_keep
        ? await imageRepo.find({
            where: { id: In(data?.images_keep) },
          })
        : [];

      const images = await this.productReviewImageService.upsert(data.images as any);

      const newProductReviewData = {
        ...data,
        images: [...images, ...imagesToKeep],
      };

      const updatedProductReview = repo.merge(productReview, newProductReviewData);

      const newProductReview = await repo.save(updatedProductReview);

      await this.eventBusService.withTransaction(manager_).emit(ProductReviewService.Events.UPDATED, {
        id: newProductReview.id,
        product_id: newProductReview.product_id,
        product_variant_id: newProductReview.product_variant_id,
        customer_id: newProductReview.customer_id,
      });

      return newProductReview;
    });
  }

  async delete(product_review_id: string) {
    return await this.atomicPhase_(async (manager_) => {
      const repo = manager_.withRepository(this.productReviewRepository_);

      await repo.softDelete({
        id: product_review_id,
      });

      await this.eventBusService.withTransaction(manager_).emit(ProductReviewService.Events.DELETED, {
        id: product_review_id,
      });
    });
  }
}

export default ProductReviewService;
