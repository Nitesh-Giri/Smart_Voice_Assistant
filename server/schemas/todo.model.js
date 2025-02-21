import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
    // todoList:[
    //     {
    //         type:String
    //         // default: []
    //     }
    // ]
    todoList:{
        type:String
    }
    
},{timestamps: true})

export const Todo = mongoose.model('Todo', todoSchema);