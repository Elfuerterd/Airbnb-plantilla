import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MapPin, Calendar as CalendarIcon, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';

const SearchModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [guests, setGuests] = useState(1);
  const [activeTab, setActiveTab] = useState('location');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('city', location);
    if (checkIn) params.set('check_in', checkIn.toISOString());
    if (checkOut) params.set('check_out', checkOut.toISOString());
    if (guests > 1) params.set('guests', guests.toString());
    
    navigate(`/search?${params.toString()}`);
    onClose();
  };

  const popularDestinations = [
    { name: 'Barcelona', country: 'Spain', image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=200' },
    { name: 'Cancun', country: 'Mexico', image: 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=200' },
    { name: 'Denver', country: 'USA', image: 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=200' },
    { name: 'Stockholm', country: 'Sweden', image: 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=200' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden" data-testid="search-modal">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Where would you like to go?
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {/* Search Tabs */}
          <div className="flex gap-2 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('location')}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'location' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid="tab-location"
            >
              <MapPin className="w-4 h-4 inline mr-2" />
              Location
              {activeTab === 'location' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('dates')}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'dates' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid="tab-dates"
            >
              <CalendarIcon className="w-4 h-4 inline mr-2" />
              Dates
              {activeTab === 'dates' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('guests')}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'guests' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid="tab-guests"
            >
              <Users className="w-4 h-4 inline mr-2" />
              Guests
              {activeTab === 'guests' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />
              )}
            </button>
          </div>

          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="space-y-6">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search destinations"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10 h-12 text-base"
                  data-testid="location-input"
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">Popular destinations</h4>
                <div className="grid grid-cols-2 gap-3">
                  {popularDestinations.map((dest) => (
                    <button
                      key={dest.name}
                      onClick={() => {
                        setLocation(dest.name);
                        setActiveTab('dates');
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 transition-all"
                      data-testid={`destination-${dest.name.toLowerCase()}`}
                    >
                      <img 
                        src={dest.image} 
                        alt={dest.name} 
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-900">{dest.name}</p>
                        <p className="text-xs text-slate-500">{dest.country}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dates Tab */}
          {activeTab === 'dates' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-12 justify-start text-left font-normal"
                      data-testid="check-in-trigger"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkIn ? format(checkIn, 'MMM d, yyyy') : 'Check-in'}
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
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-12 justify-start text-left font-normal"
                      data-testid="check-out-trigger"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkOut ? format(checkOut, 'MMM d, yyyy') : 'Check-out'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkOut}
                      onSelect={setCheckOut}
                      disabled={(date) => date <= (checkIn || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Guests Tab */}
          {activeTab === 'guests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-900">Guests</p>
                  <p className="text-xs text-slate-500">How many people?</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    disabled={guests <= 1}
                    data-testid="guests-decrease"
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-medium">{guests}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setGuests(guests + 1)}
                    data-testid="guests-increase"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Search Summary & Button */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-wrap gap-2">
                {location && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm">
                    <MapPin className="w-3 h-3" />
                    {location}
                    <button onClick={() => setLocation('')} className="ml-1 hover:text-rose-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {checkIn && checkOut && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm">
                    <CalendarIcon className="w-3 h-3" />
                    {format(checkIn, 'MMM d')} - {format(checkOut, 'MMM d')}
                  </span>
                )}
                {guests > 1 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm">
                    <Users className="w-3 h-3" />
                    {guests} guests
                  </span>
                )}
              </div>
            </div>
            <Button 
              onClick={handleSearch}
              className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-medium"
              data-testid="search-submit-btn"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchModal;
