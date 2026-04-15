import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Plus, X, Upload, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const propertyTypes = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'beach', label: 'Beach house' },
  { value: 'mountain', label: 'Mountain retreat' },
  { value: 'camping', label: 'Camping / Glamping' },
];

const amenitiesList = [
  { id: 'wifi', label: 'WiFi' },
  { id: 'parking', label: 'Free Parking' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'air_conditioning', label: 'Air Conditioning' },
  { id: 'heating', label: 'Heating' },
  { id: 'pool', label: 'Pool' },
  { id: 'sea_view', label: 'Sea View' },
  { id: 'mountain_view', label: 'Mountain View' },
  { id: 'beach_access', label: 'Beach Access' },
  { id: 'fireplace', label: 'Fireplace' },
  { id: 'tv', label: 'TV' },
  { id: 'washer', label: 'Washer' },
];

const NewPropertyPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: 'apartment',
    price_per_night: '',
    location: '',
    city: '',
    country: '',
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: [],
    images: []
  });

  const [imageUrl, setImageUrl] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAmenityToggle = (amenityId) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(a => a !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const addImageUrl = () => {
    if (imageUrl.trim() && formData.images.length < 5) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageUrl.trim()]
      }));
      setImageUrl('');
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.price_per_night || !formData.city || !formData.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        price_per_night: parseFloat(formData.price_per_night)
      };
      
      await axios.post(`${API_URL}/api/properties`, payload, { withCredentials: true });
      toast.success('Property created successfully!');
      navigate('/host/dashboard');
    } catch (error) {
      console.error('Error creating property:', error);
      toast.error(error.response?.data?.detail || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'host') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Home className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Host access required</h2>
          <p className="text-slate-500 mb-4">You need a host account to add properties</p>
          <Button onClick={() => navigate('/register?role=host')} className="bg-rose-500 hover:bg-rose-600">
            Become a host
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="new-property-page">
      <Header />

      <div className="container-app py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/host/dashboard')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to dashboard
          </button>

          <h1 
            className="text-3xl font-bold text-slate-900 mb-8"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Add new property
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
              
              <div className="space-y-2">
                <Label htmlFor="title">Property Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Cozy Beach House with Ocean View"
                  required
                  data-testid="input-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe your property, its features, and what makes it special..."
                  rows={4}
                  required
                  data-testid="input-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property Type *</Label>
                  <Select value={formData.property_type} onValueChange={(v) => handleChange('property_type', v)}>
                    <SelectTrigger data-testid="select-property-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price per Night (USD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.price_per_night}
                    onChange={(e) => handleChange('price_per_night', e.target.value)}
                    placeholder="150"
                    required
                    data-testid="input-price"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Location</h2>
              
              <div className="space-y-2">
                <Label htmlFor="location">Address / Area</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="e.g., Beachfront, Downtown, Mountain View"
                  data-testid="input-location"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="e.g., Barcelona"
                    required
                    data-testid="input-city"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    placeholder="e.g., Spain"
                    required
                    data-testid="input-country"
                  />
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Property Details</h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Max Guests</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleChange('max_guests', Math.max(1, formData.max_guests - 1))}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-medium">{formData.max_guests}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleChange('max_guests', formData.max_guests + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bedrooms</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleChange('bedrooms', Math.max(0, formData.bedrooms - 1))}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-medium">{formData.bedrooms}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleChange('bedrooms', formData.bedrooms + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bathrooms</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleChange('bathrooms', Math.max(0, formData.bathrooms - 1))}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-medium">{formData.bathrooms}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleChange('bathrooms', formData.bathrooms + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Amenities</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {amenitiesList.map(amenity => (
                  <label
                    key={amenity.id}
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <Checkbox
                      checked={formData.amenities.includes(amenity.id)}
                      onCheckedChange={() => handleAmenityToggle(amenity.id)}
                      data-testid={`amenity-${amenity.id}`}
                    />
                    <span className="text-sm text-slate-700">{amenity.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Images */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Images</h2>
              <p className="text-sm text-slate-500">Add up to 5 image URLs for your property</p>
              
              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Enter image URL (e.g., https://...)"
                  data-testid="input-image-url"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addImageUrl}
                  disabled={formData.images.length >= 5}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-slate-100">
                      <img src={img} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/host/dashboard')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-rose-500 hover:bg-rose-600"
                disabled={loading}
                data-testid="submit-property-btn"
              >
                {loading ? 'Creating...' : 'Create Property'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewPropertyPage;
