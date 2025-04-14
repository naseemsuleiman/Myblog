import { useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth'; 
import {
    Bars3Icon,
    UserIcon,
    ArrowRightOnRectangleIcon,
    PencilSquareIcon,
    BookOpenIcon,
    ChartBarIcon,
    Cog6ToothIcon,
} from '@heroicons/react/24/solid';

function Navbar() {
    const { user, handleLogout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogoutNav = () => {
        handleLogout()
            .then(() => {
                navigate('/');
            })
            .catch((error) => {
                console.error('Logout or navigation error:', error);
            });
    };

    const UserDropdown = () => (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
            {user && ( 
                <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                </div>
            )}
            <Link
                to="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                onClick={() => setIsDropdownOpen(false)}
            >
                <UserIcon className="h-4 w-4 mr-2" />
                Profile
            </Link>
            <Link
                to="/stats"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                onClick={() => setIsDropdownOpen(false)}
            >
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Stats
            </Link>
          
          
         
            <button
                onClick={handleLogoutNav}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                Sign Out
            </button>
        </div>
    );

    return (
        <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <Link to="/" className="text-xl font-bold text-teal-600 hover:text-gray-600">
                <PencilSquareIcon className="h-8 w-8 text-teal-500" />
                    Inkify
                </Link>
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center space-x-2 focus:outline-none"
                    >
                        <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-white" />
                        </div>
                        <Bars3Icon className="h-5 w-5 text-gray-600" />
                    </button>
                    {isDropdownOpen && <UserDropdown />}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;