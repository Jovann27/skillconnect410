import HelpRequest from "../models/helpSchema.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";

export const getHelpTopics = catchAsyncError(async (req, res) => {
    const topics = await HelpRequest.find().sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        topics,
    });
});

export const createHelpTopic = catchAsyncError(async (req, res, next) => {
    if (!req.admin) 
        return next(new ErrorHandler("Only admins can create help topics", 403));

    const { title, description, category } = req.body;    
    if (!title || !description || !category ) {
        return next(new ErrorHandler("Please provide all fields", 400));
    }

    const newTopic = await HelpRequest.create({
        title,
        description,
        category,
    });

    res.status(201).json({
        success: true,
        topic: newTopic,
    });
});

export const deleteHelpTopic = catchAsyncError(async (req, res, next) => {
    if (!req.admin) 
        return next(new ErrorHandler("Only admins can delete help topics", 403));   
    const topic = await HelpRequest.findById(req.params.id);
    if (!topic) {
        return next(new ErrorHandler("Help topic not found", 404));
    }

    await topic.remove();

    res.status(200).json({
        success: true,
        message: "Help topic deleted successfully",
    });
});
