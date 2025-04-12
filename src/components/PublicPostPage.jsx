
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { HeartIcon, ChatBubbleLeftIcon, UserCircleIcon, PencilSquareIcon, ArrowRightIcon, BookOpenIcon } from '@heroicons/react/24/solid';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

function PublicPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postList = snapshot.docs.map((docElement) => ({
        id: docElement.id,
        ...docElement.data(),
      }));

      
      const userIds = postList.map((post) => post.userId);
      const uniqueUserIds = [...new Set(userIds)];
      
      if (uniqueUserIds.length > 0) {
        const userPromises = uniqueUserIds.map(userId => 
          getDoc(doc(db, 'users', userId))
        );
        const userSnapshots = await Promise.all(userPromises);
        const userMap = {};
        userSnapshots.forEach((userDoc) => {
          if (userDoc.exists()) {
            userMap[userDoc.id] = userDoc.data().username || 'Anonymous';
          }
        });

        const postsWithUsernames = postList.map((post) => ({
          ...post,
          userName: userMap[post.userId],
        }));

        setPosts(postsWithUsernames);
      } else {
        setPosts(postList);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthRequired = () => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
     
      <section className="relative bg-gray-900 text-white py-20">
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        <div className="relative z-20 max-w-7xl mx-auto px-6 text-center">
          <div className="mb-6 flex justify-center">
            <span className="bg-teal-500/10 px-4 py-2 rounded-full text-teal-400 font-medium flex items-center">
              <BookOpenIcon className="h-5 w-5 mr-2" />
              Explore Community Writings
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            Discover <span className="text-teal-400">Inspiring Stories</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto mb-8 text-gray-300">
            Read thought-provoking content from our community of writers. Join to share your own stories.
          </p>
          {!user && (
            <button
              onClick={() => navigate('/register')}
              className="bg-teal-600 hover:bg-teal-700 px-8 py-3 rounded-lg text-lg font-semibold flex items-center justify-center gap-2 mx-auto transition-all hover:scale-105"
            >
              <PencilSquareIcon className="h-5 w-5" /> Start Writing Free
            </button>
          )}
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Recent <span className="text-teal-500">Community Posts</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Browse through the latest writings from our talented community members
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.length === 0 ? (
            <div className="col-span-2 bg-white rounded-2xl p-8 text-center shadow-lg border border-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-800 mt-4">
                No posts to display yet
              </h3>
              {!user && (
                <button
                  onClick={() => navigate('/register')}
                  className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Be the first to post
                </button>
              )}
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-100">
                {post.image && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={post.image}
                      alt="Post"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <UserCircleIcon className="h-10 w-10 text-teal-400" />
                    <div>
                      <p className="font-medium text-gray-900">{post.userName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(post.timestamp?.toDate()).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <h2 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h2>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {post.content}
                  </p>
                  
                  {post.category && (
                    <span className="inline-block bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded mb-4">
                      {post.category}
                    </span>
                  )}
                  
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleAuthRequired}
                        className={`flex items-center space-x-1 ${post.likes?.includes(user?.uid) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'} transition`}
                        disabled={!user}
                      >
                        <HeartIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">{post.likes?.length || 0}</span>
                      </button>
                      
                      <button
                        onClick={handleAuthRequired}
                        className="flex items-center space-x-1 text-gray-500 hover:text-teal-600 transition"
                        disabled={!user}
                      >
                        <ChatBubbleLeftIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">{post.comments?.length || 0}</span>
                      </button>
                    </div>
                    
                    <Link
                      to={user ? `/posts/${post.id}` : '/login'}
                      className="text-teal-600 hover:text-teal-800 font-medium flex items-center text-sm"
                    >
                      Read more <ArrowRightIcon className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {!user && (
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to join our writing community?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Create an account to publish your own stories, engage with other writers, and be part of our growing community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-teal-600 hover:bg-teal-700 px-8 py-3 rounded-lg text-lg font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <PencilSquareIcon className="h-5 w-5" /> Sign Up Free
              </button>
              <button
                onClick={() => navigate('/login')}
                className="border-2 border-teal-600 text-teal-600 hover:bg-teal-50 px-8 py-3 rounded-lg text-lg font-semibold transition-all hover:scale-105"
              >
                Already a member? Log In
              </button>
            </div>
          </div>
        )}
      </section>

      
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <PencilSquareIcon className="h-6 w-6 text-teal-400" />
              <span className="text-xl font-bold">Inkify</span>
            </div>
            <p className="text-gray-400">The professional writing platform for serious authors.</p>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-4">For Writers</h4>
            <ul className="space-y-2">
              {['Features', 'Pricing', 'Success Stories', 'Writing Resources'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-400 hover:text-teal-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-4">Company</h4>
            <ul className="space-y-2">
              {['About', 'Blog', 'Careers', 'Press'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-400 hover:text-teal-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-4">Legal</h4>
            <ul className="space-y-2">
              {['Terms', 'Privacy', 'Copyright', 'Guidelines'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-400 hover:text-teal-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-gray-800 text-center text-gray-400">
          <p>© {new Date().getFullYear()} Inkify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default PublicPostsPage;