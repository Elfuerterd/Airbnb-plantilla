import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, differenceInDays } from 'date-fns';
import { Star, MapPin, Users, Bed, Bath, Wifi, Car, Utensils, Wind, Waves, Mountain, Heart, Share, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import SearchModal from '../components/SearchModal';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const amenityIcons = {
  wifi: Wifi,
  parking: Car,
  kitchen: Utensils,
  air_conditioning: Wind,
  pool: Waves,
  sea_view: Waves,
  mountain_view: Mountain,
  beach_access: Waves,
  fireplace: Wind,
  heating: Wind,
  nature_view: Mountain,
};

const PropertyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [property, setProperty] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [guests, setGuests] = useState(1);
  const [bookedDates, setBookedDates] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchProperty();
    fetchReviews();
    fetchAvailability();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/properties/${id}`);
      setProperty(response.data);
    } catch (error) {
      console.error('Error fetching property:', error);
      toast.error('Property not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reviews/property/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchAvailability = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/properties/${id}/availability`);
      setBookedDates(response.data.booked_dates.map(d => new Date(d)));
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/property/${id}` } });
      return;
    }

    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    setBookingLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/bookings`,
        {
          property_id: id,
          check_in: checkIn.toISOString(),
          check_out: checkOut.toISOString(),
          guests,
          payment_method: 'stripe'
        },
        { withCredentials: true }
      );
      
      navigate(`/booking/${response.data.id}/payment`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        await axios.delete(`${API_URL}/api/favorites/${id}`, { withCredentials: true });
      } else {
        await axios.post(`${API_URL}/api/favorites/${id}`, {}, { withCredentials: true });
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const subtotal = nights * (property?.price_per_night || 0);
  const serviceFee = subtotal * 0.12;
  const total = subtotal + serviceFee;

  const isDateBooked = (date) => {
    return bookedDates.some(
      (bookedDate) => bookedDate.toDateString() === date.toDateString()
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white" data-testid="property-loading">
        <Header onSearchClick={() => setSearchOpen(true)} />
        <div className="container-app py-8">
          <div className="h-[400px] rounded-2xl skeleton mb-8" />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <div className="h-8 w-3/4 rounded skeleton" />
              <div className="h-4 w-1/2 rounded skeleton" />
              <div className="h-32 rounded skeleton" />
            </div>
            <div className="h-96 rounded-xl skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) return null;

  return (
    <div className="min-h-screen bg-white" data-testid="property-details-page">
      <Header onSearchClick={() => setSearchOpen(true)} />
      
      <div className="container-app py-6">
        {/* Back Button & Actions */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            data-testid="back-btn"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied!');
              }}
              data-testid="share-btn"
            >
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFavorite}
              data-testid="save-btn"
            >
              <Heart className={`w-4 h-4 mr-2 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              Save
            </Button>
          </div>
        </div>

        {/* Image Gallery - Bento Style */}
        <div className="bento-gallery mb-8">
          <div className="main-image bg-slate-100">
            <img
              src={property.images?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="sub-image bg-slate-100">
              <img
                src={property.images?.[i] || `https://images.unsplash.com/photo-156401379991${i}-ab600027ffc${i}?w=400`}
                alt={`${property.title} ${i}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column - Property Info */}
          <div className="md:col-span-2 space-y-8">
            {/* Title & Location */}
            <div>
              <h1 
                className="text-3xl font-bold text-slate-900 mb-2"
                style={{ fontFamily: 'Outfit, sans-serif' }}
                data-testid="property-title"
              >
                {property.title}
              </h1>
              <div className="flex items-center gap-4 text-slate-600">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{property.city}, {property.country}</span>
                </div>
                {property.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-rose-500 text-rose-500" />
                    <span className="font-medium text-slate-900">{property.rating.toFixed(1)}</span>
                    <span>({property.review_count} reviews)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Host Info */}
            <div className="flex items-center gap-4 py-6 border-y border-slate-200">
              <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center">
                <Users className="w-7 h-7 text-slate-500" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Hosted by {property.host_name}</p>
                <p className="text-sm text-slate-500 capitalize">{property.property_type}</p>
              </div>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <Users className="w-6 h-6 text-rose-500" />
                <div>
                  <p className="text-sm text-slate-500">Guests</p>
                  <p className="font-medium">{property.max_guests}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <Bed className="w-6 h-6 text-rose-500" />
                <div>
                  <p className="text-sm text-slate-500">Bedrooms</p>
                  <p className="font-medium">{property.bedrooms}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <Bath className="w-6 h-6 text-rose-500" />
                <div>
                  <p className="text-sm text-slate-500">Bathrooms</p>
                  <p className="font-medium">{property.bathrooms}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
                About this place
              </h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
                What this place offers
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {property.amenities?.map((amenity) => {
                  const Icon = amenityIcons[amenity] || Wifi;
                  return (
                    <div key={amenity} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Icon className="w-5 h-5 text-slate-600" />
                      <span className="text-sm text-slate-700 capitalize">{amenity.replace(/_/g, ' ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Reviews ({reviews.length})
                </h2>
                <div className="space-y-0">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="review-card">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                          {review.guest_picture ? (
                            <img src={review.guest_picture} alt={review.guest_name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{review.guest_name}</p>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 ${i < review.rating ? 'fill-rose-500 text-rose-500' : 'text-slate-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Booking Card */}
          <div>
            <div className="booking-summary" data-testid="booking-card">
              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    ${property.price_per_night}
                  </span>
                  <span className="text-slate-500"> / night</span>
                </div>
                {property.rating > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 fill-rose-500 text-rose-500" />
                    <span className="font-medium">{property.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-14 justify-start text-left font-normal flex-col items-start"
                      data-testid="booking-check-in"
                    >
                      <span className="text-xs text-slate-500 uppercase">Check-in</span>
                      <span className="text-sm">{checkIn ? format(checkIn, 'MMM d, yyyy') : 'Add date'}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkIn}
                      onSelect={(date) => {
                        setCheckIn(date);
                        if (!checkOut || date >= checkOut) {
                          const nextDay = new Date(date);
                          nextDay.setDate(nextDay.getDate() + 1);
                          setCheckOut(nextDay);
                        }
                      }}
                      disabled={(date) => date < new Date() || isDateBooked(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-14 justify-start text-left font-normal flex-col items-start"
                      data-testid="booking-check-out"
                    >
                      <span className="text-xs text-slate-500 uppercase">Check-out</span>
                      <span className="text-sm">{checkOut ? format(checkOut, 'MMM d, yyyy') : 'Add date'}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkOut}
                      onSelect={setCheckOut}
                      disabled={(date) => date <= (checkIn || new Date()) || isDateBooked(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Guests */}
              <div className="mb-6">
                <Button
                  variant="outline"
                  className="w-full h-14 justify-between font-normal"
                  data-testid="booking-guests"
                >
                  <div className="text-left">
                    <span className="text-xs text-slate-500 uppercase block">Guests</span>
                    <span className="text-sm">{guests} guest{guests > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setGuests(Math.max(1, guests - 1)); }}
                      className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center hover:border-slate-400"
                      disabled={guests <= 1}
                    >
                      -
                    </button>
                    <span className="w-6 text-center">{guests}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setGuests(Math.min(property.max_guests, guests + 1)); }}
                      className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center hover:border-slate-400"
                      disabled={guests >= property.max_guests}
                    >
                      +
                    </button>
                  </div>
                </Button>
              </div>

              {/* Book Button */}
              <Button
                onClick={handleBooking}
                className="w-full h-14 bg-rose-500 hover:bg-rose-600 text-white font-medium text-lg"
                disabled={bookingLoading || !checkIn || !checkOut}
                data-testid="reserve-btn"
              >
                {bookingLoading ? 'Processing...' : 'Reserve'}
              </Button>

              {/* Price Breakdown */}
              {nights > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">${property.price_per_night} × {nights} nights</span>
                    <span className="text-slate-900">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Service fee</span>
                    <span className="text-slate-900">${serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-3 border-t border-slate-200">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default PropertyDetailsPage;
