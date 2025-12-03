import mongoose from 'mongoose';

const helpSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('HelpRequest', helpSchema);