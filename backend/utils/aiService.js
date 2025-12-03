import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export const generateAIRecommendations = async (analyticsData) => {
  console.log('AI Service called with analytics data:', JSON.stringify(analyticsData, null, 2));
  try {
    const prompt = `You are an expert AI consultant for a barangay (local community) skill-sharing platform called SkillConnect. Based on the following system analytics data, provide intelligent, actionable recommendations for:

1. Barangay Projects - Infrastructure and facility development based on community needs
2. Skills Training Programs - Education and training initiatives to address skills gaps
3. Community Programs - Inclusive programs for different community segments
4. Priority Actions - Immediate steps to implement recommendations

ANALYTICS DATA:
- Total Users: ${analyticsData.totals?.totalUsers || 0}
- Service Providers: ${analyticsData.totals?.serviceProviders || 0}
- Total Population: ${analyticsData.totals?.totalPopulation || 0}
- Employment Rate: ${(() => {
  const worker = analyticsData.demographics?.employment?.worker || 0;
  const nonWorker = analyticsData.demographics?.employment?.nonWorker || 0;
  const total = worker + nonWorker;
  return total > 0 ? ((worker / total) * 100).toFixed(1) : 0;
})()}%
- Total Service Bookings: ${analyticsData.totalBookings || 0}
- Active Users: ${analyticsData.activeUsers || 0}
- User Growth Rate (last period): ${(() => {
  const values = analyticsData.totalsOverTime?.values || [];
  if (values.length > 1) {
    const growth = ((values[values.length - 1] - values[values.length - 2]) / (values[values.length - 2] || 1)) * 100;
    return growth.toFixed(1);
  }
  return 0;
})()}%

AGE DISTRIBUTION:
${Object.entries(analyticsData.demographics?.ageGroups || {}).map(([age, count]) => `${age}: ${count} users`).join('\n')}

TOP SKILLS:
${Object.entries(analyticsData.skills || {}).slice(0, 10).map(([skill, count]) => `${skill}: ${count} users`).join('\n')}

POPULAR SERVICES:
${(analyticsData.popularServices || []).slice(0, 10).map(service => `${service.service}: ${service.count} bookings`).join('\n')}

SERVICE PROVIDER ROLES:
${Object.entries(analyticsData.skilledPerTrade?.byRole || {}).map(([role, count]) => `${role}: ${count} providers`).join('\n')}

Please provide recommendations in the following JSON format:
{
  "barangayProjects": [
    {
      "title": "Project Title",
      "description": "Brief description",
      "priority": "High/Medium/Low/Critical",
      "impact": "Economic/Social/Educational",
      "rationale": "Why this project based on the data",
      "estimatedCost": "Cost range in PHP",
      "timeline": "Timeframe for completion"
    }
  ],
  "skillsTraining": [
    {
      "title": "Program Title",
      "description": "Brief description",
      "targetAudience": "Who should participate",
      "duration": "Program duration",
      "expectedParticipants": number,
      "priority": "High/Medium/Low/Critical",
      "rationale": "Why this program based on the data",
      "skills": ["skill1", "skill2", "skill3"]
    }
  ],
  "communityPrograms": [
    {
      "title": "Program Title",
      "description": "Brief description",
      "targetGroup": "Target demographic",
      "focus": "Program focus area",
      "duration": "Program duration",
      "rationale": "Why this program based on the data"
    }
  ],
  "priorityActions": [
    {
      "action": "Action Title",
      "description": "Brief description",
      "timeline": "When to implement",
      "responsible": "Who is responsible",
      "priority": "High/Medium/Low/Critical"
    }
  ]
}

Ensure recommendations are:
- Data-driven and specific to the barangay context
- Realistic and actionable
- Prioritized appropriately
- Cost-effective where possible
- Focused on community development and skill enhancement
- Use simple, clear language that is easy to understand

Provide 3-5 recommendations per category.

IMPORTANT: Return ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. The response must be parseable as JSON.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    console.log('AI Response:', response);
    console.log('Analytics Data passed to AI:', JSON.stringify(analyticsData, null, 2));

    // Parse the JSON response
    try {
      const recommendations = JSON.parse(response);
      console.log('Parsed AI recommendations:', recommendations);

      // Check if recommendations are empty and provide fallbacks if needed
      if (
        (!recommendations.barangayProjects || recommendations.barangayProjects.length === 0) &&
        (!recommendations.skillsTraining || recommendations.skillsTraining.length === 0) &&
        (!recommendations.communityPrograms || recommendations.communityPrograms.length === 0) &&
        (!recommendations.priorityActions || recommendations.priorityActions.length === 0)
      ) {
        console.log('AI returned empty recommendations, providing fallback recommendations');
        return generateFallbackRecommendations(analyticsData);
      }

      return recommendations;
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw AI response that failed to parse:', response);
      // Fallback to basic recommendations if parsing fails
      return generateFallbackRecommendations(analyticsData);
    }

  } catch (error) {
    console.error('AI Service Error:', error);
    // Return fallback recommendations instead of throwing error
    return generateFallbackRecommendations(analyticsData);
  }
};

// Fallback function to generate basic recommendations when AI fails or returns empty results
const generateFallbackRecommendations = (analyticsData) => {
  console.log('Generating fallback recommendations based on analytics data');

  const recommendations = {
    barangayProjects: [],
    skillsTraining: [],
    communityPrograms: [],
    priorityActions: []
  };

  // Always provide basic barangay projects
  recommendations.barangayProjects.push({
    title: "Community Skills Hub",
    description: "Build a center for skill training and service coordination",
    priority: "High",
    impact: "Educational",
    rationale: `With ${analyticsData.totals?.serviceProviders || 0} providers and ${analyticsData.totalBookings || 0} bookings, a center would improve service delivery`,
    estimatedCost: "PHP 500,000 - 1,000,000",
    timeline: "6-12 months"
  });

  recommendations.barangayProjects.push({
    title: "Digital Literacy Center",
    description: "Create a place for technology training and online service access",
    priority: "Medium",
    impact: "Educational",
    rationale: `Platform has ${analyticsData.totals?.totalUsers || 0} users who could learn digital skills`,
    estimatedCost: "PHP 200,000 - 500,000",
    timeline: "3-6 months"
  });

  // Always provide skills training programs
  const topSkills = Object.entries(analyticsData.skills || {}).slice(0, 3);
  if (topSkills.length > 0) {
    recommendations.skillsTraining.push({
      title: "Advanced Skills Workshop",
      description: `Training in high-demand skills`,
      targetAudience: "Service providers and unemployed people",
      duration: "3 months",
      expectedParticipants: Math.min(analyticsData.totals?.totalUsers || 5, 30),
      priority: "High",
      rationale: `Top skills include ${topSkills.map(([skill]) => skill).join(', ')} - building on existing expertise`,
      skills: topSkills.map(([skill]) => skill)
    });
  } else {
    recommendations.skillsTraining.push({
      title: "Basic Skills Development Program",
      description: "Training in essential skills for community development",
      targetAudience: "People interested in learning skills",
      duration: "3 months",
      expectedParticipants: Math.min(analyticsData.totals?.totalUsers || 5, 20),
      priority: "High",
      rationale: "Building basic skills to support community growth and jobs",
      skills: ["Basic computer skills", "Communication", "Problem solving"]
    });
  }

  recommendations.skillsTraining.push({
    title: "Employment Skills Program",
    description: "Training to improve job prospects",
    targetAudience: "People seeking employment opportunities",
    duration: "6 months",
    expectedParticipants: Math.max(analyticsData.demographics?.employment?.nonWorker || 5, 10),
    priority: "Critical",
    rationale: `${analyticsData.demographics?.employment?.nonWorker || 0} people need skills training for better jobs`,
    skills: ["Basic computer skills", "Communication", "Job search techniques"]
  });

  // Always provide community programs
  recommendations.communityPrograms.push({
    title: "Senior Citizen Technology Program",
    description: "Weekly sessions teaching seniors how to use the platform and access services",
    targetGroup: "Elderly residents (55+ years)",
    focus: "Digital inclusion and social engagement",
    duration: "Ongoing",
    rationale: "Helps seniors benefit from the platform"
  });

  recommendations.communityPrograms.push({
    title: "Youth Skills Mentorship",
    description: "Pair young people with experienced service providers for guidance",
    targetGroup: "Young adults (18-30 years)",
    focus: "Career development and knowledge transfer",
    duration: "6 months",
    rationale: "Uses existing expertise to help the next generation of providers"
  });

  // Always provide priority actions
  recommendations.priorityActions.push({
    action: "Increase User Engagement",
    description: "Use strategies to boost platform usage and service bookings",
    timeline: "Immediate (1-2 weeks)",
    responsible: "Community Coordinator",
    priority: "High"
  });

  recommendations.priorityActions.push({
    action: "Promote Service Providers",
    description: "Marketing campaign to increase visibility of available services",
    timeline: "1-3 months",
    responsible: "Marketing Team",
    priority: "Critical"
  });

  recommendations.priorityActions.push({
    action: "Gather User Feedback",
    description: "Do surveys to understand user needs and platform improvements",
    timeline: "1 month",
    responsible: "Community Coordinator",
    priority: "Medium"
  });

  console.log('Generated fallback recommendations:', recommendations);
  return recommendations;
};
