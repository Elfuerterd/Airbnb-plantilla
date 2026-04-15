import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { SlidersHorizontal, X } from 'lucide-react';
import Header from '../components/Header';
import PropertyCard from '../components/PropertyCard';
import SearchModal from '../components/SearchModal';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Slider } from '../components/ui/slider';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const propertyTypes = [
  { value: 'all', label: 'All types' },
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'beach', label: 'Beach house' },
  { value: 'mountain', label: 'Mountain retreat' },
];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('property_type') || 'all');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [minGuests, setMinGuests] = useState(parseInt(searchParams.get('guests')) || 1);

  useEffect(() => {
    fetchProperties();
  }, [searchParams, page]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchParams.get('city')) params.set('city', searchParams.get('city'));
      if (searchParams.get('property_type') && searchParams.get('property_type') !== 'all') {
        params.set('property_type', searchParams.get('property_type'));
      }
      if (searchParams.get('min_price')) params.set('min_price', searchParams.get('min_price'));
      if (searchParams.get('max_price')) params.set('max_price', searchParams.get('max_price'));
      if (searchParams.get('guests')) params.set('guests', searchParams.get('guests'));
      params.set('page', page.toString());
      
      const response = await axios.get(`${API_URL}/api/properties?${params.toString()}`);
      setProperties(response.data.properties || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (propertyType !== 'all') params.set('property_type', propertyType);
    if (priceRange[0] > 0) params.set('min_price', priceRange[0].toString());
    if (priceRange[1] < 1000) params.set('max_price', priceRange[1].toString());
    if (minGuests > 1) params.set('guests', minGuests.toString());
    
    setSearchParams(params);
    setPage(1);
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setCity('');
    setPropertyType('all');
    setPriceRange([0, 1000]);
    setMinGuests(1);
    setSearchParams({});
    setPage(1);
  };

  const activeFiltersCount = [
    city,
    propertyType !== 'all',
    priceRange[0] > 0 || priceRange[1] < 1000,
    minGuests > 1
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white" data-testid="search-page">
      <Header onSearchClick={() => setSearchOpen(true)} />

      <div className="container-app py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 
              className="text-2xl font-bold text-slate-900"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {city ? `Stays in ${city}` : 'All stays'}
            </h1>
            <p className="text-slate-500 mt-1">
              {total} {total === 1 ? 'property' : 'properties'} found
            </p>
          </div>

          {/* Filters Button */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="filters-btn">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 bg-rose-500 text-white rounded-full text-xs flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px]" data-testid="filters-sheet">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              
              <div className="py-6 space-y-6">
                {/* Location */}
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="City or country"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    data-testid="filter-city"
                  />
                </div>

                {/* Property Type */}
                <div className="space-y-2">
                  <Label>Property type</Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger data-testid="filter-property-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Price range</Label>
                    <span className="text-sm text-slate-500">
                      ${priceRange[0]} - ${priceRange[1]}+
                    </span>
                  </div>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    min={0}
                    max={1000}
                    step={10}
                    className="mt-2"
                    data-testid="filter-price-range"
                  />
                </div>

                {/* Guests */}
                <div className="space-y-2">
                  <Label>Minimum guests</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setMinGuests(Math.max(1, minGuests - 1))}
                      disabled={minGuests <= 1}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-medium">{minGuests}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setMinGuests(minGuests + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={clearFilters}
                    data-testid="clear-filters-btn"
                  >
                    Clear all
                  </Button>
                  <Button
                    className="flex-1 bg-rose-500 hover:bg-rose-600"
                    onClick={applyFilters}
                    data-testid="apply-filters-btn"
                  >
                    Show results
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Active Filters Pills */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {city && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-sm">
                {city}
                <button onClick={() => { setCity(''); applyFilters(); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {propertyType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-sm capitalize">
                {propertyType}
                <button onClick={() => { setPropertyType('all'); applyFilters(); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(priceRange[0] > 0 || priceRange[1] < 1000) && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-sm">
                ${priceRange[0]} - ${priceRange[1]}
                <button onClick={() => { setPriceRange([0, 1000]); applyFilters(); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {minGuests > 1 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-sm">
                {minGuests}+ guests
                <button onClick={() => { setMinGuests(1); applyFilters(); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Results */}
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
          <>
            <div className="property-grid" data-testid="search-results">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
            
            {/* Pagination */}
            {total > 20 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-slate-600">
                  Page {page}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={properties.length < 20}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16" data-testid="no-results">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SlidersHorizontal className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No properties found</h3>
            <p className="text-slate-500 mb-6">Try adjusting your filters or search criteria</p>
            <Button onClick={clearFilters} variant="outline">
              Clear all filters
            </Button>
          </div>
        )}
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default SearchPage;
