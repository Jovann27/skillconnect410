import express from 'express';
import { getHelpTopics, createHelpTopic, deleteHelpTopic } from '../controllers/helpController.js';
import { validateSchema, handleValidationErrors } from '../middlewares/validation.js';
import { helpTopicSchema } from '../validators/schemas.js';

const router = express.Router();


router.get('/help', getHelpTopics);
router.post('/create-help-topics', validateSchema(helpTopicSchema), handleValidationErrors, createHelpTopic);
router.delete('/delete-help-topics/:id', deleteHelpTopic);

export default router;
