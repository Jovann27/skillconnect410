import express from 'express';
import { getHelpTopics, createHelpTopic, deleteHelpTopic } from '../controllers/helpController.js';

const router = express.Router();


router.get('/help', getHelpTopics);
router.post('/create-help-topics', createHelpTopic);
router.delete('/delete-help-topics/:id', deleteHelpTopic);

export default router;
