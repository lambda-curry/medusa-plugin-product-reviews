import { IFileService, wrapHandler } from "@medusajs/medusa";
import { RouteConfig } from "..";
import { Request, Response } from "express";
import fs from "fs";
import multer from "multer";

const upload = multer({ dest: "uploads/" });

export const routes: RouteConfig[] = [
  {
    requiredAuth: false,
    path: "/store/product-reviews/upload",
    method: "post",
    handlers: [upload.array("files"), wrapHandler(uploadImage)],
  },
];

async function uploadImage(req: Request, res: Response) {
  const fileService = req.scope.resolve<IFileService>("fileService");

  const files = Array.isArray(req.files) ? req.files : Object.values(req.files);
  const result = await Promise.all(
    files.map(async (f) => {
      return fileService.upload(f).then((result) => {
        fs.unlinkSync(f.path);
        return result;
      });
    })
  );

  res.status(200).json({ uploads: result });
}

export class IAdminPostUploadsFileReq {
  originalName: string;
  path: string;
}
