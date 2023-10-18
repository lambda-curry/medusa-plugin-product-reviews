import { BatchJob } from "@medusajs/medusa";
import { CsvSchema, CsvSchemaColumn } from "@medusajs/medusa/dist/interfaces/csv-parser";

/**
 * Import Batch job context column type.
 */
export type ProductReviewImportJobContext = {
  total: number;
  fileKey: string;
};

export type ProductReviewImportBatchJob = BatchJob & {
  result: Pick<BatchJob, "result"> & {
    operations: {
      [K in keyof typeof OperationType]: number;
    };
  };
};

/**
 * Schema definition of for an import CSV file.
 */
export type ProductReviewImportCsvSchema = CsvSchema<TParsedProductReviewImportRowData, TBuiltProductReviewImportLine>;

/**
 * Supported batch job import ops.
 */
export enum OperationType {
  ProductReviewCreate = "PRODUCT_REVIEW_CREATE",
  ProductReviewUpdate = "PRODUCT_REVIEW_UPDATE",
}

/**
 * Data shape returned by the CSVParser.
 */
export type TParsedProductReviewImportRowData = Record<
  string,
  string | number | object | undefined | (string | number | object)[]
>;

/**
 * CSV parser's row reducer result data shape.
 */
export type TBuiltProductReviewImportLine = Record<string, any>;

export type ProductReviewImportDescriptor = CsvSchemaColumn<
  TParsedProductReviewImportRowData,
  TBuiltProductReviewImportLine,
  true
>;

export type ProductReviewColumnDefinition = {
  [key: string]: {
    name: string;
    importDescriptor?: ProductReviewImportDescriptor;
  };
};
