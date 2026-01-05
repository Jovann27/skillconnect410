import React, { useState, useEffect } from "react";
import { getImageUrl } from "../utils/imageUtils";

const ImageTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Test images from different sources
  const testImages = [
    // Public directory images
    { name: "SkillConnect Logo", path: "/skillconnect.png", type: "public" },
    { name: "Default Profile", path: "/default-profile.png", type: "public" },
    { name: "Records Icon", path: "/records.png", type: "public" },
    
    // Home component images
    { name: "Chairwoman", path: "./components/Home/images/Chairwoman.png", type: "import" },
    { name: "SK Chairwoman", path: "./components/Home/images/skChiarwoman.png", type: "import" },
    { name: "Kagwadomar", path: "./components/Home/images/Kagwadomar.png", type: "import" },
    { name: "Treasurer", path: "./components/Home/images/treasurer.png", type: "import" },
    { name: "Fired", path: "./components/Home/images/Fired.png", type: "import" },
    { name: "DSC_0028", path: "./components/Home/images/DSC_0028-removebg-preview.png", type: "import" },
    { name: "DSC_9666", path: "./components/Home/images/DSC_9666-removebg-preview.png", type: "import" },
    { name: "DSC_9677", path: "./components/Home/images/DSC_9677-removebg-preview.png", type: "import" },
    { name: "DSC_9822", path: "./components/Home/images/DSC_9822-removebg-preview.png", type: "import" },
    { name: "DSC_9860", path: "./components/Home/images/DSC_9860-removebg-preview (1).png", type: "import" },
    { name: "DSC_9875", path: "./components/Home/images/DSC_9875-removebg-preview.png", type: "import" },
    
    // Backend uploaded images (sample paths)
    { name: "Profile Pic 1", path: "/uploads/profilePic_1764771379571_nx4p4.jpg", type: "backend" },
    { name: "Profile Pic 2", path: "/uploads/profilePic_1764772374074_wjpf4s.png", type: "backend" },
    { name: "Valid ID 1", path: "/uploads/validId_1764772374072_fepau.png", type: "backend" },
    { name: "Certificate 1", path: "/uploads/certificate_1764815472696_zpvk8a.png", type: "backend" },
  ];

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ src, status: 'success', size: `${img.naturalWidth}x${img.naturalHeight}` });
      img.onerror = () => reject({ src, status: 'error' });
      img.src = src;
    });
  };

  const runImageTest = async () => {
    setLoading(true);
    const results = [];

    for (const image of testImages) {
      try {
        let src;
        if (image.type === "import") {
          // For imported images, we need to use the actual import
          // This is a simplified test - in reality, imported images are handled by webpack
          src = image.path;
        } else if (image.type === "public") {
          src = image.path;
        } else if (image.type === "backend") {
          src = getImageUrl(image.path);
        }

        const result = await loadImage(src);
        results.push({
          ...image,
          ...result,
          status: 'success'
        });
      } catch (error) {
        results.push({
          ...image,
          status: 'error',
          error: error.message || 'Failed to load'
        });
      }
    }

    setTestResults(results);
    setLoading(false);
  };

  useEffect(() => {
    runImageTest();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Image Loading Test</h1>
          <p className="text-gray-600 mb-4">
            Testing all image sources in the application to ensure proper loading and display.
          </p>
          <button
            onClick={runImageTest}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run Image Test'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testResults.map((result, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{result.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(result.status)}`}>
                    {result.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Type:</span> {result.type}
                </div>
                
                {result.type === "import" ? (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Path:</span> {result.path}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">URL:</span> {result.src}
                  </div>
                )}

                {result.status === 'success' && result.size && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Size:</span> {result.size}
                  </div>
                )}

                {result.status === 'error' && result.error && (
                  <div className="text-sm text-red-600 mb-2">
                    <span className="font-medium">Error:</span> {result.error}
                  </div>
                )}

                {result.status === 'success' && result.type !== "import" && (
                  <div className="mt-2">
                    <img
                      src={result.src}
                      alt={result.name}
                      className="w-full h-32 object-cover rounded-md border"
                      onError={(e) => {
                        e.target.src = '/default-profile.png';
                        e.target.alt = 'Fallback image';
                      }}
                    />
                  </div>
                )}

                {result.type === "import" && (
                  <div className="mt-2 text-sm text-gray-500">
                    Imported images are handled by webpack bundler
                  </div>
                )}
              </div>
            ))}
          </div>

          {testResults.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
              <div className="flex space-x-4 text-sm">
                <span className="text-green-600">
                  Success: {testResults.filter(r => r.status === 'success').length}
                </span>
                <span className="text-red-600">
                  Errors: {testResults.filter(r => r.status === 'error').length}
                </span>
                <span className="text-gray-600">
                  Total: {testResults.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageTest;
