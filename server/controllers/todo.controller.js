import {Todo} from '../schemas/todo.model.js'

export const addTodo = async(req,res) =>{
    try {
        const todoList = req.body; 
        const n = todoList.todoList.length;
        await Todo.create({todoList:todoList.todoList[n-1]});
        res.status(201).json(
            todoList
        );
        console.log(n);
    } catch (error) {
        res.status(400).json({ message: error.message});
    }
}
