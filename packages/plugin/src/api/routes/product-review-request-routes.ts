import wrapHandler from "@medusajs/medusa/dist/api/middlewares/await-middleware";
import { Request, Response } from "express";
import { RouteConfig } from "..";
import { ProductReviewRequestService } from "../../services";

export const routes: RouteConfig[] = [
  {
    requiredAuth: false,
    path: "/store/product-review-requests/:id",
    method: "get",
    handlers: [wrapHandler(getClientRequest)],
  },
];

export const defaultReviewRequestRelations = ["order"];

async function getClientRequest(req: Request, res: Response) {
  const productReviewRequestService = req.scope.resolve<ProductReviewRequestService>("productReviewRequestService");
  const reviewRequest = await productReviewRequestService.retrieve(req.params.id);

  res.status(200).json({ reviewRequest });
}
