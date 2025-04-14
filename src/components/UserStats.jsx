import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { Bar } from 'react-chartjs-2';
import Chart from 'chart.js/auto';

function UserStats() {
    const [postStats, setPostStats] = useState([]);
    const [loading, setLoading] = useState(true);

   
    const trackView = async (postId) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return; 
        
        const postRef = doc(db, 'posts', postId);
        
       
        await updateDoc(postRef, {
            views: increment(1),
            viewedBy: arrayUnion(currentUser.uid) 
        });
    };

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const postsQuery = query(collection(db, 'posts'), where('userId', '==', currentUser.uid));
        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            const postsData = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    likes: data.likes?.length || 0,
                    comments: data.comments?.length || 0,
                    views: data.viewedBy ? data.viewedBy.length : 0, 
                };
            });
            setPostStats(postsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-gray-600">Loading stats...</div>
            </div>
        );
    }

    const chartData = {
        labels: postStats.map((post) => post.title),
        datasets: [
            {
                label: 'Likes',
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                data: postStats.map((post) => post.likes),
            },
            {
                label: 'Comments',
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
                data: postStats.map((post) => post.comments),
            },
            {
                label: 'Unique Views',
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                data: postStats.map((post) => post.views),
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Interaction Count',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Post Titles',
                },
            },
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.raw}`;
                    }
                }
            }
        },
    };

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Post Performance</h1>

                {postStats.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-500 text-lg">You haven't posted anything yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="mb-4">
                            <p className="text-gray-600 text-sm">
                                <span className="font-semibold">Note:</span> Views represent unique users who have seen your post.
                            </p>
                        </div>
                        <div className="h-96">
                            <Bar data={chartData} options={chartOptions} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserStats;