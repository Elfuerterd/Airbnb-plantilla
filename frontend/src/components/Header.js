import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Search, Menu, User, Heart, Home, LogOut, Settings, Calendar, MessageCircle } from 'lucide-react';
import axios from 'axios';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Header = ({ onSearchClick }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [isAuthenticated]);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/messages/unread-count`, { withCredentials: true });
      setUnreadMessages(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 glass-header border-b border-slate-200" data-testid="main-header">
      <div className="container-app">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              FaceYouFace
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <button 
            onClick={onSearchClick}
            className="hidden md:flex items-center gap-4 px-4 py-2 border border-slate-200 rounded-full shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            data-testid="search-bar-trigger"
          >
            <span className="text-sm font-medium text-slate-900">Anywhere</span>
            <span className="w-px h-6 bg-slate-200"></span>
            <span className="text-sm font-medium text-slate-900">Any week</span>
            <span className="w-px h-6 bg-slate-200"></span>
            <span className="text-sm text-slate-500">Add guests</span>
            <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
          </button>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user?.role === 'host' && (
              <Link 
                to="/host/dashboard" 
                className="hidden md:block text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                data-testid="host-dashboard-link"
              >
                Switch to hosting
              </Link>
            )}

            {isAuthenticated && (
              <Link 
                to="/favorites" 
                className="hidden md:flex w-10 h-10 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                data-testid="favorites-link"
              >
                <Heart className="w-5 h-5 text-slate-700" />
              </Link>
            )}

            {isAuthenticated && (
              <Link 
                to="/messages" 
                className="hidden md:flex w-10 h-10 items-center justify-center rounded-full hover:bg-slate-100 transition-colors relative"
                data-testid="messages-link"
              >
                <MessageCircle className="w-5 h-5 text-slate-700" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-xs flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-full hover:shadow-md transition-shadow"
                  data-testid="user-menu-trigger"
                >
                  <Menu className="w-4 h-4 text-slate-700" />
                  <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center overflow-hidden">
                    {user?.picture ? (
                      <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAuthenticated ? (
                  <>
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/bookings" className="flex items-center gap-2 cursor-pointer" data-testid="my-bookings-link">
                        <Calendar className="w-4 h-4" />
                        My Bookings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/favorites" className="flex items-center gap-2 cursor-pointer" data-testid="my-favorites-link">
                        <Heart className="w-4 h-4" />
                        Favorites
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === 'host' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/host/dashboard" className="flex items-center gap-2 cursor-pointer" data-testid="host-dashboard-menu-link">
                            <Home className="w-4 h-4" />
                            Host Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/host/properties" className="flex items-center gap-2 cursor-pointer" data-testid="manage-properties-link">
                            <Settings className="w-4 h-4" />
                            Manage Properties
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-red-600" data-testid="logout-button">
                      <LogOut className="w-4 h-4" />
                      Log out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/login" className="font-medium cursor-pointer" data-testid="login-link">
                        Log in
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/register" className="cursor-pointer" data-testid="register-link">
                        Sign up
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Search - Bottom bar */}
      <div className="md:hidden border-t border-slate-200 px-4 py-3">
        <button 
          onClick={onSearchClick}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-full shadow-sm"
          data-testid="mobile-search-trigger"
        >
          <Search className="w-5 h-5 text-slate-700" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-slate-900">Where to?</p>
            <p className="text-xs text-slate-500">Anywhere · Any week · Add guests</p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;
