import connectDB from "./schemas/db.js";
import dotenv from 'dotenv'
import todoRoute from "./routes/todo.route.js"
import express from 'express';
import cors from 'cors';
const app = express();
dotenv.config();

connectDB();


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//cors
const allowedOrigins = ["http://localhost:5173"];
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // Allow credentials
};

app.use(cors(corsOptions));
app.use("/api/v1/todo", todoRoute);


app.listen(8000, () => {
    console.log(`server listening on port`);
})
