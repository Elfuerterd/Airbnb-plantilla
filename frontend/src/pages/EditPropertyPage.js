import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Plus, X, Upload, Loader2, Save } from 'lucide-react';
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

const EditPropertyPage = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProperty();
  }, [propertyId, isAuthenticated]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/properties/${propertyId}`, { withCredentials: true });
      const property = response.data;
      
      // Check if user owns this property
      if (property.host_id !== user?.id) {
        toast.error('You do not have permission to edit this property');
        navigate('/host/dashboard');
        return;
      }
      
      setFormData({
        title: property.title || '',
        description: property.description || '',
        property_type: property.property_type || 'apartment',
        price_per_night: property.price_per_night?.toString() || '',
        location: property.location || '',
        city: property.city || '',
        country: property.country || '',
        max_guests: property.max_guests || 2,
        bedrooms: property.bedrooms || 1,
        bathrooms: property.bathrooms || 1,
        amenities: property.amenities || [],
        images: property.images || []
      });
    } catch (error) {
      console.error('Error fetching property:', error);
      toast.error('Property not found');
      navigate('/host/dashboard');
    } finally {
      setLoading(false);
    }
  };

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

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (formData.images.length >= 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const file = files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image (JPG, PNG, GIF, or WebP)');
      return;
    }

    setUploadingImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      
      const response = await axios.post(`${API_URL}/api/upload/image`, uploadData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const imageUrl = `${API_URL}${response.data.url}`;
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageUrl]
      }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
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

    setSaving(true);
    try {
      const payload = {
        ...formData,
        price_per_night: parseFloat(formData.price_per_night)
      };
      
      await axios.put(`${API_URL}/api/properties/${propertyId}`, payload, { withCredentials: true });
      toast.success('Property updated successfully!');
      navigate('/host/dashboard');
    } catch (error) {
      console.error('Error updating property:', error);
      toast.error(error.response?.data?.detail || 'Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50" data-testid="edit-property-loading">
        <Header />
        <div className="container-app py-8">
          <div className="max-w-2xl mx-auto">
            <div className="h-8 w-48 rounded skeleton mb-6" />
            <div className="h-96 rounded-xl skeleton" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="edit-property-page">
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
            Edit property
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
                    <Button type="button" variant="outline" size="icon" onClick={() => handleChange('max_guests', Math.max(1, formData.max_guests - 1))}>-</Button>
                    <span className="w-8 text-center font-medium">{formData.max_guests}</span>
                    <Button type="button" variant="outline" size="icon" onClick={() => handleChange('max_guests', formData.max_guests + 1)}>+</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bedrooms</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={() => handleChange('bedrooms', Math.max(0, formData.bedrooms - 1))}>-</Button>
                    <span className="w-8 text-center font-medium">{formData.bedrooms}</span>
                    <Button type="button" variant="outline" size="icon" onClick={() => handleChange('bedrooms', formData.bedrooms + 1)}>+</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bathrooms</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={() => handleChange('bathrooms', Math.max(0, formData.bathrooms - 1))}>-</Button>
                    <span className="w-8 text-center font-medium">{formData.bathrooms}</span>
                    <Button type="button" variant="outline" size="icon" onClick={() => handleChange('bathrooms', formData.bathrooms + 1)}>+</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {amenitiesList.map(amenity => (
                  <label key={amenity.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <Checkbox checked={formData.amenities.includes(amenity.id)} onCheckedChange={() => handleAmenityToggle(amenity.id)} />
                    <span className="text-sm text-slate-700">{amenity.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Images */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Images</h2>
              
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-colors">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage || formData.images.length >= 5} />
                {uploadingImage ? (
                  <><Loader2 className="w-5 h-5 text-rose-500 animate-spin" /><span className="text-sm text-slate-600">Uploading...</span></>
                ) : (
                  <><Upload className="w-5 h-5 text-slate-500" /><span className="text-sm text-slate-600">Click to upload an image</span></>
                )}
              </label>

              <div className="flex gap-2">
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Or enter image URL" />
                <Button type="button" variant="outline" onClick={addImageUrl} disabled={formData.images.length >= 5}><Plus className="w-4 h-4" /></Button>
              </div>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-slate-100">
                      <img src={img} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(index)} className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50">
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                      {index === 0 && <span className="absolute bottom-2 left-2 px-2 py-1 bg-rose-500 text-white text-xs rounded-md">Cover</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/host/dashboard')} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1 bg-rose-500 hover:bg-rose-600" disabled={saving} data-testid="save-property-btn">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditPropertyPage;
