import { MedusaContainer } from "@medusajs/medusa";
import loaders from "@medusajs/medusa/dist/loaders/index";
import express from "express";

export const loadEnv = () => {
  const dotenv = require("dotenv");
  const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env";
  dotenv.config({ path: envFile });
};

loadEnv();

export async function loadMedusa(app: express.Express): Promise<MedusaContainer> {
  const { container } = await loaders({
    directory: process.cwd(),
    expressApp: app,
    isTest: false,
  });

  return container;
}

async function bootstrap() {
  const port = process.env.PORT || 9000;
  const expressInstance = express();

  await loadMedusa(expressInstance);

  expressInstance.listen(port, () => {
    console.info("Server successfully started on port " + port);
  });
}

bootstrap();
