import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { auth, db } from '../firebase';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import {
    UserCircleIcon,
    EnvelopeIcon,
    LockClosedIcon,
    BookOpenIcon,
    SparklesIcon,
    XMarkIcon,
    Cog6ToothIcon,
    MoonIcon,
    SunIcon,
    ShieldCheckIcon,
    TrashIcon
} from '@heroicons/react/24/solid';
import { Dialog, Transition } from '@headlessui/react';

const Settings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');

    // User profile state
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');
    const [location, setLocation] = useState('');

    // Preferences state
    const [theme, setTheme] = useState('light'); // Set default theme to light
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);

    // Security state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const fetchUserData = async () => {
            try {
                // Get user data from Firebase Auth
                setDisplayName(user.displayName || '');
                setEmail(user.email || '');

                // Get additional user data from Firestore
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setBio(userData.bio || '');
                    setWebsite(userData.website || '');
                    setLocation(userData.location || '');
                    // Use the theme from Firestore or default to 'light'
                    setTheme(userData.theme || 'light');
                    setNotificationsEnabled(userData.notificationsEnabled !== false);
                    setEmailNotifications(userData.emailNotifications !== false);
                }

                setLoading(false);
                // Apply theme on initial load
                applyTheme(theme);

            } catch (error) {
                console.error('Error fetching user data:', error);
                setError('Failed to load user data');
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user, navigate, theme]); // Keep theme in dependency array

    const applyTheme = (selectedTheme) => {
         if (selectedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    useEffect(() => {
        // Apply theme whenever it changes
        applyTheme(theme);
    }, [theme]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            // Update Firebase Auth profile
            await updateProfile(auth.currentUser, {
                displayName: displayName
            });

            // Update Firestore user document
            await updateDoc(doc(db, 'users', user.uid), {
                displayName,
                bio,
                website,
                location,
                updatedAt: new Date()
            });

            setSuccess('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            setError('Failed to update profile: ' + error.message);
        }
    };

    const handleEmailUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (email === user.email) {
            setError('This is already your current email');
            return;
        }

        try {
            // Reauthenticate user
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await reauthenticateWithCredential(user, credential);

            // Update email
            await updateEmail(user, email);

            // Update Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                email,
                updatedAt: new Date()
            });

            setSuccess('Email updated successfully!');
            setCurrentPassword('');
        } catch (error) {
            console.error('Error updating email:', error);
            setError('Failed to update email: ' + error.message);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        try {
            // Reauthenticate user
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            setSuccess('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Error updating password:', error);
            setError('Failed to update password: ' + error.message);
        }
    };

    const handlePreferencesUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                theme,
                notificationsEnabled,
                emailNotifications,
                updatedAt: new Date()
            });

            setSuccess('Preferences updated successfully!');
        } catch (error) {
            console.error('Error updating preferences:', error);
            setError('Failed to update preferences: ' + error.message);
        }
    };

    const handleAccountDelete = async () => {
        try {
            // Reauthenticate user
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await reauthenticateWithCredential(user, credential);

            // Delete user from Firebase Auth
            await user.delete();

            navigate('/');
        } catch (error) {
            console.error('Error deleting account:', error);
            setError('Failed to delete account: ' + error.message);
            setIsDeleteModalOpen(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 dark:bg-gray-900 dark:text-white">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center dark:text-white">
                        <Cog6ToothIcon className="h-8 w-8 mr-2 text-teal-600" />
                        Account Settings
                    </h1>
                    <p className="text-gray-600 mt-2 dark:text-gray-300">Manage your profile, preferences, and security settings</p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded dark:bg-red-800 dark:border-red-900 dark:text-red-100">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <XMarkIcon className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 dark:text-red-100">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded dark:bg-green-800 dark:border-green-900 dark:text-green-100">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <SparklesIcon className="h-5 w-5 text-green-500" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-green-700 dark:text-green-100">{success}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white shadow rounded-lg divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {/* Profile Settings */}
                    <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center dark:text-white">
                            <UserCircleIcon className="h-5 w-5 mr-2 text-teal-600" />
                            Profile Information
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">Update your basic profile information</p>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <form onSubmit={handleProfileUpdate}>
                            <div className="grid grid-cols-6 gap-6">
                                <div className="col-span-6 sm:col-span-3">
                                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        id="displayName"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>

                                <div className="col-span-6 sm:col-span-3">
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        disabled
                                    />
                                </div>

                                <div className="col-span-6">
                                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Bio
                                    </label>
                                    <textarea
                                        id="bio"
                                        rows={3}
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>

                                <div className="col-span-6 sm:col-span-3">
                                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Website
                                    </label>
                                    <input
                                        type="url"
                                        id="website"
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>

                                <div className="col-span-6 sm:col-span-3">
                                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        id="location"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    type="submit"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                                >
                                    Save Profile
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Email Settings */}
                    <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center dark:text-white">
                            <EnvelopeIcon className="h-5 w-5 mr-2 text-teal-600" />
                            Email Address
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">Change your account email address</p>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <form onSubmit={handleEmailUpdate}>
                            <div className="grid grid-cols-6 gap-6">
                                <div className="col-span-6 sm:col-span-4">
                                    <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        New Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="newEmail"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>

                                <div className="col-span-6 sm:col-span-4">
                                    <label htmlFor="currentPasswordForEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        id="currentPasswordForEmail"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    type="submit"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                                >
                                    Update Email
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Password Settings */}
                    <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center dark:text-white">
                            <LockClosedIcon className="h-5 w-5 mr-2 text-teal-600" />
                            Password
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">Change your account password</p>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <form onSubmit={handlePasswordUpdate}>
                            <div className="grid grid-cols-6 gap-6">
                                <div className="col-span-6 sm:col-span-4">
                                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        id="currentPassword"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="col-span-6 sm:col-span-4">
                                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        id="newPassword"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="col-span-6 sm:col-span-4">
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    type="submit"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                                >
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Preferences */}
                    <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center dark:text-white">
                            <BookOpenIcon className="h-5 w-5 mr-2 text-teal-600" />
                            Preferences
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">Customize your application preferences</p>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <form onSubmit={handlePreferencesUpdate}>
                            <div className="grid grid-cols-6 gap-6">
                                 <div className="col-span-6 sm:col-span-3">
                                    <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Theme
                                    </label>
                                    <select
                                        id="theme"
                                        value={theme}
                                        onChange={(e) => setTheme(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                    </select>
                                </div>

                                <div className="col-span-6 sm:col-span-3 flex items-center">
                                    <input
                                        type="checkbox"
                                        id="notificationsEnabled"
                                        checked={notificationsEnabled}
                                        onChange={(e) => setNotificationsEnabled(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-teal-500"
                                    />
                                    <label htmlFor="notificationsEnabled" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Enable Notifications
                                    </label>
                                </div>

                                <div className="col-span-6 sm:col-span-3 flex items-center">
                                    <input
                                        type="checkbox"
                                        id="emailNotifications"
                                        checked={emailNotifications}
                                        onChange={(e) => setEmailNotifications(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-teal-500"
                                    />
                                    <label htmlFor="emailNotifications" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Enable Email Notifications
                                    </label>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    type="submit"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                                >
                                    Update Preferences
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Security Settings */}
                    <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center dark:text-white">
                            <ShieldCheckIcon className="h-5 w-5 mr-2 text-teal-600" />Security
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">Manage your account security settings</p>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-700 dark:text-gray-300">Delete your account permanently.</p>
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                <TrashIcon className="h-4 w-4 mr-2" />
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Account Modal */}
            <Transition.Root show={isDeleteModalOpen} as={Fragment}>
                <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" onClose={setIsDeleteModalOpen}>
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Modal backdrop */}
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                        </Transition.Child>

                        {/* This element is to trick the browser into centering the modal content. */}
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                            &#8203;
                        </span>

                        {/* Modal panel */}
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full dark:bg-gray-800">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 dark:bg-gray-800">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10 dark:bg-red-900">
                                            <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-300" aria-hidden="true" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                            <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                                                Delete Account
                                            </Dialog.Title>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500 dark:text-gray-300">
                                                    Are you sure you want to delete your account? This action cannot be undone.
                                                </p>
                                            </div>
                                             <div className="mt-4">
                                                <label htmlFor="currentPasswordDelete" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Current Password
                                                </label>
                                                <input
                                                    type="password"
                                                    id="currentPasswordDelete"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse dark:bg-gray-700">
                                    <button
                                        type="button"
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                        onClick={handleAccountDelete}
                                    >
                                        Delete
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500 dark:border-gray-500"
                                        onClick={() => setIsDeleteModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition.Root>
        </div>
    );
};

export default Settings;
