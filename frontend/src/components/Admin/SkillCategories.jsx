import React, { useState, useEffect } from 'react';
import { FaTags, FaInfoCircle, FaSearch} from 'react-icons/fa';


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
      stars.push(<FaStar key={i} className="star filled" />);
    }
   
    if (hasHalfStar) {
      stars.push(<FaStar key="half" className="star half" />);
    }
   
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FaStar key={`empty-${i}`} className="star empty" />);
    }
   
    return stars;
  };


  const pieSegments = calculatePieChartSegments();


  return (
    <>
      <style>{`
        .skill-categories-container {
          background: #fff;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          margin-bottom: 20px;
        }
       
        .page-header {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
       
        .page-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
          margin: 0;
          display: flex;
          align-items: center;
        }
       
        .page-title .icon {
          margin-right: 10px;
          color: #0a84ff;
        }
       
        .intro-text {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 25px;
          line-height: 1.5;
        }
       
        .content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
       
        .chart-container {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
       
        .chart-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 20px 0;
          display: flex;
          align-items: center;
        }
       
        .chart-title .icon {
          margin-right: 8px;
          color: #0a84ff;
        }
       
        .pie-chart-container {
          position: relative;
          width: 250px;
          height: 250px;
        }
       
        .pie-chart-svg {
          width: 100%;
          height: 100%;
        }
       
        .pie-segment {
          cursor: pointer;
          transition: transform 0.2s;
        }
       
        .pie-segment:hover {
          transform: scale(1.05);
          filter: brightness(1.1);
        }
       
        .pie-legend {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
        }
       
        .legend-item {
          display: flex;
          align-items: center;
          font-size: 0.8rem;
        }
       
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          margin-right: 5px;
        }
       
        .stats-container {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 20px;
        }
       
        .stats-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 20px 0;
          display: flex;
          align-items: center;
        }
       
        .stats-title .icon {
          margin-right: 8px;
          color: #0a84ff;
        }
       
        .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #eee;
        }
       
        .stat-item:last-child {
          border-bottom: none;
        }
       
        .stat-label {
          font-weight: 500;
          color: #555;
        }
       
        .stat-value {
          font-weight: 600;
          color: #333;
        }
       
        .filters-container {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 20px;
        }
       
        .search-container {
          flex: 1;
          min-width: 200px;
          position: relative;
        }
       
        .search-input {
          width: 100%;
          padding: 10px 15px 10px 40px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.9rem;
        }
       
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
        }
       
        .data-table-container {
          overflow-x: auto;
        }
       
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
       
        .data-table th {
          background: #f1f3f7;
          padding: 12px 15px;
          text-align: left;
          font-weight: 600;
          color: #333;
          font-size: 0.85rem;
          border-bottom: 2px solid #e9ecef;
        }
       
        .data-table td {
          padding: 12px 15px;
          border-bottom: 1px solid #e9ecef;
          font-size: 0.85rem;
          color: #555;
        }
       
        .data-table tr:hover {
          background: #f9f9f9;
        }
       
        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-weight: 600;
          font-size: 0.8rem;
        }
       
        .rank-1 {
          background: #ffd700;
          color: #333;
        }
       
        .rank-2 {
          background: #c0c0c0;
          color: #333;
        }
       
        .rank-3 {
          background: #cd7f32;
          color: #fff;
        }
       
        .rank-default {
          background: #e9ecef;
          color: #555;
        }
       
        .category-info {
          display: flex;
          flex-direction: column;
        }
       
        .category-name {
          font-weight: 600;
          color: #333;
        }
       
        .popular-services {
          font-size: 0.75rem;
          color: #666;
          margin-top: 3px;
        }
       
        .user-count {
          display: flex;
          align-items: center;
        }
       
        .count-value {
          font-weight: 600;
          margin-right: 5px;
        }
       
        .trend {
          display: flex;
          align-items: center;
        }
       
        .trend.up {
          color: #28a745;
        }
       
        .trend.down {
          color: #dc3545;
        }
       
        .trend.stable {
          color: #6c757d;
        }
       
        .percentage-bar {
          display: inline-block;
          height: 6px;
          background: #e9ecef;
          border-radius: 3px;
          width: 50px;
          margin-right: 8px;
          position: relative;
        }
       
        .percentage-fill {
          height: 100%;
          background: #0a84ff;
          border-radius: 3px;
        }
       
        .rating-container {
          display: flex;
          align-items: center;
        }
       
        .star {
          color: #ddd;
          font-size: 0.8rem;
        }
       
        .star.filled {
          color: #ffc107;
        }
       
        .star.half {
          color: #ffc107;
          opacity: 0.7;
        }
       
        .action-buttons {
          display: flex;
          gap: 8px;
        }
       
        .action-btn {
          padding: 6px 10px;
          border: none;
          border-radius: 4px;
          font-size: 0.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.2s;
        }
       
        .view-btn {
          background: #0a84ff;
          color: white;
        }
       
        .view-btn:hover {
          background: #0077e6;
        }
       
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
        }
       
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #0a84ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
       
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
       
        .no-results {
          text-align: center;
          padding: 20px;
          color: #666;
        }
       
        .tooltip {
          position: absolute;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 0.8rem;
          pointer-events: none;
          z-index: 1000;
        }
       
        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }
       
        @media (max-width: 768px) {
          .filters-container {
            flex-direction: column;
          }
         
          .search-container {
            min-width: 100%;
          }
         
          .data-table th, .data-table td {
            padding: 8px 10px;
            font-size: 0.75rem;
          }
         
          .pie-chart-container {
            width: 200px;
            height: 200px;
          }
        }
      `}</style>


      <div className="skill-categories-container">
        <div className="page-header">
          <h1 className="page-title">
            <FaTags className="icon" />
            Skill Categories
          </h1>
        </div>
       
        <p className="intro-text">
          <FaInfoCircle style={{ marginRight: '5px', color: '#0a84ff' }} />
          This page provides an overview of all skill categories available on the platform.
          Analyze the distribution of service providers across different categories to understand market trends and identify opportunities for growth.
        </p>
       
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {/* Charts and Stats Section */}
            <div className="content-grid">
              {/* Pie Chart */}
              <div className="chart-container">
                <h2 className="chart-title">
                  <FaTags className="icon" />
                  Category Distribution
                </h2>
               
                <div className="pie-chart-container">
                  <svg className="pie-chart-svg" viewBox="0 0 250 250">
                    {pieSegments.map((segment) => (
                      <path
                        key={segment.id}
                        d={createPiePath(125, 125, 100, segment.startAngle, segment.endAngle)}
                        fill={segment.color}
                        className="pie-segment"
                        onMouseEnter={() => setHoveredSegment(segment)}
                        onMouseLeave={() => setHoveredSegment(null)}
                      />
                    ))}
                  </svg>
                 
                  {hoveredSegment && (
                    <div
                      className="tooltip"
                      style={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <div>{hoveredSegment.name}</div>
                      <div>{hoveredSegment.userCount} users ({hoveredSegment.percentage}%)</div>
                    </div>
                  )}
                </div>
               
                <div className="pie-legend">
                  {categories.map(category => (
                    <div key={category.id} className="legend-item">
                      <div
                        className="legend-color"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span>{category.name}</span>
                    </div>
                  ))}
                </div>
              </div>
             
              {/* Stats Container */}
              <div className="stats-container">
                <h2 className="stats-title">
                  <FaUsers className="icon" />
                  Category Statistics
                </h2>
               
                <div className="stat-item">
                  <span className="stat-label">Total Categories</span>
                  <span className="stat-value">{categories.length}</span>
                </div>
               
                <div className="stat-item">
                  <span className="stat-label">Total Service Providers</span>
                  <span className="stat-value">
                    {categories.reduce((sum, item) => sum + item.userCount, 0)}
                  </span>
                </div>
               
                <div className="stat-item">
                  <span className="stat-label">Most Popular Category</span>
                  <span className="stat-value">
                    {categories.length > 0 ? categories[0].name : 'N/A'}
                  </span>
                </div>
               
                <div className="stat-item">
                  <span className="stat-label">Highest Rated Category</span>
                  <span className="stat-value">
                    {categories.length > 0
                      ? categories.reduce((max, category) =>
                          category.averageRating > max.averageRating ? category : max
                        ).name
                      : 'N/A'
                    }
                  </span>
                </div>
               
                <div className="stat-item">
                  <span className="stat-label">Growing Categories</span>
                  <span className="stat-value">
                    {categories.filter(cat => getTrend(cat.userCount, cat.previousUserCount) === 'up').length}
                  </span>
                </div>
              </div>
            </div>
           
            {/* Filters Section */}
            <div className="filters-container">
              <div className="search-container">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by category or service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
           
            {/* Data Table Section */}
            {filteredCategories.length > 0 ? (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Skill (Category)</th>
                      <th>User Count</th>
                      <th>Percentage</th>
                      <th>Avg. Rating</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((category, index) => (
                      <tr key={category.id}>
                        <td>
                          <span className={`rank-badge ${
                            index + 1 === 1 ? 'rank-1' :
                            index + 1 === 2 ? 'rank-2' :
                            index + 1 === 3 ? 'rank-3' : 'rank-default'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td>
                          <div className="category-info">
                            <div className="category-name">{category.name}</div>
                            <div className="popular-services">
                              Popular: {category.popularServices.join(', ')}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="user-count">
                            <span className="count-value">{category.userCount}</span>
                            <div className={`trend ${getTrend(category.userCount, category.previousUserCount)}`}>
                              {getTrend(category.userCount, category.previousUserCount) === 'up' && <FaTrendingUp />}
                              {getTrend(category.userCount, category.previousUserCount) === 'down' && <FaTrendingDown />}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="percentage-bar">
                              <div
                                className="percentage-fill"
                                style={{ width: `${category.percentage}%` }}
                              ></div>
                            </div>
                            {category.percentage}%
                          </div>
                        </td>
                        <td>
                          <div className="rating-container">
                            {renderStars(category.averageRating)}
                            <span style={{ marginLeft: '5px', fontSize: '0.8rem' }}>
                              {category.averageRating}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn view-btn">
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
              <div className="no-results">
                No categories found matching your criteria.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};


export default SkillCategories;
