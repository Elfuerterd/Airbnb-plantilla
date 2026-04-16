import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Home, Calendar, DollarSign, TrendingUp, Plus, ChevronRight, CheckCircle, Clock, Users, Edit, Wallet, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const HostDashboardPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'host') {
      toast.error('You need a host account to access this page');
      navigate('/');
      return;
    }
    fetchData();
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const [statsRes, propertiesRes, bookingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/host/stats`, { withCredentials: true }),
        axios.get(`${API_URL}/api/host/properties`, { withCredentials: true }),
        axios.get(`${API_URL}/api/host/bookings`, { withCredentials: true })
      ]);
      setStats(statsRes.data);
      setProperties(propertiesRes.data);
      setBookings(bookingsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async (bookingId) => {
    try {
      await axios.post(`${API_URL}/api/host/bookings/${bookingId}/confirm`, {}, { withCredentials: true });
      toast.success('Booking confirmed');
      fetchData();
    } catch (error) {
      toast.error('Failed to confirm booking');
    }
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50" data-testid="dashboard-loading">
        <Header />
        <div className="container-app py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 rounded-xl skeleton" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="host-dashboard-page">
      <Header />

      <div className="container-app py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 
              className="text-3xl font-bold text-slate-900"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Host Dashboard
            </h1>
            <p className="text-slate-600 mt-1">Welcome back, {user?.name}!</p>
          </div>
          <div className="flex gap-3">
            <Link to="/host/payouts">
              <Button variant="outline" data-testid="payouts-btn">
                <Wallet className="w-4 h-4 mr-2" />
                Payouts
              </Button>
            </Link>
            <Link to="/host/properties/new">
              <Button className="bg-rose-500 hover:bg-rose-600" data-testid="add-property-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="stats-card" data-testid="stat-properties">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-rose-500" />
              </div>
              <span className="text-sm text-slate-600">Properties</span>
            </div>
            <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {stats?.properties || 0}
            </p>
          </div>

          <div className="stats-card" data-testid="stat-bookings">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-sm text-slate-600">Total Bookings</span>
            </div>
            <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {stats?.total_bookings || 0}
            </p>
          </div>

          <div className="stats-card" data-testid="stat-confirmed">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-sm text-slate-600">Confirmed</span>
            </div>
            <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {stats?.confirmed_bookings || 0}
            </p>
          </div>

          <div className="stats-card" data-testid="stat-earnings">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-sm text-slate-600">Total Earnings</span>
            </div>
            <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              ${(stats?.total_earnings || 0).toFixed(2)}
            </p>
            <Link to="/host/payouts" className="text-xs text-rose-500 hover:text-rose-600 mt-1 block">
              Available: ${(stats?.available_balance || 0).toFixed(2)} →
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="properties">My Properties</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pending Bookings */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Pending Approvals</h2>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                    {pendingBookings.length} pending
                  </span>
                </div>
                {pendingBookings.length > 0 ? (
                  <div className="space-y-3">
                    {pendingBookings.slice(0, 3).map(booking => (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{booking.property_title}</p>
                          <p className="text-xs text-slate-500">
                            {booking.guest_name} · {format(new Date(booking.check_in), 'MMM d')} - {format(new Date(booking.check_out), 'MMM d')}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => confirmBooking(booking.id)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          Confirm
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No pending bookings</p>
                )}
              </div>

              {/* Recent Properties */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Your Properties</h2>
                  <Link to="/host/properties" className="text-rose-500 text-sm font-medium hover:text-rose-600">
                    View all
                  </Link>
                </div>
                {properties.length > 0 ? (
                  <div className="space-y-3">
                    {properties.slice(0, 3).map(property => (
                      <Link 
                        key={property.id}
                        to={`/property/${property.id}`}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200">
                          {property.images?.[0] && (
                            <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm">{property.title}</p>
                          <p className="text-xs text-slate-500">${property.price_per_night}/night</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-slate-500 text-sm mb-3">No properties yet</p>
                    <Link to="/host/properties/new">
                      <Button size="sm" className="bg-rose-500 hover:bg-rose-600">
                        Add your first property
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties">
            {properties.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="properties-list">
                {properties.map(property => (
                  <Link 
                    key={property.id}
                    to={`/property/${property.id}`}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-video bg-slate-100">
                      {property.images?.[0] && (
                        <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-900 mb-1">{property.title}</h3>
                      <p className="text-sm text-slate-500 mb-2">{property.city}, {property.country}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">${property.price_per_night}/night</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          property.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {property.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No properties yet</h3>
                <p className="text-slate-500 mb-6">Start hosting by adding your first property</p>
                <Link to="/host/properties/new">
                  <Button className="bg-rose-500 hover:bg-rose-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Property
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            {bookings.length > 0 ? (
              <div className="space-y-4" data-testid="bookings-list">
                {bookings.map(booking => (
                  <div 
                    key={booking.id}
                    className="bg-white rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100">
                          {booking.property_image && (
                            <img src={booking.property_image} alt={booking.property_title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{booking.property_title}</h3>
                          <p className="text-sm text-slate-500">
                            Guest: {booking.guest_name} · {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                          </p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(booking.check_in), 'MMM d')} - {format(new Date(booking.check_out), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">${booking.total.toFixed(2)}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {booking.status === 'confirmed' && <CheckCircle className="w-3 h-3" />}
                          {booking.status === 'pending' && <Clock className="w-3 h-3" />}
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                        {booking.status === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={() => confirmBooking(booking.id)}
                            className="mt-2 bg-green-500 hover:bg-green-600"
                          >
                            Confirm
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No bookings yet</h3>
                <p className="text-slate-500">Bookings for your properties will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HostDashboardPage;
