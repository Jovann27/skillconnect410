import React, { useState, useEffect } from 'react';
import { FaTags, FaInfoCircle, FaSearch, FaUsers, FaStar, FaArrowUp, FaArrowDown, FaEye } from 'react-icons/fa';


const SkillCategories = () => {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredSegment, setHoveredSegment] = useState(null);


  // Sample data - in a real app, this would come from an API call
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const data = [
        {
          id: 1,
          name: 'Plumbing',
          userCount: 156,
          previousUserCount: 142,
          averageRating: 4.7,
          color: '#FF6384',
          popularServices: ['Pipe Repair', 'Installation', 'Maintenance']
        },
        {
          id: 2,
          name: 'Electrical',
          userCount: 132,
          previousUserCount: 125,
          averageRating: 4.8,
          color: '#36A2EB',
          popularServices: ['Wiring', 'Appliance Repair', 'Installation']
        },
        {
          id: 3,
          name: 'Carpentry',
          userCount: 98,
          previousUserCount: 105,
          averageRating: 4.6,
          color: '#FFCE56',
          popularServices: ['Furniture', 'Cabinets', 'Repairs']
        },
        {
          id: 4,
          name: 'Painting',
          userCount: 87,
          previousUserCount: 78,
          averageRating: 4.9,
          color: '#4BC0C0',
          popularServices: ['Interior', 'Exterior', 'Decorative']
        },
        {
          id: 5,
          name: 'Gardening',
          userCount: 76,
          previousUserCount: 82,
          averageRating: 4.5,
          color: '#9966FF',
          popularServices: ['Lawn Care', 'Landscaping', 'Tree Service']
        },
        {
          id: 6,
          name: 'Cleaning',
          userCount: 65,
          previousUserCount: 58,
          averageRating: 4.7,
          color: '#FF9F40',
          popularServices: ['Deep Clean', 'Regular', 'Office']
        },
        {
          id: 7,
          name: 'Appliance Repair',
          userCount: 54,
          previousUserCount: 50,
          averageRating: 4.4,
          color: '#FF6384',
          popularServices: ['Refrigerator', 'Washer', 'Dryer']
        },
        {
          id: 8,
          name: 'Moving',
          userCount: 43,
          previousUserCount: 40,
          averageRating: 4.6,
          color: '#C9CBCF',
          popularServices: ['Local', 'Long Distance', 'Packing']
        }
      ];
     
      // Calculate total for percentage
      const total = data.reduce((sum, item) => sum + item.userCount, 0);
     
      // Add percentage and rank to data
      const processedData = data.map((item, index) => ({
        ...item,
        percentage: ((item.userCount / total) * 100).toFixed(1),
        rank: index + 1
      }));
     
      setCategories(processedData);
      setFilteredCategories(processedData);
      setLoading(false);
    }, 1000);
  }, []);


  // Filter categories based on search term
  useEffect(() => {
    let filtered = categories;
   
    if (searchTerm) {
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.popularServices.some(service =>
          service.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
   
    setFilteredCategories(filtered);
  }, [searchTerm, categories]);


  // Calculate pie chart segments
  const calculatePieChartSegments = () => {
    const total = categories.reduce((sum, item) => sum + item.userCount, 0);
    let currentAngle = -90; // Start from top
   
    return categories.map(category => {
      const percentage = (category.userCount / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;
     
      return {
        ...category,
        startAngle,
        endAngle,
        percentage
      };
    });
  };


  // Convert polar to cartesian coordinates
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };


  // Create SVG path for pie segment
  const createPiePath = (centerX, centerY, radius, startAngle, endAngle) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
   
    return [
      "M", centerX, centerY,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };


  // Calculate trend (up/down/stable)
  const getTrend = (current, previous) => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  };


  // Render star rating
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} className="text-yellow-400 text-xs" />);
    }

    if (hasHalfStar) {
      stars.push(<FaStar key="half" className="text-yellow-400 text-xs opacity-70" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FaStar key={`empty-${i}`} className="text-gray-300 text-xs" />);
    }

    return stars;
  };


  const pieSegments = calculatePieChartSegments();


  return (
    <div className="bg-white rounded-lg p-5 shadow-sm mb-5">
      <div className="flex items-center mb-4">
        <h1 className="text-xl font-semibold text-gray-800 m-0 flex items-center">
          <FaTags className="mr-2.5 text-blue-500" />
          Skill Categories
        </h1>
      </div>

      <p className="text-gray-600 text-sm mb-6 leading-relaxed">
        <FaInfoCircle className="inline mr-1 text-blue-500" />
        This page provides an overview of all skill categories available on the platform.
        Analyze the distribution of service providers across different categories to understand market trends and identify opportunities for growth.
      </p>
       
      {loading ? (
        <div className="flex justify-center items-center h-50">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Charts and Stats Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Pie Chart */}
            <div className="bg-gray-50 rounded-lg p-5 flex flex-col items-center">
              <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center">
                <FaTags className="mr-2 text-blue-500" />
                Category Distribution
              </h2>

              <div className="relative w-64 h-64">
                <svg className="w-full h-full" viewBox="0 0 250 250">
                  {pieSegments.map((segment) => (
                    <path
                      key={segment.id}
                      d={createPiePath(125, 125, 100, segment.startAngle, segment.endAngle)}
                      fill={segment.color}
                      className="cursor-pointer transition-transform hover:scale-105 hover:brightness-110"
                      onMouseEnter={() => setHoveredSegment(segment)}
                      onMouseLeave={() => setHoveredSegment(null)}
                    />
                  ))}
                </svg>

                {hoveredSegment && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 text-white p-2 rounded text-xs pointer-events-none z-50">
                    <div>{hoveredSegment.name}</div>
                    <div>{hoveredSegment.userCount} users ({hoveredSegment.percentage}%)</div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-2.5 mt-5">
                {categories.map(category => (
                  <div key={category.id} className="flex items-center text-xs">
                    <div
                      className="w-3 h-3 rounded-sm mr-1.5"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span>{category.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Container */}
            <div className="bg-gray-50 rounded-lg p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center">
                <FaUsers className="mr-2 text-blue-500" />
                Category Statistics
              </h2>

              <div className="flex justify-between py-2.5 border-b border-gray-200 last:border-b-0">
                <span className="font-medium text-gray-600">Total Categories</span>
                <span className="font-semibold text-gray-800">{categories.length}</span>
              </div>

              <div className="flex justify-between py-2.5 border-b border-gray-200 last:border-b-0">
                <span className="font-medium text-gray-600">Total Service Providers</span>
                <span className="font-semibold text-gray-800">
                  {categories.reduce((sum, item) => sum + item.userCount, 0)}
                </span>
              </div>

              <div className="flex justify-between py-2.5 border-b border-gray-200 last:border-b-0">
                <span className="font-medium text-gray-600">Most Popular Category</span>
                <span className="font-semibold text-gray-800">
                  {categories.length > 0 ? categories[0].name : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between py-2.5 border-b border-gray-200 last:border-b-0">
                <span className="font-medium text-gray-600">Highest Rated Category</span>
                <span className="font-semibold text-gray-800">
                  {categories.length > 0
                    ? categories.reduce((max, category) =>
                        category.averageRating > max.averageRating ? category : max
                      ).name
                    : 'N/A'
                  }
                </span>
              </div>

              <div className="flex justify-between py-2.5">
                <span className="font-medium text-gray-600">Growing Categories</span>
                <span className="font-semibold text-gray-800">
                  {categories.filter(cat => getTrend(cat.userCount, cat.previousUserCount) === 'up').length}
                </span>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="flex flex-wrap gap-4 mb-5">
            <div className="flex-1 min-w-50 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md text-sm"
                placeholder="Search by category or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Data Table Section */}
          {filteredCategories.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse mt-2.5">
                <thead>
                  <tr>
                    <th className="bg-gray-100 p-3 text-left font-semibold text-gray-800 text-xs border-b-2 border-gray-200">Rank</th>
                    <th className="bg-gray-100 p-3 text-left font-semibold text-gray-800 text-xs border-b-2 border-gray-200">Skill (Category)</th>
                    <th className="bg-gray-100 p-3 text-left font-semibold text-gray-800 text-xs border-b-2 border-gray-200">User Count</th>
                    <th className="bg-gray-100 p-3 text-left font-semibold text-gray-800 text-xs border-b-2 border-gray-200">Percentage</th>
                    <th className="bg-gray-100 p-3 text-left font-semibold text-gray-800 text-xs border-b-2 border-gray-200">Avg. Rating</th>
                    <th className="bg-gray-100 p-3 text-left font-semibold text-gray-800 text-xs border-b-2 border-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category, index) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="p-3 border-b border-gray-200 text-xs text-gray-600">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-semibold text-xs ${
                          index + 1 === 1 ? 'bg-yellow-400 text-gray-800' :
                          index + 1 === 2 ? 'bg-gray-300 text-gray-800' :
                          index + 1 === 3 ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="p-3 border-b border-gray-200 text-xs text-gray-600">
                        <div className="flex flex-col">
                          <div className="font-semibold text-gray-800">{category.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Popular: {category.popularServices.join(', ')}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 border-b border-gray-200 text-xs text-gray-600">
                        <div className="flex items-center">
                          <span className="font-semibold mr-1.5">{category.userCount}</span>
                          <div className={`${
                            getTrend(category.userCount, category.previousUserCount) === 'up' ? 'text-green-500' :
                            getTrend(category.userCount, category.previousUserCount) === 'down' ? 'text-red-500' :
                            'text-gray-500'
                          }`}>
                            {getTrend(category.userCount, category.previousUserCount) === 'up' && <FaArrowUp />}
                            {getTrend(category.userCount, category.previousUserCount) === 'down' && <FaArrowDown />}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 border-b border-gray-200 text-xs text-gray-600">
                        <div className="flex items-center">
                          <div className="w-12.5 h-1.5 bg-gray-200 rounded mr-2 relative">
                            <div
                              className="h-full bg-blue-500 rounded"
                              style={{ width: `${category.percentage}%` }}
                            ></div>
                          </div>
                          {category.percentage}%
                        </div>
                      </td>
                      <td className="p-3 border-b border-gray-200 text-xs text-gray-600">
                        <div className="flex items-center">
                          {renderStars(category.averageRating)}
                          <span className="ml-1.5 text-xs">
                            {category.averageRating}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 border-b border-gray-200 text-xs text-gray-600">
                        <div className="flex gap-2">
                          <button className="px-2.5 py-1.5 bg-blue-500 text-white rounded text-xs flex items-center gap-1 hover:bg-blue-600 transition-colors">
                            <FaEye />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5 text-gray-500">
              No categories found matching your criteria.
            </div>
          )}
        </>
      )}
    </div>
  );
};


export default SkillCategories;
