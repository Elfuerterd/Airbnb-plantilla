import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Star, ChevronLeft, MapPin, Calendar, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const WriteReviewPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [pendingBookings, setPendingBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchPendingReviews();
  }, [isAuthenticated]);

  const fetchPendingReviews = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reviews/pending`, { withCredentials: true });
      setPendingBookings(response.data);
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedBooking || rating === 0 || !comment.trim()) {
      toast.error('Please select a rating and write a comment');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/reviews`, {
        property_id: selectedBooking.property_id,
        booking_id: selectedBooking.id,
        rating,
        comment: comment.trim()
      }, { withCredentials: true });

      toast.success('Review submitted successfully!');
      setSelectedBooking(null);
      setRating(0);
      setComment('');
      fetchPendingReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50" data-testid="reviews-loading">
        <Header />
        <div className="container-app py-8">
          <div className="max-w-2xl mx-auto">
            <div className="h-8 w-48 rounded skeleton mb-6" />
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="h-32 rounded-xl skeleton" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="write-review-page">
      <Header />

      <div className="container-app py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/bookings')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to bookings
          </button>

          <h1 
            className="text-3xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Write a Review
          </h1>
          <p className="text-slate-600 mb-8">Share your experience with other travelers</p>

          {selectedBooking ? (
            /* Review Form */
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              {/* Selected Booking Info */}
              <div className="flex items-start gap-4 pb-6 border-b border-slate-200">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                  {selectedBooking.property_image && (
                    <img src={selectedBooking.property_image} alt={selectedBooking.property_title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{selectedBooking.property_title}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedBooking.check_in), 'MMM d')} - {format(new Date(selectedBooking.check_out), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Star Rating */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Your Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                      data-testid={`star-${star}`}
                    >
                      <Star 
                        className={`w-8 h-8 transition-colors ${
                          star <= (hoverRating || rating) 
                            ? 'fill-rose-500 text-rose-500' 
                            : 'text-slate-300'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-slate-500 mt-2">
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent'}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your Review</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience... What did you like? What could be improved?"
                  rows={5}
                  className="resize-none"
                  data-testid="review-comment"
                />
                <p className="text-xs text-slate-400 mt-1">{comment.length} / 1000 characters</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedBooking(null);
                    setRating(0);
                    setComment('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitReview}
                  disabled={submitting || rating === 0 || !comment.trim()}
                  className="flex-1 bg-rose-500 hover:bg-rose-600"
                  data-testid="submit-review-btn"
                >
                  {submitting ? 'Submitting...' : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Review
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Pending Reviews List */
            <>
              {pendingBookings.length > 0 ? (
                <div className="space-y-4" data-testid="pending-reviews-list">
                  <p className="text-sm text-slate-500 mb-4">
                    You have {pendingBookings.length} completed stay{pendingBookings.length > 1 ? 's' : ''} to review
                  </p>
                  {pendingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-rose-300 transition-colors cursor-pointer"
                      onClick={() => setSelectedBooking(booking)}
                      data-testid={`pending-booking-${booking.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          {booking.property_image && (
                            <img src={booking.property_image} alt={booking.property_title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{booking.property_title}</h3>
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(booking.check_in), 'MMM d')} - {format(new Date(booking.check_out), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Write Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No reviews pending</h3>
                  <p className="text-slate-500 mb-6">You don't have any completed stays to review yet.</p>
                  <Link to="/">
                    <Button className="bg-rose-500 hover:bg-rose-600">
                      Explore stays
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WriteReviewPage;
