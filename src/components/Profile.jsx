import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, deleteDoc,serverTimestamp} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { UserCircleIcon, HeartIcon, ChatBubbleLeftIcon, TrashIcon, PencilIcon, CameraIcon } from '@heroicons/react/24/solid';

function Profile() {
    const [profileUser, setProfileUser] = useState(null);
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [posts, setPosts] = useState([]);
    const [followers, setFollowers] = useState(0);
    const [following, setFollowing] = useState(0);
    const [profilePicture, setProfilePicture] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingPostId, setEditingPostId] = useState(null);
    const [editedContent, setEditedContent] = useState('');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [newProfilePicture, setNewProfilePicture] = useState(null);
    const [previewProfilePicture, setPreviewProfilePicture] = useState(null);
    const navigate = useNavigate();
    const currentUser = auth.currentUser;
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                if (currentUser) {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setProfileUser(userData);
                        setUsername(userData.username);
                        setBio(userData.bio || '');
                        setFollowing(userData.following?.length || 0);
                        setFollowers(userData.followers?.length || 0);
                        setProfilePicture(userData.profilePicture || null);
    
                        const postsQuery = query(collection(db, 'posts'), where('userId', '==', currentUser.uid));
                        const postsSnapshot = await getDocs(postsQuery);
                        const postsData = postsSnapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                            likes: doc.data().likes || [],
                            comments: doc.data().comments || [],
                            createdAt: doc.data().createdAt 
                        }));
                        setPosts(postsData);
    
                        
                        await updatePosts();
                        console.log("updatePosts() called successfully!"); 
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setLoading(false);
            }
        };
    
        fetchUserData();
    }, [currentUser]);

    const handleProfilePictureChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewProfilePicture(reader.result);
                setPreviewProfilePicture(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        try {
            let pictureUrl = profilePicture;

            if (newProfilePicture) {
                pictureUrl = newProfilePicture;
            }

            await updateDoc(doc(db, 'users', currentUser.uid), {
                username,
                bio,
                ...(pictureUrl !== profilePicture && { profilePicture: pictureUrl })
            });

            if (pictureUrl !== profilePicture) {
                const postsQuery = query(collection(db, 'posts'), where('userId', '==', currentUser.uid));
                const postsSnapshot = await getDocs(postsQuery);

                const batchUpdates = [];
                postsSnapshot.forEach((postDoc) => {
                    batchUpdates.push(updateDoc(postDoc.ref, {
                        userProfilePicture: pictureUrl
                    }));
                });

                await Promise.all(batchUpdates);
            }

            setProfilePicture(pictureUrl);
            setPosts(prev => prev.map(post => ({
                ...post,
                userProfilePicture: pictureUrl
            })));
            setIsEditingProfile(false);
            setNewProfilePicture(null);
            setPreviewProfilePicture(null);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const handleLike = async (postId) => {
        if (!currentUser) return navigate('/login');

        try {
            const postRef = doc(db, 'posts', postId);
            await updateDoc(postRef, {
                likes: arrayUnion(currentUser.uid)
            });

            setPosts(prev => prev.map(post =>
                post.id === postId
                    ? { ...post, likes: [...(post.likes || []), currentUser.uid] }
                    : post
            ));
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const handleEditPost = (post) => {
        setEditingPostId(post.id);
        setEditedContent(post.content);
    };

    const handleSaveEdit = async (postId) => {
        try {
            await updateDoc(doc(db, 'posts', postId), {
                content: editedContent
            });

            setPosts(prev => prev.map(post =>
                post.id === postId
                    ? { ...post, content: editedContent }
                    : post
            ));
            setEditingPostId(null);
        } catch (error) {
            console.error('Error updating post:', error);
        }
    };

    const handleDeletePost = async (postId) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            try {
                await deleteDoc(doc(db, 'posts', postId));
                setPosts(prev => prev.filter(post => post.id !== postId));
            } catch (error) {
                console.error('Error deleting post:', error);
            }
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) {
            return 'No date';
        }
    
       
        if (timestamp.toDate) {
            try {
                const date = timestamp.toDate();
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });
            } catch (error) {
                console.error('Error converting timestamp to date:', error);
                return 'Invalid Date';
            }
        }
        
        else if (timestamp instanceof Date) {
            return timestamp.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        }
       
        else if (typeof timestamp === 'number') {
            return new Date(timestamp).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        }
        
        else if (typeof timestamp === 'string') {
            const date = new Date(timestamp);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });
            }
        }
    
        return 'No date';
    };
    async function updatePosts() {
        const postsRef = collection(db, 'posts');
        const querySnapshot = await getDocs(postsRef);
    
        querySnapshot.forEach(async (docSnapshot) => {
            const postData = docSnapshot.data();
            if (!postData.createdAt) {
                await updateDoc(doc(db, 'posts', docSnapshot.id), {
                    createdAt: serverTimestamp(),
                });
                console.log(`Updated post: ${docSnapshot.id}`);
            }
        });
        console.log('Finished updating posts.');
    }
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-pulse text-gray-600">Loading profile...</div>
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-600">User not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
           
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex flex-col md:flex-row items-center md:items-start space-y-8 md:space-y-0 md:space-x-12">
                        <div className="flex-shrink-0 relative">
                            <div className="h-32 w-32 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-lg relative">
                                {previewProfilePicture ? (
                                    <img src={previewProfilePicture} alt="Profile preview" className="h-full w-full object-cover" />
                                ) : profilePicture ? (
                                    <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <UserCircleIcon className="h-full w-full text-gray-400" />
                                )}

                                {isEditingProfile && (
                                    <button onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-md hover:bg-blue-700 transition-colors">
                                        <CameraIcon className="h-5 w-5" />
                                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleProfilePictureChange} accept="image/*" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            {isEditingProfile ? (
                                <div className="space-y-4">
                                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="text-3xl font-bold text-gray-900 bg-gray-100 rounded-md px-3 py-1 w-full md:w-auto" />
                                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="text-gray-600 bg-gray-100 rounded-md px-3 py-2 w-full" rows="3" placeholder="Tell us about yourself..." />
                                    <div className="flex space-x-3">
                                        <button onClick={handleSaveProfile} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Save Profile</button>
                                        <button onClick={() => { setIsEditingProfile(false); setPreviewProfilePicture(null); setNewProfilePicture(null); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-3xl font-bold text-gray-900">{username}</h1>
                                    <p className="mt-2 text-gray-600">{bio || 'Writer and content creator'}</p>

                                    <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-6">
                                        <div className="flex flex-col items-center md:items-start">
                                            <span className="text-2xl font-bold text-gray-900">{posts.length}</span>
                                            <span className="text-sm text-gray-500">Articles</span>
                                        </div>
                                        <div className="flex flex-col items-center md:items-start">
                                            <span className="text-2xl font-bold text-gray-900">{followers}</span>
                                            <span className="text-sm text-gray-500">Followers</span>
                                        </div>
                                        <div className="flex flex-col items-center md:items-start">
                                            <span className="text-2xl font-bold text-gray-900">{following}</span>
                                            <span className="text-sm text-gray-500">Following</span>
                                        </div>
                                    </div>

                                    <button onClick={() => setIsEditingProfile(true)} className="mt-6 px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors">Edit Profile</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

           
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-200">My Articles</h2>

                {posts.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-500 text-lg mb-4">You haven't written any articles yet</p>
                        <button onClick={() => navigate('/home')} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Create Your First Article</button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {posts.map((post) => {
                            console.log('Post:', post);
                            console.log('post.createdAt (raw):', post.createdAt);
                            console.log('post.createdAt (type):', typeof post.createdAt);
                            const formattedDate = formatDate(post.createdAt);
                            console.log('Formatted date:', formattedDate);

                            return (
                                <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:shadow-lg">
                                    {post.image && <img src={post.image} alt={post.title} className="w-full h-64 object-cover" />}
                                    <div className="p-6">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h3>
                                            {currentUser && currentUser.uid === post.userId && (
                                                <div className="flex space-x-2">
                                                    <button onClick={() => handleEditPost(post)} className="text-gray-400 hover:text-blue-600 transition-colors" aria-label="Edit post">
                                                        <PencilIcon className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => handleDeletePost(post.id)} className="text-gray-400 hover:text-red-600 transition-colors" aria-label="Delete post">
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-sm text-gray-500 mb-4">
                                            Published on {formatDate(post.createdAt)}
                                        </div>

                                        {editingPostId === post.id ? (
                                            <div className="mb-4">
                                                <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows="6" />
                                                <div className="flex justify-end space-x-3 mt-3">
                                                    <button onClick={() => setEditingPostId(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">Cancel</button>
                                                    <button onClick={() => handleSaveEdit(post.id)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Save Changes</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-700 mb-6 whitespace-pre-line">{post.content}</p>
                                        )}

                                        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                                            <div className="flex items-center space-x-4">
                                                <button onClick={() => handleLike(post.id)} className={`flex items-center space-x-1 ${post.likes?.includes(currentUser?.uid) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'} transition-colors`}>
                                                    <HeartIcon className="h-5 w-5" />
                                                    <span>{post.likes?.length || 0}</span>
                                                </button>
                                                <button onClick={() => navigate(`/post/${post.id}`)} className="flex items-center space-x-1 text-gray-400 hover:text-blue-500 transition-colors">
                                                    <ChatBubbleLeftIcon className="h-5 w-5" />
                                                    <span>{post.comments?.length || 0}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Profile;