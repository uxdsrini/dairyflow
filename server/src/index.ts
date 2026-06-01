import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './config/firebase-admin';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`DairyFlow Backend Server running on http://localhost:${PORT}`);
});
