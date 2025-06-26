import cors from "cors";
import type { Application } from "express";
import express from "express";
import { connectDB } from "./db";
import { env } from "./env";
import router from "./routes";

const app: Application = express();
app.use(express.json());
app.use(cors());

connectDB();

app.use(router);

app.listen(env.PORT, () => {
  console.log(`Servidor rodando na porta ${env.PORT}`);
});
