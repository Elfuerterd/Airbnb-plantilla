import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PropertyCard = ({ property, isFavorite = false, onFavoriteChange }) => {
  const { isAuthenticated } = useAuth();
  const [favorite, setFavorite] = useState(isFavorite);
  const [imageLoaded, setImageLoaded] = useState(false);

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      return;
    }

    try {
      if (favorite) {
        await axios.delete(`${API_URL}/api/favorites/${property.id}`, { withCredentials: true });
      } else {
        await axios.post(`${API_URL}/api/favorites/${property.id}`, {}, { withCredentials: true });
      }
      setFavorite(!favorite);
      if (onFavoriteChange) {
        onFavoriteChange(property.id, !favorite);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const mainImage = property.images?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';

  return (
    <Link 
      to={`/property/${property.id}`} 
      className="property-card group flex flex-col gap-3 cursor-pointer"
      data-testid={`property-card-${property.id}`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
        {!imageLoaded && (
          <div className="absolute inset-0 skeleton" />
        )}
        <img
          src={mainImage}
          alt={property.title}
          className={`property-card-image w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
        
        {/* Favorite Button */}
        <button
          onClick={toggleFavorite}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
          data-testid={`favorite-btn-${property.id}`}
        >
          <Heart 
            className={`w-5 h-5 transition-colors ${favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-700'}`} 
          />
        </button>

        {/* Property Type Badge */}
        <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 rounded-md text-xs font-medium text-slate-700 capitalize">
          {property.property_type}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-medium text-slate-900 line-clamp-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {property.title}
          </h3>
          {property.rating > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span className="text-sm font-medium text-slate-900">{property.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        
        <p className="text-sm text-slate-500 line-clamp-1">
          {property.city}, {property.country}
        </p>
        
        <p className="text-sm text-slate-500">
          {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''} · {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''} · Up to {property.max_guests} guests
        </p>
        
        <p className="mt-1">
          <span className="text-base font-semibold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            ${property.price_per_night}
          </span>
          <span className="text-sm text-slate-500"> / night</span>
        </p>
      </div>
    </Link>
  );
};

export default PropertyCard;
