import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env

console.log("CLIENT_ID geladen:", process.env.BULLHORN_CLIENT_ID ? process.env.BULLHORN_CLIENT_ID.slice(0, 8) + "..." : "ONTBREEKT ❌");
import express from "express";
import cors from "cors";
import jobRouter from "./routes/job.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/bullhorn", jobRouter);

app.listen(PORT, () => {
  console.log(`Bullhorn API server running on http://localhost:${PORT}`);
});
