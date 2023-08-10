import {
  EventBusService,
  FindConfig,
  OrderService,
  Selector,
  TransactionBaseService,
  buildQuery,
} from "@medusajs/medusa";
import { EntityManager } from "typeorm";
import FileService from "@medusajs/medusa/dist/services/file";
import { ProductReviewRequestRepository } from "../repositories";
import { ProductReviewRequest } from "../models";
import { MedusaError, isDefined } from "medusa-core-utils";

type InjectedDependencies = {
  manager: EntityManager;
  orderService: OrderService;
  eventBusService: EventBusService;
  readonly productReviewRequestRepository: typeof ProductReviewRequestRepository;
  fileService: FileService;
};

class ProductReviewRequestService extends TransactionBaseService {
  static readonly resolutionKey = "productReviewRequestService";

  protected manager: EntityManager;
  protected readonly orderService: OrderService;
  protected readonly eventBusService: EventBusService;
  protected readonly fileService: FileService;
  private readonly productReviewRequestRepository_: typeof ProductReviewRequestRepository;

  static readonly Events = {
    CREATED: "product_review_request.created",
    DELETED: "product_review_request.deleted",
  };

  constructor(container: InjectedDependencies) {
    super(arguments[0]);
    this.manager_ = container.manager;
    this.productReviewRequestRepository_ = container.productReviewRequestRepository;
    this.orderService = container.orderService;
    this.eventBusService = container.eventBusService;
  }

  async create(order_id: string) {
    return await this.atomicPhase_(async (manager_) => {
      const repo = manager_.withRepository(this.productReviewRequestRepository_);

      const order = await this.orderService.retrieve(order_id);

      if (!order) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found");

      const request = await repo.save(repo.create({ order_id }));

      await this.eventBusService.withTransaction(manager_).emit(ProductReviewRequestService.Events.CREATED, {
        id: request.id,
        order_id: request.order_id,
      });

      return request;
    });
  }

  async retrieve(requestId: string, config: FindConfig<ProductReviewRequest> = {}): Promise<ProductReviewRequest> {
    const repo = this.activeManager_.withRepository(this.productReviewRequestRepository_);

    if (!isDefined(requestId)) throw new MedusaError(MedusaError.Types.NOT_FOUND, `"requestId" must be defined`);

    const query = buildQuery({ id: requestId }, config);

    const request = await repo.findOne(query);

    return request;
  }

  public async list(
    selector: Selector<ProductReviewRequest> = {},
    config?: FindConfig<ProductReviewRequest>
  ): Promise<ProductReviewRequest[]> {
    const repo = this.activeManager_.withRepository(this.productReviewRequestRepository_);

    const query = buildQuery(selector, config);

    return await repo.find(query);
  }

  async listAndCount(
    selector: Selector<ProductReviewRequest>,
    config: FindConfig<ProductReviewRequest>
  ): Promise<[ProductReviewRequest[], number]> {
    const repo = this.activeManager_.withRepository(this.productReviewRequestRepository_);

    const query = buildQuery(selector, config);

    return await repo.findAndCount(query);
  }

  async delete(id: string) {
    return await this.atomicPhase_(async (manager_) => {
      const repo = manager_.withRepository(this.productReviewRequestRepository_);

      await repo.delete(id);

      await this.eventBusService.withTransaction(manager_).emit(ProductReviewRequestService.Events.DELETED, { id });
    });
  }
}

export default ProductReviewRequestService;
