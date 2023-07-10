import { BaseResource, ResponsePromise } from "@medusajs/medusa-js";
import { ProductReviewUploadImageRes } from "./types";

export class ProductReviewUploadsResource extends BaseResource {
  private headers = {
    "Content-Type": "multipart/form-data",
  };

  async create(file: File | File[]): ResponsePromise<ProductReviewUploadImageRes> {
    const path = `/store/product-reviews/uploads`;

    const payload = this._createPayload(file);

    return this.client.request("POST", path, payload, {}, this.headers);
  }

  private _createPayload(file: File | File[]) {
    const payload = new FormData();

    if (Array.isArray(file)) {
      file.forEach((f) => payload.append("files", f));
    } else {
      payload.append("files", file);
    }

    return payload;
  }
}
