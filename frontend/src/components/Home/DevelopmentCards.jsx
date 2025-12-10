
// Removed commented out image imports - using online images instead

const DevelopmentCards = () => {
  return (
    <div className="py-16 px-4 bg-gradient-to-br from-pink-50 via-pink-50 to-pink-50">
      <h1 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-12 bg-gradient-to-r from-pink-600 to-pink-600 bg-clip-text text-transparent">
        The People Behind the Work
      </h1>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
          <div className="mb-4 overflow-hidden rounded-xl">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=250&fit=crop"
              alt="Encourage Skill Development"
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h4 className="text-xl font-bold text-gray-900 mb-3">Encourage Skill Development</h4>
          <p className="text-gray-600 leading-relaxed">
            Providing continuous training and education programs to equip individuals with necessary skills.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
          <div className="mb-4 overflow-hidden rounded-xl">
            <img
              src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop"
              alt="Expand Career Opportunities"
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h4 className="text-xl font-bold text-gray-900 mb-3">Expand Career Opportunities</h4>
          <p className="text-gray-600 leading-relaxed">
            Offering pathways for employment and advancement across various fields.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 md:col-span-2 lg:col-span-1">
          <div className="mb-4 overflow-hidden rounded-xl">
            <img
              src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=250&fit=crop"
              alt="Promote Sustainable Livelihood"
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h4 className="text-xl font-bold text-gray-900 mb-3">Promote Sustainable Livelihood</h4>
          <p className="text-gray-600 leading-relaxed">
            Supporting sustainable projects that help maintain long-term economic growth for residents.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentCards;
