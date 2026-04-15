import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Heart, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import PropertyCard from '../components/PropertyCard';
import SearchModal from '../components/SearchModal';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchFavorites();
  }, [isAuthenticated]);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/favorites`, { withCredentials: true });
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteChange = (propertyId, isFavorite) => {
    if (!isFavorite) {
      setFavorites(favorites.filter(p => p.id !== propertyId));
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="favorites-page">
      <Header onSearchClick={() => setSearchOpen(true)} />

      <div className="container-app py-8">
        <h1 
          className="text-3xl font-bold text-slate-900 mb-8"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          My favorites
        </h1>

        {loading ? (
          <div className="property-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[4/3] rounded-xl skeleton" />
                <div className="h-4 w-3/4 rounded skeleton" />
                <div className="h-3 w-1/2 rounded skeleton" />
                <div className="h-4 w-1/4 rounded skeleton" />
              </div>
            ))}
          </div>
        ) : favorites.length > 0 ? (
          <div className="property-grid" data-testid="favorites-grid">
            {favorites.map((property) => (
              <PropertyCard 
                key={property.id} 
                property={property} 
                isFavorite={true}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16" data-testid="no-favorites">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No favorites yet</h3>
            <p className="text-slate-500 mb-6">Save your favorite properties to find them easily later.</p>
            <Button onClick={() => navigate('/')} className="bg-rose-500 hover:bg-rose-600">
              Explore stays
            </Button>
          </div>
        )}
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default FavoritesPage;
