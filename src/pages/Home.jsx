import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { auth, db } from '../firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  where,
  limit,
  startAfter,
  getDocs,
  setDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import {
  PencilSquareIcon,
  TrashIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UserCircleIcon,
  BookmarkIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import { Dialog, Transition } from '@headlessui/react';

function Home() {
  const [title, setTitle] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [followedUsers, setFollowedUsers] = useState([]);
  const [sortOption, setSortOption] = useState('timestamp');
  const [recentPosts, setRecentPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [replyToComment, setReplyToComment] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const POSTS_PER_PAGE = 5;

  const ViewTracker = ({ postId }) => {
    const [isTracked, setIsTracked] = useState(false);
    const user = auth.currentUser;
  
    useEffect(() => {
      if (!user?.uid || !postId || isTracked) return;
  
      const trackView = async () => {
        try {
          const postRef = doc(db, 'published', postId);
          const postSnap = await getDoc(postRef);
  
          if (!postSnap.exists()) {
            console.warn('Post does not exist:', postId);
            return;
          }
  
          const postData = postSnap.data();
          const viewedBy = postData.viewedBy || [];
  
          if (viewedBy.includes(user.uid)) {
            setIsTracked(true);
            return;
          }
  
          await updateDoc(postRef, {
            views: increment(1),
            viewedBy: arrayUnion(user.uid),
          });
  
          setIsTracked(true);
        } catch (error) {
          console.error('Error tracking view:', error);
        }
      };
  
      const timer = setTimeout(trackView, 5000);
      return () => clearTimeout(timer);
    }, [postId, user?.uid, isTracked]);
  
    return null;
  };

  useEffect(() => {
    if (!user) {
      navigate('/posts');
    }
  }, [user, navigate]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          if (userDoc.exists()) {
            setCurrentUsername(userDoc.data().username);
            setFollowedUsers(userDoc.data().following || []);

            const notificationsQuery = query(
              collection(db, 'users', authUser.uid, 'notifications'),
              orderBy('timestamp', 'desc')
            );

            const notificationsUnsubscribe = onSnapshot(
              notificationsQuery,
              (snapshot) => {
                const notificationData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setNotifications(notificationData);
              },
              (error) => {
                console.error('Error fetching notifications:', error);
                setError('Failed to load notifications');
              }
            );

            return () => notificationsUnsubscribe();
          } else {
            setCurrentUsername('User');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setError('Failed to load user data');
        }
      } else {
        setCurrentUsername('');
        setFollowedUsers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribePosts = () => {};
    setError(null);

    const setupPostsListener = async () => {
      try {
        unsubscribePosts = await fetchPosts();
      } catch (error) {
        console.error('Error setting up posts listener:', error);
        setError('Failed to load posts');
        setLoading(false);
      }
    };

    setupPostsListener();

    return () => {
      unsubscribePosts();
    };
  }, [sortOption, selectedCategory, activeTab, user, followedUsers]);

  const fetchPosts = async () => {
    setLoading(true);
    let q;

    try {
      if (activeTab === 'following' && user && followedUsers.length > 0) {
        q = query(
          collection(db, 'posts'),
          where('userId', 'in', followedUsers),
          orderBy(sortOption, 'desc'),
          limit(POSTS_PER_PAGE)
        );
      } else if (selectedCategory) {
        q = query(
          collection(db, 'posts'),
          where('category', '==', selectedCategory),
          orderBy(sortOption, 'desc'),
          limit(POSTS_PER_PAGE)
        );
      } else {
        q = query(
          collection(db, 'posts'),
          orderBy(sortOption, 'desc'),
          limit(POSTS_PER_PAGE)
        );
      }

      if (lastVisible) {
        if (activeTab === 'following' && user && followedUsers.length > 0) {
          q = query(
            collection(db, 'posts'),
            where('userId', 'in', followedUsers),
            orderBy(sortOption, 'desc'),
            startAfter(lastVisible),
            limit(POSTS_PER_PAGE)
          );
        } else if (selectedCategory) {
          q = query(
            collection(db, 'posts'),
            where('category', '==', selectedCategory),
            orderBy(sortOption, 'desc'),
            startAfter(lastVisible),
            limit(POSTS_PER_PAGE)
          );
        } else {
          q = query(
            collection(db, 'posts'),
            orderBy(sortOption, 'desc'),
            startAfter(lastVisible),
            limit(POSTS_PER_PAGE)
          );
        }
      }

      const unsubscribe = onSnapshot(q,
        async (snapshot) => {
          if (snapshot.empty) {
            setHasMore(false);
            setLoading(false);
            return;
          }

          const postList = snapshot.docs.map((docElement) => ({
            id: docElement.id,
            ...docElement.data(),
            views: docElement.data().views || 0,
            viewedBy: docElement.data().viewedBy || []
          }));

          if (snapshot.docs.length < POSTS_PER_PAGE) {
            setHasMore(false);
          } else {
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
          }

          const userIds = postList.map((post) => post.userId);
          const uniqueUserIds = [...new Set(userIds)];

          if (uniqueUserIds.length > 0) {
            try {
              const usersQuery = query(collection(db, 'users'), where('__name__', 'in', uniqueUserIds));
              const usersSnapshot = await getDocs(usersQuery);
              const userMap = {};

              usersSnapshot.forEach((userDoc) => {
                userMap[userDoc.id] = userDoc.data().username || 'Anonymous';
              });

              const postsWithUsernames = postList.map((post) => ({
                ...post,
                userName: userMap[post.userId],
              }));

              setPosts((prevPosts) => {
                if (lastVisible) {
                  const combined = [...prevPosts, ...postsWithUsernames];
                  return combined.filter((post, index, self) =>
                    index === self.findIndex((p) => p.id === post.id)
                  );
                } else {
                  return postsWithUsernames;
                }
              });
            } catch (error) {
              console.error('Error fetching usernames:', error);
              setPosts(postList);
            }
          } else {
            setPosts(postList);
          }

          setLoading(false);
          setFetchingMore(false);
        },
        (error) => {
          console.error('Error in posts snapshot:', error);
          setError('Failed to load posts');
          setLoading(false);
          setFetchingMore(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up posts query:', error);
      setError('Failed to load posts');
      setLoading(false);
      setFetchingMore(false);
      return () => {};
    }
  };

  const fetchMorePosts = () => {
    if (hasMore && !fetchingMore) {
      setFetchingMore(true);
      fetchPosts();
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recentPostsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRecentPosts(recentPostsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      const categoriesList = categoriesSnapshot.docs.map(doc => doc.data().name);
      setCategories(categoriesList);
    };

    fetchCategories();

    const unsubscribe = onSnapshot(collection(db, 'posts'), (snapshot) => {
      const allCategories = snapshot.docs.map((doc) => doc.data().category).filter(Boolean);
      const uniqueCategories = [...new Set(allCategories)];
      setCategories(uniqueCategories);
    });
    return () => unsubscribe();
  }, []);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!user || !title || !postContent) {
      alert('Please fill all fields and sign in.');
      return;
    }

    try {
      await addDoc(collection(db, 'posts'), {
        title,
        image: imageBase64,
        content: postContent,
        userId: user.uid,
        userName: currentUsername,
        category: selectedCategory || "General",
        createdAt: serverTimestamp(),
        likes: [],
        comments: [],
        views: 0,
        viewedBy: []
      });
      setTitle('');
      setImageBase64('');
      setPostContent('');
      setSelectedCategory('');
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error posting:', error);
      alert(`Failed to post: ${error.message}`);
    }
  };

  const handleLike = async (postId) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    const isLiked = post.likes?.includes(user.uid);

    try {
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
              ...post,
              likes: isLiked
                ? post.likes.filter(id => id !== user.uid)
                : [...(post.likes || []), user.uid]
            }
            : post
        )
      );

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });

      if (!isLiked && post.userId !== user.uid) {
        await addDoc(collection(db, 'users', post.userId, 'notifications'), {
          type: 'like',
          fromUserId: user.uid,
          fromUsername: currentUsername,
          postId: postId,
          postTitle: post.title,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (postId, comment) => {
    if (!user || !comment.trim()) return;
    const post = posts.find(p => p.id === postId);

    try {
      const newComment = {
        userId: user.uid,
        text: comment,
        userName: currentUsername,
        timestamp: serverTimestamp()
      };

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      });

      if (post.userId !== user.uid) {
        await addDoc(collection(db, 'users', post.userId, 'notifications'), {
          type: 'comment',
          fromUserId: user.uid,
          fromUsername: currentUsername,
          postId: postId,
          postTitle: post.title,
          commentText: comment,
          timestamp: serverTimestamp()
        });
      }

      setCommentInput('');
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!user) return;
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    if (postDoc.exists() && postDoc.data().userId === user.uid) {
      if (window.confirm('Are you sure you want to delete this post?')) {
        await deleteDoc(postRef);
      }
    } else {
      alert('You can only delete your own posts.');
    }
  };

  const handleFollow = async (userIdToFollow) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        following: arrayUnion(userIdToFollow),
      });

      await updateDoc(doc(db, 'users', userIdToFollow), {
        followers: arrayUnion(user.uid),
      });

      await addDoc(collection(db, 'users', userIdToFollow, 'notifications'), {
        type: 'follow',
        fromUserId: user.uid,
        fromUsername: currentUsername,
        timestamp: serverTimestamp(),
      });

      setFollowedUsers((prev) => [...prev, userIdToFollow]);
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (userIdToUnfollow) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        following: arrayRemove(userIdToUnfollow),
      });

      await updateDoc(doc(db, 'users', userIdToUnfollow), {
        followers: arrayRemove(user.uid),
      });

      setFollowedUsers((prev) => prev.filter(id => id !== userIdToUnfollow));
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const handleDeleteComment = async (postId, commentToDelete) => {
    if (!user) return;
    
    if (commentToDelete.userId !== user.uid && !posts.find(p => p.id === postId)?.userId === user.uid) {
      alert("You can only delete your own comments or comments on your posts");
      return;
    }
  
    try {
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) return;
  
      const currentComments = postDoc.data().comments || [];
      const commentIndex = currentComments.findIndex(c => 
        c.timestamp?.toDate?.()?.getTime() === commentToDelete.timestamp?.toDate?.()?.getTime() &&
        c.userId === commentToDelete.userId &&
        c.text === commentToDelete.text
      );
  
      if (commentIndex === -1) {
        console.error("Comment not found for deletion");
        return;
      }
  
      const updatedComments = [...currentComments];
      updatedComments.splice(commentIndex, 1);
  
      await updateDoc(postRef, {
        comments: updatedComments
      });
  
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, comments: updatedComments }
          : post
      ));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReply = async (postId, parentComment) => {
    if (!user || !replyContent.trim()) return;
  
    try {
     
      const newReply = {
        userId: user.uid,
        userName: currentUsername,
        text: replyContent,
        parentCommentId: parentComment.timestamp?.toDate 
          ? parentComment.timestamp.toDate().getTime() 
          : parentComment.timestamp,
        isReply: true,
        repliedTo: {
          userId: parentComment.userId,
          userName: parentComment.userName
        }
      };
  
      const postRef = doc(db, 'posts', postId);
      
     
      await updateDoc(postRef, {
        comments: arrayUnion({
          ...newReply,
          timestamp: new Date() 
        })
      });
  
      
      const postDoc = await getDoc(postRef);
      const comments = postDoc.data().comments || [];
      const replyIndex = comments.findIndex(c => 
        c.text === newReply.text && 
        c.userId === newReply.userId &&
        !c.timestamp?.seconds
      );
  
      if (replyIndex !== -1) {
        const replyPath = `comments.${replyIndex}.timestamp`;
        await updateDoc(postRef, {
          [replyPath]: serverTimestamp()
        });
      }
  
     
      setPosts(posts.map(post => 
        post.id === postId
          ? { 
              ...post, 
              comments: [...(post.comments || []), {
                ...newReply,
                timestamp: serverTimestamp() 
              }] 
            }
          : post
      ));
  
      
      if (parentComment.userId !== user.uid) {
        await addDoc(collection(db, 'users', parentComment.userId, 'notifications'), {
          type: 'reply',
          fromUserId: user.uid,
          fromUsername: currentUsername,
          postId: postId,
          postTitle: posts.find(p => p.id === postId)?.title,
          replyText: replyContent,
          timestamp: serverTimestamp()
        });
      }
  
      setReplyToComment(null);
      setReplyContent('');
    } catch (error) {
      console.error("Error posting reply:", error);
    }
  };

  const groupCommentsWithReplies = (comments = []) => {
    if (!comments || !comments.length) return [];
  
    const processedComments = comments.map(comment => {
      
      const timestampValue = comment.timestamp?.toDate 
        ? comment.timestamp.toDate().getTime()
        : (comment.timestamp?.seconds ? comment.timestamp.seconds * 1000 : 
           (comment.timestamp ? new Date(comment.timestamp).getTime() : Date.now()));
  
      const parentCommentIdValue = comment.parentCommentId?.toDate 
        ? comment.parentCommentId.toDate().getTime()
        : (comment.parentCommentId?.seconds ? comment.parentCommentId.seconds * 1000 : 
           (comment.parentCommentId ? new Date(comment.parentCommentId).getTime() : null));
  
      return {
        ...comment,
        _timestampValue: timestampValue,
        _parentCommentIdValue: parentCommentIdValue
      };
    });
  
    const parentComments = processedComments.filter(comment => !comment.isReply);
    const replies = processedComments.filter(comment => comment.isReply);
  
    return parentComments.map(parent => ({
      ...parent,
      replies: replies.filter(reply => 
        reply._parentCommentIdValue === parent._timestampValue
      ).sort((a, b) => a._timestampValue - b._timestampValue)
    })).sort((a, b) => b._timestampValue - a._timestampValue);
  };
  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8 flex flex-col">
      <div className="flex flex-col md:flex-row flex-1">
        <aside className="w-full md:w-64 lg:w-72 pr-0 md:pr-6 mb-8 md:mb-0">
          <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100 sticky top-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center">
              <UserCircleIcon className="h-6 w-6 mr-2 text-teal-600" />
              <Link to="/profile" className="text-teal-600 hover:text-teal-800 hover:underline">
                My Profile
              </Link>
            </h3>
            {user ? (
              <div className="flex items-center space-x-3 bg-indigo-50 p-3 rounded-lg">
                <UserCircleIcon className="h-12 w-12 text-teal-600" />
                <div>
                  <p className="font-bold text-gray-800">{currentUsername}</p>
                  <p className="text-xs text-gray-500">
                    Member since {new Date(user.metadata.creationTime).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-2">Sign in to access your profile</p>
                <Link
                  to="/login"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm inline-block"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>

          {user && (
            <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full bg-gradient-to-r from-teal-600 to-teal-600 hover:from-teal-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center"
              >
                <PencilSquareIcon className="h-5 w-5 mr-2" />
                Create Post
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Notifications
            </h3>
            <ul className="space-y-3 max-h-60 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <li key={notification.id} className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    {notification.type === 'follow' && (
                      <div className="flex items-start">
                        <UserCircleIcon className="h-5 w-5 mt-0.5 mr-2 text-indigo-500" />
                        <p className="text-sm text-gray-700">
                          <span className="font-bold">{notification.fromUsername}</span> started following you!
                          <span className="block text-xs text-gray-500 mt-1">
                            {new Date(notification.timestamp?.toDate()).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    )}
                    {notification.type === 'like' && (
                      <div className="flex items-start">
                        <HeartIcon className="h-5 w-5 mt-0.5 mr-2 text-red-500" />
                        <p className="text-sm text-gray-700">
                          <span className="font-bold">{notification.fromUsername}</span> liked your post "{notification.postTitle}"
                          <span className="block text-xs text-gray-500 mt-1">
                            {new Date(notification.timestamp?.toDate()).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    )}
                    {notification.type === 'comment' && (
                      <div className="flex items-start">
                        <ChatBubbleLeftIcon className="h-5 w-5 mt-0.5 mr-2 text-teal-500" />
                        <p className="text-sm text-gray-700">
                          <span className="font-bold">{notification.fromUsername}</span> commented on your post "{notification.postTitle}":
                          <span className="block italic mt-1">"{notification.commentText}"</span>
                          <span className="block text-xs text-gray-500 mt-1">
                            {new Date(notification.timestamp?.toDate()).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    )}
                    {notification.type === 'reply' && (
                      <div className="flex items-start">
                        <ChatBubbleLeftIcon className="h-5 w-5 mt-0.5 mr-2 text-teal-500" />
                        <p className="text-sm text-gray-700">
                          <span className="font-bold">{notification.fromUsername}</span> replied to your comment on "{notification.postTitle}":
                          <span className="block italic mt-1">"{notification.replyText}"</span>
                          <span className="block text-xs text-gray-500 mt-1">
                            {new Date(notification.timestamp?.toDate()).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    )}
                    {notification.type === 'share' && (
                      <div className="flex items-start">
                        <ShareIcon className="h-5 w-5 mt-0.5 mr-2 text-indigo-500" />
                        <p className="text-sm text-gray-700">
                          <span className="font-bold">{notification.fromUsername}</span> shared your post "{notification.postTitle}"
                          <span className="block text-xs text-gray-500 mt-1">
                            {new Date(notification.timestamp?.toDate()).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    )}
                    {notification.type === 'save' && (
                      <div className="flex items-start">
                        <BookmarkIcon className="h-5 w-5 mt-0.5 mr-2 text-yellow-500" />
                        <p className="text-sm text-gray-700">
                          <span className="font-bold">{notification.fromUsername}</span> saved your post "{notification.postTitle}"
                          <span className="block text-xs text-gray-500 mt-1">
                            {new Date(notification.timestamp?.toDate()).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 italic">No new notifications</p>
                </div>
              )}
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold mb-3 text-gray-800">Discover</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white"
                >
                  <option value="timestamp">Newest First</option>
                  <option value="likes">Most Popular</option>
                  <option value="comments">Most Discussed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categories
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition bg-white"
                  required
                >
                  <option value="">Select a category</option>
                  <option value="Technology">Technology</option>
                  <option value="Travel">Travel</option>
                  <option value="Food">Food</option>
                  <option value="Lifestyle">Lifestyle</option>
                  <option value="Health">Health</option>
                  <option value="Finance">Finance</option>
                  <option value="Education">Education</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Sports">Sports</option>
                  <option value="Science">Science</option>
                </select>
              </div>

              <div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-100">
                <h3 className="text-lg font-bold mb-4 text-gray-800">Trending Now</h3>
                <ul className="space-y-3">
                  {recentPosts.map((post) => (
                    <li key={post.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <a
                        href={`#${post.id}`}
                        className="flex items-start hover:bg-gray-50 p-2 rounded-lg transition"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-teal-600 hover:underline">{post.title}</p>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <span>{post.userName}</span>
                            <span className="mx-1">•</span>
                            <span>{post.likes?.length || 0} likes</span>
                            <span className="mx-1">•</span>
                            <span>{post.views || 0} views</span>
                          </div>
                        </div>
                        {post.image && (
                          <div className="ml-3 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                            <img src={post.image} alt="Post thumbnail" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setPosts([]);
                    setLastVisible(null);
                    setActiveTab('all');
                  }}
                  className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  All Posts
                </button>
                {user && (
                  <button
                    onClick={() => {
                      setPosts([]);
                      setLastVisible(null);
                      setActiveTab('following');
                    }}
                    className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'following' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Following
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-500">
                Showing {posts.length} {posts.length === 1 ? 'post' : 'posts'}
              </div>
            </div>

            {posts.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg border border-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-800 mt-4">
                  {activeTab === 'following'
                    ? followedUsers.length === 0
                      ? "You're not following anyone yet"
                      : "No posts from people you follow"
                    : "No posts found"}
                </h3>
                <p className="text-gray-600 mt-1">
                  {activeTab === 'following'
                    ? followedUsers.length === 0
                      ? "Follow some users to see their posts here"
                      : "The users you follow haven't posted anything yet"
                    : selectedCategory
                      ? `No posts in the ${selectedCategory} category`
                      : "Be the first to create a post!"}
                </p>
                {user && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-4 bg-gradient-to-r from-teal-600 to-teal-600 hover:from-teal-700 hover:to-teal-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md hover:shadow-lg inline-flex items-center"
                  >
                    <PencilSquareIcon className="h-5 w-5 mr-2" />
                    Create Your First Post
                  </button>
                )}
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  id={post.id}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
                >
                  <ViewTracker postId={post.id} />

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <UserCircleIcon className="h-10 w-10 text-teal-600" />
                      <div>
                        <p className="font-bold text-gray-800">{post.userName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(post.timestamp?.toDate()).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user && user.uid === post.userId && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="text-gray-400 hover:text-red-500 transition p-1"
                          title="Delete post"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button className="text-gray-400 hover:text-gray-600 transition p-1">
                        <EllipsisHorizontalIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h3>

                  {post.image && (
                    <div className="mb-4 rounded-xl overflow-hidden">
                      <img
                        src={post.image}
                        alt="Post"
                        className="w-full h-auto max-h-96 object-cover"
                      />
                    </div>
                  )}

                  <p className="text-gray-700 mb-4 whitespace-pre-line">{post.content}</p>

                  {post.category && (
                    <div className="mb-4">
                      <span className="inline-block bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded">
                        {post.category}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center space-x-1 ${post.likes?.includes(user?.uid) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'} transition`}
                      >
                        <HeartIcon className="h-6 w-6" />
                        <span className="font-medium">{post.likes ? post.likes.length : 0}</span>
                      </button>

                      <button
                        onClick={() => setSelectedPostIdForComments(selectedPostIdForComments === post.id ? null : post.id)}
                        className={`flex items-center space-x-1 ${selectedPostIdForComments === post.id ? 'text-teal-600' : 'text-gray-500 hover:text-teal-600'} transition`}
                      >
                        <ChatBubbleLeftIcon className="h-6 w-6" />
                        <span className="font-medium">{post.comments ? post.comments.length : 0}</span>
                      </button>

                      <div
                        className="flex items-center space-x-1 text-gray-500 hover:text-teal-600 transition"
                        title={`${post.viewedBy?.length || 0} unique viewers (${post.views || 0} total views)`}
                      >
                        <EyeIcon className="h-6 w-6" />
                        <span className="font-medium">
                          {post.viewedBy?.length || 0}
                          {post.views > post.viewedBy?.length && (
                            <span className="text-xs opacity-75 ml-1"></span>
                          )}
                        </span>
                      </div>
                    </div>

                    {user && user.uid !== post.userId && (
                      <button
                        onClick={() =>
                          followedUsers.includes(post.userId)
                            ? handleUnfollow(post.userId)
                            : handleFollow(post.userId)
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${followedUsers.includes(post.userId) ? 'bg-gray-100 text-gray-700' : 'bg-teal-600 text-white hover:bg-teal-700'} transition`}
                      >
                        {followedUsers.includes(post.userId) ? 'Following ✓' : 'Follow +'}
                      </button>
                    )}
                  </div>

                  {selectedPostIdForComments === post.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="font-bold text-gray-800 mb-3">
                        Comments ({post.comments?.length || 0})
                      </h4>

                      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                        {groupCommentsWithReplies(post.comments)?.length > 0 ? (
                          groupCommentsWithReplies(post.comments).map((comment, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg relative">
                              <div className="flex items-center space-x-2 mb-1">
                                <UserCircleIcon className="h-5 w-5 text-teal-600" />
                                <p className="font-semibold text-teal-600">{comment.userName}</p>
                              </div>
                              <p className="text-gray-700 pl-7">{comment.text}</p>
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-gray-500">
                                  {new Date(comment._timestampValue).toLocaleString()}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      setReplyToComment(comment);
                                      setReplyContent('');
                                    }}
                                    className="text-xs text-gray-500 hover:text-teal-600"
                                  >
                                    Reply
                                  </button>
                                  {(user?.uid === comment.userId || user?.uid === post.userId) && (
                                    <button
                                      onClick={() => handleDeleteComment(post.id, comment)}
                                      className="text-gray-400 hover:text-red-500 text-xs"
                                      title="Delete comment"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {replyToComment?._timestampValue === comment._timestampValue && (
                                <div className="mt-3 pl-7">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder={`Reply to ${comment.userName}...`}
                                      value={replyContent}
                                      onChange={(e) => setReplyContent(e.target.value)}
                                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleReply(post.id, comment)}
                                      disabled={!replyContent.trim()}
                                      className={`px-3 py-2 text-sm rounded-lg ${
                                        replyContent.trim()
                                          ? "bg-teal-600 text-white hover:bg-teal-700"
                                          : "bg-gray-200 text-gray-400"
                                      }`}
                                    >
                                      Post
                                    </button>
                                  </div>
                                </div>
                              )}

                              {comment.replies?.map((reply) => (
                                <div key={reply._timestampValue} className="mt-2 ml-6 pl-3 border-l-2 border-teal-100">
                                  <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                      <UserCircleIcon className="h-4 w-4 text-teal-500" />
                                      <p className="text-xs font-semibold text-teal-600">
                                        {reply.userName}
                                        {reply.repliedTo && (
                                          <span className="text-gray-500 text-xs ml-1">
                                            → {reply.repliedTo.userName}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-700 pl-6">{reply.text}</p>
                                    <div className="flex justify-between items-center mt-1">
                                      <p className="text-[0.6rem] text-gray-500">
                                        {new Date(reply._timestampValue).toLocaleTimeString()}
                                      </p>
                                      {(user?.uid === reply.userId || user?.uid === post.userId) && (
                                        <button
                                          onClick={() => handleDeleteComment(post.id, reply)}
                                          className="text-gray-400 hover:text-red-500"
                                        >
                                          <TrashIcon className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-500 italic">
                              No comments yet. Be the first to comment!
                            </p>
                          </div>
                        )}
                      </div>

                      {user && (
                        <div className="flex space-x-2">
                          <UserCircleIcon className="h-10 w-10 text-teal-400 flex-shrink-0" />
                          <div className="flex-1 flex space-x-2">
                            <input
                              type="text"
                              placeholder="Write a thoughtful comment..."
                              value={commentInput}
                              onChange={(e) => setCommentInput(e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                            />
                            <button
                              onClick={() => handleComment(post.id, commentInput)}
                              disabled={!commentInput.trim()}
                              className={`px-4 py-2 rounded-lg font-medium transition ${commentInput.trim()
                                  ? "bg-teal-600 text-white hover:bg-teal-700"
                                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                }`}
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {fetchingMore && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-500"></div>
              </div>
            )}

            {hasMore && !fetchingMore && (
              <button
                onClick={fetchMorePosts}
                className="w-full bg-white hover:bg-gray-50 text-indigo-600 px-6 py-4 rounded-xl font-bold transition border border-gray-200 shadow-sm hover:shadow-md mt-6"
              >
                Load More Posts
              </button>
            )}
          </div>
        </main>
      </div>

      <footer className="w-full text-center py-6 mt-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-bold text-teal-600">Inkify Blog</h3>
              <p className="text-sm text-gray-600">Where ideas come to life</p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-500 hover:text-teal-600 transition">
                About
              </a>
              <a href="#" className="text-gray-500 hover:text-teal-600 transition">
                Privacy
              </a>
              <a href="#" className="text-gray-500 hover:text-teal-600 transition">
                Terms
              </a>
              <a href="#" className="text-gray-500 hover:text-teal-600 transition">
                Contact
              </a>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Inkify Blog. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <Transition appear show={isCreateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsCreateModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Create New Post
                    </Dialog.Title>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <form onSubmit={handlePostSubmit} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Post title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-lg font-medium"
                        required
                      />
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Add media (optional)
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="cursor-pointer">
                          <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition">
                            {imageBase64 ? (
                              <img src={imageBase64} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            )}
                          </div>
                          <input
                            type="file"
                            onChange={handleImageChange}
                            className="hidden"
                            accept="image/*"
                          />
                        </label>
                        {imageBase64 && (
                          <button
                            type="button"
                            onClick={() => setImageBase64('')}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <textarea
                        placeholder="What's on your mind?"
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition min-h-[150px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition bg-white"
                        required
                      >
                        <option value="">Select a category</option>
                        <option value="Technology">Technology</option>
                        <option value="Travel">Travel</option>
                        <option value="Food">Food</option>
                        <option value="Lifestyle">Lifestyle</option>
                        <option value="Health">Health</option>
                        <option value="Finance">Finance</option>
                        <option value="Education">Education</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Sports">Sports</option>
                        <option value="Science">Science</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-teal-700 hover:bg-teal-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-teal-600 to-teal-600 hover:from-teal-700 hover:to-teal-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md hover:shadow-md"
                      >
                        Publish Post
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

export default Home;