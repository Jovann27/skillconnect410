import ServiceRequest from "../models/serviceRequest.js";

// Function to check and update expired service requests
export const checkAndUpdateExpiredRequests = async () => {
  try {
    const now = new Date();

    // Find all requests that are expired and still in "Waiting" status
    const expiredRequests = await ServiceRequest.find({
      status: "Waiting",
      expiresAt: { $lt: now }
    });

    if (expiredRequests.length > 0) {
      // Update all expired requests to "No Longer Available"
      await ServiceRequest.updateMany(
        {
          status: "Waiting",
          expiresAt: { $lt: now }
        },
        {
          status: "No Longer Available"
        }
      );

      console.log(`Updated ${expiredRequests.length} expired service requests to "No Longer Available"`);
    }

    return expiredRequests.length;
  } catch (error) {
    console.error("Error checking and updating expired requests:", error);
    return 0;
  }
};

// Function to get only active (non-expired) requests
export const getActiveRequestsFilter = () => {
  const now = new Date();
  return {
    $or: [
      { status: { $ne: "Waiting" } }, // Include all non-waiting requests
      {
        status: "Waiting",
        expiresAt: { $gt: now } // Only include waiting requests that haven't expired
      }
    ]
  };
};
