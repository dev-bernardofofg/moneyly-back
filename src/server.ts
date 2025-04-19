import type { Application } from 'express';
import { connectDB } from './config/db';
import express from 'express';
import cors from 'cors';
import router from './routes';

const app: Application = express();
app.use(express.json());
app.use(cors());

connectDB();

app.use(router);

app.listen(process.env.PORT, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT}`);
});
