import dotenv from "dotenv";
import path from "path";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

console.log("Werkmap:", root);
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
