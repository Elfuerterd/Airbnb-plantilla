import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Calendar, MapPin, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import SearchModal from '../components/SearchModal';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Pending' },
  confirmed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Confirmed' },
  cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Cancelled' },
  completed: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Completed' },
};

const BookingsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [isAuthenticated]);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/bookings`, { withCredentials: true });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      await axios.post(`${API_URL}/api/bookings/${bookingId}/cancel`, {}, { withCredentials: true });
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel booking');
    }
  };

  const now = new Date();
  const upcomingBookings = bookings.filter(b => 
    new Date(b.check_in) >= now && b.status !== 'cancelled'
  );
  const pastBookings = bookings.filter(b => 
    new Date(b.check_out) < now || b.status === 'cancelled'
  );

  const BookingCard = ({ booking }) => {
    const status = statusConfig[booking.status] || statusConfig.pending;
    const StatusIcon = status.icon;
    const isPending = booking.status === 'pending' && booking.payment_status !== 'paid';
    const canCancel = ['pending', 'confirmed'].includes(booking.status) && new Date(booking.check_in) > now;

    return (
      <div 
        className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
        data-testid={`booking-card-${booking.id}`}
      >
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-48 h-32 md:h-auto bg-slate-100">
            {booking.property_image ? (
              <img
                src={booking.property_image}
                alt={booking.property_title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                No image
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <Link 
                  to={`/property/${booking.property_id}`}
                  className="text-lg font-semibold text-slate-900 hover:text-rose-500 transition-colors"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {booking.property_title}
                </Link>
                <div className={`inline-flex items-center gap-1 ml-3 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(booking.check_in), 'MMM d')} - {format(new Date(booking.check_out), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {booking.nights} night{booking.nights > 1 ? 's' : ''} · {booking.guests} guest{booking.guests > 1 ? 's' : ''}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">
                Total: ${booking.total.toFixed(2)}
                {booking.payment_status !== 'paid' && (
                  <span className="ml-2 text-xs text-yellow-600 font-normal">(Unpaid)</span>
                )}
              </p>
              
              <div className="flex items-center gap-2">
                {isPending && (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/booking/${booking.id}/payment`)}
                    className="bg-rose-500 hover:bg-rose-600"
                    data-testid={`pay-btn-${booking.id}`}
                  >
                    Complete Payment
                  </Button>
                )}
                {canCancel && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelBooking(booking.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid={`cancel-btn-${booking.id}`}
                  >
                    Cancel
                  </Button>
                )}
                <Link to={`/property/${booking.property_id}`}>
                  <Button size="sm" variant="ghost">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="bookings-page">
      <Header onSearchClick={() => setSearchOpen(true)} />

      <div className="container-app py-8">
        <h1 
          className="text-3xl font-bold text-slate-900 mb-8"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          My bookings
        </h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">
              Past ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 rounded-xl skeleton" />
                ))}
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div className="space-y-4" data-testid="upcoming-bookings">
                {upcomingBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16" data-testid="no-upcoming">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No upcoming bookings</h3>
                <p className="text-slate-500 mb-6">Start exploring and book your next getaway!</p>
                <Button onClick={() => navigate('/')} className="bg-rose-500 hover:bg-rose-600">
                  Explore stays
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 rounded-xl skeleton" />
                ))}
              </div>
            ) : pastBookings.length > 0 ? (
              <div className="space-y-4" data-testid="past-bookings">
                {pastBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16" data-testid="no-past">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No past bookings</h3>
                <p className="text-slate-500">Your completed trips will appear here.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default BookingsPage;
