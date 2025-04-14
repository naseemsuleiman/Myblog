import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, orderBy, getDoc, arrayRemove } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';

import { TrashIcon, NoSymbolIcon as BanIcon, CheckIcon, UserIcon, PencilSquareIcon, DocumentTextIcon, ChatBubbleLeftIcon as ChatAltIcon, HeartIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../Context/AuthContext';
import Chart from './Chart';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

const Dashboard = () => {
    const [users, setUsers] = useState([]);
    const [posts, setPosts] = useState([]);
    const { user, handleLogout } = useAuth();
    const navigate = useNavigate();
    const [comments, setComments] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalPosts: 0,
        totalComments: 0,
        activeUsers: 0,
        bannedUsers: 0,
        postLikes: 0,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);


                const usersSnapshot = await getDocs(collection(db, 'users'));

                const usersData = usersSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: convertToDate(data.createdAt),
                        userName: data.userName || data.email?.split('@')[0] || 'Unknown'
                    };
                }).filter(user => user.email !== 'admin@gmail.com');
                console.log('usersdata', usersSnapshot.docs.map(doc => doc.data()))


                const postsQuery = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
                const postsSnapshot = await getDocs(postsQuery);
                const postsData = postsSnapshot.docs.map(doc => {
                    const postData = doc.data();
                    return {
                        id: doc.id,
                        ...postData,
                        timestamp: convertToDate(postData.timestamp)
                    };
                });


                let allComments = [];
                postsData.forEach(post => {
                    if (post.comments && Array.isArray(post.comments)) {
                        const postComments = post.comments.map(comment => ({
                            ...comment,
                            postId: post.id,
                            postTitle: post.title,
                            timestamp: convertToDate(comment.timestamp)
                        }));
                        allComments = [...allComments, ...postComments];
                    }
                });

                setUsers(usersData);
                setPosts(postsData);
                setComments(allComments);

                const activeUsers = usersData.filter(user => !user.isBanned).length;
                const bannedUsers = usersData.filter(user => user.isBanned).length;
                const totalPostLikes = postsData.reduce((sum, post) => sum + (post.likes?.length || 0), 0);

                setStats({
                    totalUsers: usersData.length,
                    totalPosts: postsData.length,
                    totalComments: allComments.length,
                    activeUsers,
                    bannedUsers,
                    postLikes: totalPostLikes,
                });

                setLoading(false);
            } catch (error) {
                console.error('Error fetching admin data:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);


    const convertToDate = (timestamp) => {
        if (!timestamp) return null;
        if (typeof timestamp.toDate === 'function') return timestamp.toDate();
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
        return timestamp;
    };


    const formatDate = (date) => {
        if (!date) return 'N/A';


        if (date.toDate && typeof date.toDate === 'function') {
            return date.toDate().toLocaleDateString();
        }


        if (date instanceof Date) {
            return date.toLocaleDateString();
        }


        if (typeof date === 'string' || typeof date === 'number') {
            return new Date(date).toLocaleDateString();
        }

        console.warn('Unrecognized date format:', date);
        return 'Invalid Date';
    };
    { console.log('Full user object:', user) }


    const handleDeletePost = async (postId) => {
        try {
            await deleteDoc(doc(db, 'posts', postId));
            setPosts(posts.filter(post => post.id !== postId));
            setStats(prev => ({ ...prev, totalPosts: prev.totalPosts - 1 }));

            setComments(comments.filter(comment => comment.postId !== postId));
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };

    const handleDeleteComment = async (postId, commentToDelete) => {
        try {
            const postRef = doc(db, 'posts', postId);
            await updateDoc(postRef, {
                comments: arrayRemove(commentToDelete)
            });

            setComments(comments.filter(comment =>
                !(comment.postId === postId &&
                    comment.timestamp === commentToDelete.timestamp &&
                    comment.userId === commentToDelete.userId)
            ));

            setStats(prev => ({ ...prev, totalComments: prev.totalComments - 1 }));
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    const userStatusData = {
        labels: ['Active Users', 'Banned Users'],
        datasets: [{ data: [stats.activeUsers, stats.bannedUsers], backgroundColor: ['#00897B', '#89000E'], borderWidth: 1 }],
    };

    const handleLogoutDash = () => {
        handleLogout()
            .then(() => {
                navigate('/');
            })
            .catch((error) => {
                console.error('Logout or navigation error:', error);
            });
    };
    const deleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to permanently delete this user?')) {
          try {
            const deleteUserFunction = httpsCallable(functions, 'deleteUser');
            await deleteUserFunction({ userId });
            alert('User deleted successfully');
           
            setUsers(users.filter(user => user.id !== userId));
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        }
      };

    const postEngagementData = {
        labels: ['Posts', 'Likes'],
        datasets: [{ label: 'Post Engagement', data: [stats.totalPosts, stats.postLikes], backgroundColor: ['#3b82f6', '#ec4899'] }],
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>;
    }
    console.log('users', users)

    return (

        <div className="min-h-screen bg-gray-50">
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
                <div className="flex items-center justify-center h-16 px-4 bg-teal-600">
                    <PencilSquareIcon className="h-8 w-8 text-white" />
                    <h1 className="text-white font-bold text-xl">Inkify Admin</h1>
                </div>
                <nav className="p-4">
                    <button onClick={() => setActiveTab('dashboard')} className={`flex items-center w-full px-4 py-2 mb-2 rounded-lg ${activeTab === 'dashboard' ? 'bg-teal-100 text-teal-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Dashboard
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`flex items-center w-full px-4 py-2 mb-2 rounded-lg ${activeTab === 'users' ? 'bg-teal-100 text-teal-700' : 'text-gray-700 hover:bg-teal-100'}`}>
                        <UserIcon className="h-5 w-5 mr-3" />
                        Users
                    </button>
                    <button onClick={() => setActiveTab('posts')} className={`flex items-center w-full px-4 py-2 mb-2 rounded-lg ${activeTab === 'posts' ? 'bg-teal-100 text-teal-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                        <DocumentTextIcon className="h-5 w-5 mr-3" />
                        Posts
                    </button>
                    <button onClick={() => setActiveTab('comments')} className={`flex items-center w-full px-4 py-2 mb-2 rounded-lg ${activeTab === 'comments' ? 'bg-teal-100 text-teal-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                        <ChatAltIcon className="h-5 w-5 mr-3" />
                        Comments
                    </button>
                    <button onClick={handleLogoutDash} className="flex items-center w-full px-4 py-2 rounded-lg text-teal-600 hover:bg-teal-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v-7a3 3 0 00-3-3H6a3 3 0 00-3 3v7a3 3 0 003 3h4a3 3 0 003-3z" />
                        </svg>
                        Sign Out
                    </button>
                </nav>
            </div>

            <div className="ml-64 p-8">
                {activeTab === 'dashboard' && (
                    <div>
                        <Chart />
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-xl shadow">
                                <div className="flex items-center">
                                    <div className="p-3 rounded-full bg-indigo-100 text-teal-600 mr-4">
                                        <UserIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Users</p>
                                        <p className="text-2xl font-bold">{stats.totalUsers}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow">
                                <div className="flex items-center">
                                    <div className="p-3 rounded-full bg-teal-100 text-teal-600 mr-4">
                                        <DocumentTextIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Posts</p>
                                        <p className="text-2xl font-bold">{stats.totalPosts}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow">
                                <div className="flex items-center">
                                    <div className="p-3 rounded-full bg-teal-100 text-teal-600 mr-4">
                                        <ChatAltIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Comments</p>
                                        <p className="text-2xl font-bold">{stats.totalComments}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow">
                                <div className="flex items-center">
                                    <div className="p-3 rounded-full bg-teal-100 text-teal-600 mr-4">
                                        <HeartIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Post Likes</p>
                                        <p className="text-2xl font-bold">{stats.postLikes}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">


                           
                                
                           
                        </div>




                    </div>
                )}
                {activeTab === 'users' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                            <div className="flex space-x-2">
                                <input type="text" placeholder="Search users..." className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">Filter</button>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th> */}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <UserIcon className="h-10 w-10 text-gray-400" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                            {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(user.timestamp)}
                                            </td> */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isBanned ? 'bg-red-100 text-teal-800' : 'bg-teal-100 text-green-800'}`}>
                                                    {user.isBanned ? 'Banned' : 'Active'}
                                                </span>
                                            </td>
                                          
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'posts' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Post Management</h2>
                            <div className="flex space-x-2">
                                <input type="text" placeholder="Search posts..." className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">Filter</button>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Likes</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {posts.map(post => (
                                        <tr key={post.id}>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</div>
                                                <div className="text-sm text-gray-500 line-clamp-1">{post.content?.substring(0, 50)}...</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{post.userName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(post.timestamp)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {post.likes?.length || 0}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {post.comments?.length || 0}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button onClick={() => handleDeletePost(post.id)} className="text-red-600 hover:text-teal-900">
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'comments' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Comment Management</h2>
                            <div className="flex space-x-2">
                                <input type="text" placeholder="Search comments..." className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">Filter</button>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {comments.map(comment => (
                                        <tr key={`${comment.postId}-${comment.timestamp}-${comment.userId}`}>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 line-clamp-1">{comment.text}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{comment.userName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 line-clamp-1">{comment.postTitle}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(comment.timestamp)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => handleDeleteComment(comment.postId, comment)}
                                                    className="text-red-600 hover:text-teal-900"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;