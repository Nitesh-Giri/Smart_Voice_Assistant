import express from "express";
import { addTodo } from "../controllers/todo.controller.js";

const router = express.Router();

router.route('/add').post(addTodo);

export default router;