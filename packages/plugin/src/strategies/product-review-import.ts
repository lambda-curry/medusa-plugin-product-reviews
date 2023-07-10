import {
  AbstractBatchJobStrategy,
  BatchJob,
  BatchJobService,
  CreateBatchJobInput,
  IFileService,
  Image,
  RegionService,
  SalesChannelService,
} from "@medusajs/medusa";
import CsvParser from "@medusajs/medusa/dist/services/csv-parser";
import { FlagRouter } from "@medusajs/medusa/dist/utils/flag-router";
import { Request } from "express";
import { MedusaError } from "medusa-core-utils";
import { productReviewImportColumnsDefinition } from "./product-review/helpers";
import {
  OperationType,
  ProductReviewImportBatchJob,
  ProductReviewImportCsvSchema,
  ProductReviewImportJobContext,
  TParsedProductReviewImportRowData,
} from "./product-review/types";
import { ProductReviewImageService, ProductReviewService } from "../services";
import { EntityManager } from "typeorm";
import { UpdateProductReviewInput } from "../types/product-review";

/**
 * Process this many productReview rows before reporting progress.
 */
const BATCH_SIZE = 15;

export type ProductReviewImportInjectedProps = {
  batchJobService: BatchJobService;
  productReviewService: ProductReviewService;
  fileService: IFileService;
  featureFlagRouter: FlagRouter;
  manager: EntityManager;
  productReviewImageService: ProductReviewImageService;
};

/**
 * Default strategy class used for a batch import of productReviews/variants.
 */
export class ProductReviewImportStrategy extends AbstractBatchJobStrategy {
  static identifier = "product-review-import-strategy";
  static batchType = "product-review-import";

  private processedCounter: Record<string, number> = {};
  protected readonly featureFlagRouter_: FlagRouter;
  protected manager_: EntityManager;
  protected transactionManager_: EntityManager | undefined;

  protected readonly fileService_: IFileService;
  protected readonly regionService_: RegionService;
  protected readonly productReviewService_: ProductReviewService;
  protected readonly batchJobService_: BatchJobService;
  protected readonly salesChannelService_: SalesChannelService;
  protected readonly imageService_: ProductReviewImageService;

  protected readonly csvParser_: CsvParser<
    ProductReviewImportCsvSchema,
    Record<string, string>,
    Record<string, string>
  >;

  constructor({
    batchJobService,
    productReviewService,
    fileService,
    productReviewImageService,
    manager,
    featureFlagRouter,
  }: ProductReviewImportInjectedProps) {
    // eslint-disable-next-line prefer-rest-params
    super(arguments[0]);

    this.csvParser_ = new CsvParser({
      columns: [...productReviewImportColumnsDefinition.columns],
      delimiter: ",",
    });

    this.featureFlagRouter_ = featureFlagRouter;

    this.manager_ = manager;
    this.fileService_ = fileService;
    this.batchJobService_ = batchJobService;
    this.productReviewService_ = productReviewService;
    this.imageService_ = productReviewImageService;
  }

  //Not currently required because we are not requiring any extra context
  async prepareBatchJobForProcessing(batchJob: CreateBatchJobInput, reqContext: Request): Promise<CreateBatchJobInput> {
    return batchJob;
  }

  /**
   * A worker method called after a batch job has been created.
   * The method parses a CSV file, generates sets of instructions
   * for processing and stores these instructions to a JSON file
   * which is uploaded to a bucket.
   *
   * @param batchJobId - An id of a job that is being preprocessed.
   */
  async preProcessBatchJob(batchJobId: string): Promise<void> {
    const transactionManager = this.transactionManager_ ?? this.manager_;
    const batchJob = await this.batchJobService_.withTransaction(transactionManager).retrieve(batchJobId);

    const csvFileKey = (batchJob.context as ProductReviewImportJobContext).fileKey;

    const csvStream = await this.fileService_.getDownloadStream({
      fileKey: csvFileKey,
    });

    let builtData: Record<string, string>[];
    try {
      const parsedData = await this.csvParser_.parse(csvStream);
      builtData = await this.csvParser_.buildData(parsedData);
    } catch (e) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "The csv file parsing failed due to: " + e.message);
    }

    const ops = await this.getImportInstructions(builtData);

    await this.uploadImportOpsFile(batchJobId, ops);

    let totalOperationCount = 0;
    const operationsCounts = {};
    Object.keys(ops).forEach((key) => {
      operationsCounts[key] = ops[key].length;
      totalOperationCount += ops[key].length;
    });

    await this.batchJobService_.withTransaction(transactionManager).update(batchJobId, {
      result: {
        advancement_count: 0,
        // number of update/create operations to execute
        count: totalOperationCount,
        operations: operationsCounts,
        stat_descriptors: [
          {
            key: "product-review-import-count",
            name: "Product reviews to import",
            message: `There will be ${ops[OperationType.ProductReviewCreate].length} product reviews created`,
          },
        ],
      },
    });
  }

  /**
   * The main processing method called after a batch job
   * is ready/confirmed for processing.
   *
   * @param batchJobId - An id of a batch job that is being processed.
   */
  async processJob(batchJobId: string): Promise<void> {
    return await this.atomicPhase_(async (manager) => {
      const batchJob = (await this.batchJobService_
        .withTransaction(manager)
        .retrieve(batchJobId)) as ProductReviewImportBatchJob;

      await this.createProductReviews(batchJob);
      await this.finalize(batchJob);
    });
  }

  /**
   * Generate instructions for update/create of productReviews/variants from parsed CSV rows.
   *
   * @param csvData - An array of parsed CSV rows.
   */
  async getImportInstructions(
    csvData: TParsedProductReviewImportRowData[]
  ): Promise<Record<OperationType, TParsedProductReviewImportRowData[]>> {
    const seenProductReviews = {};
    const productReviewsCreate: TParsedProductReviewImportRowData[] = [];
    const productReviewsUpdate: TParsedProductReviewImportRowData[] = [];

    for (const row of csvData) {
      // save only first occurrence if there is an id
      if (!seenProductReviews[row["product_review.handle"] as string]) {
        if (row["product_review.id"]) {
          productReviewsUpdate.push(row);
        } else {
          productReviewsCreate.push(row);
        }

        seenProductReviews[row["product_review.id"] as string] = true;
      }
    }

    return {
      [OperationType.ProductReviewCreate]: productReviewsCreate,
      [OperationType.ProductReviewUpdate]: productReviewsUpdate,
    };
  }

  private async importImage(imageUrl?: string): Promise<Image | undefined> {
    if (!imageUrl) return undefined;
    try {
      const image = await this.imageService_.importViaUrl(imageUrl);
      return image;
    } catch (ex) {
      console.warn("Failed to import image", imageUrl, ex);
      return undefined;
    }
  }

  private async prepareProductReview(row: TParsedProductReviewImportRowData) {
    const { product_id, product_variant_id, customer_id, rating, content, images } = row as Partial<
      Omit<UpdateProductReviewInput, "images"> & { images: string[] }
    >;

    const productReviewData = {
      product_id,
      product_variant_id,
      customer_id,
      rating,
      content,
      images,
    };

    return productReviewData;
  }

  private async createProductReview(row: TParsedProductReviewImportRowData): Promise<void> {
    const transactionManager = this.transactionManager_ ?? this.manager_;
    const productReviewServiceTx = this.productReviewService_.withTransaction(transactionManager);

    const productReviewData = await this.prepareProductReview(row);

    try {
      const productReview = await productReviewServiceTx.create(productReviewData);
    } catch (e) {
      ProductReviewImportStrategy.throwDescriptiveError(row, e.message);
    }
  }

  /**
   * Method creates productReviews using `ProductReviewService` and parsed data from a CSV row.
   *
   * @param batchJob - The current batch job being processed.
   */
  private async createProductReviews(batchJob: ProductReviewImportBatchJob): Promise<void> {
    if (!batchJob.result.operations[OperationType.ProductReviewCreate]) {
      return;
    }

    const productReviewOps = await this.downloadImportOpsFile(batchJob.id, OperationType.ProductReviewCreate);

    for (const productReviewOp of productReviewOps) {
      await this.createProductReview(productReviewOp);
      await this.updateProgress(batchJob.id);
    }
  }

  /**
   * Store import ops JSON file to a bucket.
   *
   * @param batchJobId - An id of the current batch job being processed.
   * @param results - An object containing parsed CSV data.
   */
  protected async uploadImportOpsFile(
    batchJobId: string,
    results: Record<OperationType, TParsedProductReviewImportRowData[]>
  ): Promise<void> {
    const uploadPromises: Promise<void>[] = [];
    const transactionManager = this.transactionManager_ ?? this.manager_;

    for (const op in results) {
      if (results[op]?.length) {
        const { writeStream, promise } = await this.fileService_
          .withTransaction(transactionManager)
          .getUploadStreamDescriptor({
            name: ProductReviewImportStrategy.buildFilename(batchJobId, op),
            ext: "json",
          });

        uploadPromises.push(promise);

        writeStream.write(JSON.stringify(results[op]));
        writeStream.end();
      }
    }

    await Promise.all(uploadPromises);
  }

  /**
   * Remove parsed ops JSON file.
   *
   * @param batchJobId - An id of the current batch job being processed.
   * @param op - Type of import operation.
   */
  protected async downloadImportOpsFile(
    batchJobId: string,
    op: OperationType
  ): Promise<TParsedProductReviewImportRowData[]> {
    let data = "";
    const transactionManager = this.transactionManager_ ?? this.manager_;

    const readableStream = await this.fileService_.withTransaction(transactionManager).getDownloadStream({
      fileKey: ProductReviewImportStrategy.buildFilename(batchJobId, op, {
        appendExt: ".json",
      }),
    });

    return await new Promise((resolve) => {
      readableStream.on("data", (chunk) => {
        data += chunk;
      });
      readableStream.on("end", () => {
        resolve(JSON.parse(data));
      });
      readableStream.on("error", () => {
        resolve([] as TParsedProductReviewImportRowData[]);
      });
    });
  }

  /**
   * Delete parsed CSV ops files.
   *
   * @param batchJobId - An id of the current batch job being processed.
   */
  protected async deleteOpsFiles(batchJobId: string): Promise<void> {
    const transactionManager = this.transactionManager_ ?? this.manager_;

    const fileServiceTx = this.fileService_.withTransaction(transactionManager);
    for (const op of Object.values(OperationType)) {
      try {
        await fileServiceTx.delete({
          fileKey: ProductReviewImportStrategy.buildFilename(batchJobId, op, {
            appendExt: ".json",
          }),
        });
      } catch (e) {
        // noop
      }
    }
  }

  /**
   * Update count of processed data in the batch job `result` column
   * and cleanup temp JSON files.
   *
   * @param batchJob - The current batch job being processed.
   */
  private async finalize(batchJob: BatchJob): Promise<void> {
    const transactionManager = this.transactionManager_ ?? this.manager_;

    delete this.processedCounter[batchJob.id];

    await this.batchJobService_.withTransaction(transactionManager).update(batchJob.id, {
      result: { advancement_count: batchJob.result.count },
    });

    const { fileKey } = batchJob.context as ProductReviewImportJobContext;

    await this.fileService_.withTransaction(transactionManager).delete({ fileKey });

    await this.deleteOpsFiles(batchJob.id);
  }

  /**
   * Store the progress in the batch job `result` column.
   * Method is called after every update/create operation,
   * but after every `BATCH_SIZE` processed rows info is written to the DB.
   *
   * @param batchJobId - An id of the current batch job being processed.
   */
  private async updateProgress(batchJobId: string): Promise<void> {
    const newCount = (this.processedCounter[batchJobId] || 0) + 1;
    this.processedCounter[batchJobId] = newCount;
    if (newCount % BATCH_SIZE !== 0) {
      return;
    }

    await this.batchJobService_.withTransaction(this.transactionManager_ ?? this.manager_).update(batchJobId, {
      result: {
        advancement_count: newCount,
      },
    });
  }

  private static buildFilename(
    batchJobId: string,
    operation: string,
    { appendExt }: { appendExt?: string } = { appendExt: undefined }
  ): string {
    const filename = `imports/product-reviews/ops/${batchJobId}-${operation}`;
    return appendExt ? filename + appendExt : filename;
  }

  /**
   * Create a description of a row on which the error occurred and throw a Medusa error.
   *
   * @param row - Parsed CSV row data
   * @param errorDescription - Concrete error
   */
  protected static throwDescriptiveError(row: TParsedProductReviewImportRowData, errorDescription?: string): never {
    const message = `Error while processing row with:
        title: ${row["productReview.title"]}
        ${errorDescription}`;

    throw new MedusaError(MedusaError.Types.INVALID_DATA, message);
  }

  // Just included to match parent class
  async buildTemplate(): Promise<string> {
    throw new Error("Not implemented!");
  }
}

export default ProductReviewImportStrategy;
