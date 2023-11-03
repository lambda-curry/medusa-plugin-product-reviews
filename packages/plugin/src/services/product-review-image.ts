import FileService from "@medusajs/medusa/dist/services/file";
import axios from "axios";
import { Image, TransactionBaseService } from "@medusajs/medusa";
import ImageRepository from "@medusajs/medusa/dist/repositories/image";
import { EntityManager } from "typeorm";
import { parse } from "path";
import fs from "fs";
import { NodeOnDiskFile, convertToExpressMulterFile } from "../types/file";

type InjectedDependencies = {
  manager: EntityManager;
  fileService: FileService;
  imageRepository: typeof ImageRepository;
};

class ProductReviewImageService extends TransactionBaseService {
  static readonly resolutionKey = "productReviewImageService";
  protected readonly fileService: FileService;
  private readonly imageRepository_: typeof ImageRepository;

  constructor(container: InjectedDependencies) {
    super(arguments[0]);

    this.manager_ = container.manager;
    this.imageRepository_ = container.imageRepository;
    this.fileService = container.fileService;
  }

  async upsert(images: string[]): Promise<Image[]> {
    return await this.atomicPhase_(async (transaction) => {
      const repo = transaction.withRepository(this.imageRepository_);
      if (!images || images.length < 1) {
        return [];
      }

      return await repo.upsertImages(images);
    });
  }

  async createOrRetrieve(url: string): Promise<Image> {
    return await this.atomicPhase_(async (transaction) => {
      const repo = transaction.withRepository(this.imageRepository_);
      const existingImage = await repo.findOneBy({ url });
      if (existingImage) return existingImage;

      return await repo.save(repo.create({ url }));
    });
  }

  async importViaUrl(importUrl: string): Promise<Image> {
    const data = parse(importUrl);
    const response = await axios.get(importUrl, { responseType: "stream" });

    const { writeStream, url, promise } = await this.fileService.getUploadStreamDescriptor({
      usePrivateBucket: false,
      name: `${data.name}-${Date.now()}`,
      ext: data.ext.replace(".", ""),
      acl: "public-read",
      contentType: response.headers["content-type"],
    });

    await new Promise((resolve, reject) => {
      response.data
        .pipe(writeStream)
        .on("error", reject)
        .once("close", () => resolve(null));
    });

    return await this.createOrRetrieve(url);
  }
}

export default ProductReviewImageService;
