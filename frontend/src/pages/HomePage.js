import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Home, Tent, Building2, TreePine, Waves, Mountain, Castle, Sparkles } from 'lucide-react';
import Header from '../components/Header';
import PropertyCard from '../components/PropertyCard';
import SearchModal from '../components/SearchModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const propertyTypes = [
  { id: 'all', name: 'All', icon: Sparkles },
  { id: 'house', name: 'Houses', icon: Home },
  { id: 'apartment', name: 'Apartments', icon: Building2 },
  { id: 'villa', name: 'Villas', icon: Castle },
  { id: 'cabin', name: 'Cabins', icon: TreePine },
  { id: 'beach', name: 'Beach', icon: Waves },
  { id: 'mountain', name: 'Mountain', icon: Mountain },
  { id: 'camping', name: 'Camping', icon: Tent },
];

const HomePage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, [selectedType]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = selectedType !== 'all' ? `?property_type=${selectedType}` : '';
      const response = await axios.get(`${API_URL}/api/properties${params}`);
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="home-page">
      <Header onSearchClick={() => setSearchOpen(true)} />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-rose-50 to-white py-16 md:py-24">
        <div className="container-app">
          <div className="max-w-3xl mx-auto text-center">
            <h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-6"
              style={{ fontFamily: 'Outfit, sans-serif' }}
              data-testid="hero-title"
            >
              Find your perfect <span className="text-rose-500">getaway</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
              Discover unique places to stay from private homes to luxury villas around the world.
            </p>
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-medium transition-colors shadow-lg shadow-rose-500/25"
              data-testid="hero-search-btn"
            >
              Start your search
            </button>
          </div>
        </div>

        {/* Featured Images */}
        <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 left-8 w-48 h-64 rounded-2xl overflow-hidden shadow-2xl rotate-[-6deg]">
          <img 
            src="https://static.prod-images.emergentagent.com/jobs/0dccd7bd-a53a-4539-920a-e903c0f78411/images/78f5db4031d9acce99ee3acf6f974d5d076abdf97218a4d4be0b8746a786a33a.png" 
            alt="Featured property" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-8 w-48 h-64 rounded-2xl overflow-hidden shadow-2xl rotate-[6deg]">
          <img 
            src="https://static.prod-images.emergentagent.com/jobs/0dccd7bd-a53a-4539-920a-e903c0f78411/images/e9ec01df7337decb3638037102006498af09b6e1edce90d32529e9c8441077d4.png" 
            alt="Featured property" 
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Category Filter */}
      <section className="sticky top-20 z-40 bg-white border-b border-slate-200 py-4">
        <div className="container-app">
          <div className="category-scroll">
            {propertyTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`flex flex-col items-center gap-2 px-4 py-2 rounded-xl transition-all shrink-0 ${
                    selectedType === type.id
                      ? 'bg-rose-50 text-rose-600 border-b-2 border-rose-500'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  data-testid={`category-${type.id}`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium whitespace-nowrap">{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-8 md:py-12">
        <div className="container-app">
          {loading ? (
            <div className="property-grid" data-testid="loading-skeleton">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[4/3] rounded-xl skeleton" />
                  <div className="h-4 w-3/4 rounded skeleton" />
                  <div className="h-3 w-1/2 rounded skeleton" />
                  <div className="h-4 w-1/4 rounded skeleton" />
                </div>
              ))}
            </div>
          ) : properties.length > 0 ? (
            <div className="property-grid" data-testid="properties-grid">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16" data-testid="no-properties">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No properties found</h3>
              <p className="text-slate-500 mb-6">Try adjusting your filters or search criteria</p>
              <button
                onClick={() => setSelectedType('all')}
                className="text-rose-500 font-medium hover:text-rose-600"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Become a Host CTA */}
      <section className="py-16 bg-slate-900">
        <div className="container-app">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Become a host
              </h2>
              <p className="text-slate-300 max-w-lg">
                Earn extra income by sharing your space. Join thousands of hosts who are already earning with StayBnB.
              </p>
            </div>
            <Link
              to="/register?role=host"
              className="px-8 py-4 bg-white text-slate-900 rounded-full font-medium hover:bg-slate-100 transition-colors shrink-0"
              data-testid="become-host-btn"
            >
              Start hosting
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200">
        <div className="container-app">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-rose-500 rounded flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-900">StayBnB</span>
            </div>
            <p className="text-sm text-slate-500">
              © 2024 StayBnB. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Search Modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default HomePage;
