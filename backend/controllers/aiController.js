import { generateAIRecommendations } from '../utils/aiService.js';
import { catchAsyncError } from '../middlewares/catchAsyncError.js';
import { io } from '../server.js';

export const getAIRecommendations = catchAsyncError(async (req, res) => {
  try {
    // Get analytics data from request body
    const analyticsData = req.body;
    
    console.log('🔵 AI Controller received request');
    console.log('📦 Request body:', JSON.stringify(analyticsData, null, 2));

    if (!analyticsData || !analyticsData.totals) {
      console.error('❌ Analytics data missing or invalid');
      return res.status(400).json({
        success: false,
        message: 'Analytics data is required'
      });
    }

    // Generate AI recommendations
    console.log('🤖 Calling generateAIRecommendations...');
    const recommendations = await generateAIRecommendations(analyticsData);

    console.log('✅ Recommendations generated:', JSON.stringify(recommendations, null, 2));

    // Emit real-time recommendations to all connected admin users
    if (io) {
      console.log('📡 Emitting AI recommendations to admin users...');
      io.emit('ai-recommendations-update', {
        recommendations,
        analyticsData,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    console.error('❌ AI Recommendations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI recommendations',
      error: error.message
    });
  }
});
