import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const Chart = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [stats, setStats] = useState({
    users: [],
    posts: [],
    comments: [],
    likes: []
  });

  const colors = {
    primary: {
      light: '#e6f7f5',
      medium: '#5dc0b8',
      dark: '#2a7a72',
      text: '#1a3a37'
    },
    accent: {
      blue: '#4299e1',
      gray: '#718096'
    },
    background: '#f8fafc'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        let startDate = new Date();

        switch (timeRange) {
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setDate(now.getDate() - 30);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            startDate.setDate(now.getDate() - 7);
        }

        const usersQuery = query(
          collection(db, 'users'),
          where('createdAt', '>=', startDate)
        );
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
        }));

        const postsQuery = query(
          collection(db, 'posts'),
          where('timestamp', '>=', startDate),
          orderBy('timestamp', 'asc')
        );
        const postsSnapshot = await getDocs(postsQuery);
        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate()
        }));

        const commentsQuery = query(
          collection(db, 'comments'),
          where('timestamp', '>=', startDate),
          orderBy('timestamp', 'asc')
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        const commentsData = commentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate()
        }));

        setStats({
          users: usersData,
          posts: postsData,
          comments: commentsData,
          likes: postsData.reduce((acc, post) => acc + (post.likes?.length || 0), 0)
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const groupByTimePeriod = (data, period, timeRange) => {
    const groups = {};
  
    data.forEach(item => {
      const date = item.timestamp || item.createdAt;
      let key;
  
      if (period === 'day') {
        key = date.toLocaleDateString();
      } 
      else if (period === 'week') {
       
        if (timeRange === 'month') {
          const dayOfMonth = date.getDate();
          if (dayOfMonth <= 7) key = 'Week 1';
          else if (dayOfMonth <= 14) key = 'Week 2';
          else if (dayOfMonth <= 21) key = 'Week 3';
          else key = 'Week 4';
        } 
       
        else {
          const oneJan = new Date(date.getFullYear(), 0, 1);
          const weekNumber = Math.ceil((((date - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
          key = `Week ${weekNumber}`;
        }
      } 
      else if (period === 'month') {
        key = date.toLocaleString('default', { month: 'short' });
      }
  
      if (!groups[key]) {
        groups[key] = 0;
      }
      groups[key]++;
    });
  
    return groups;
  };

  const prepareChartData = () => {
    let period;
    if (timeRange === 'year') period = 'month';
    else if (timeRange === 'month') period = 'week';  
    else period = 'day';  
  
    const userSignups = groupByTimePeriod(stats.users, period, timeRange);
    const postsCreated = groupByTimePeriod(stats.posts, period, timeRange);
    const commentsPosted = groupByTimePeriod(stats.comments, period, timeRange);

    const categories = {};
    stats.posts.forEach(post => {
      const category = post.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category]++;
    });

    return {
      userSignups,
      postsCreated,
      commentsPosted,
      categories
    };
  };

  const chartData = prepareChartData();

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 14
          },
          color: colors.primary.text
        }
      },
      title: {
        display: true,
        text: 'Activity Over Time',
        font: {
          size: 18,
          weight: 'bold'
        },
        color: colors.primary.text
      },
      tooltip: {
        backgroundColor: colors.primary.dark,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 12
        },
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: colors.accent.gray
        }
      },
      y: {
        grid: {
          color: colors.primary.light
        },
        ticks: {
          color: colors.accent.gray
        }
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            size: 14
          },
          color: colors.primary.text,
          padding: 20
        }
      },
      title: {
        display: true,
        text: 'Post Categories',
        font: {
          size: 18,
          weight: 'bold'
        },
        color: colors.primary.text
      },
      tooltip: {
        backgroundColor: colors.primary.dark,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 12
        },
        padding: 10,
        cornerRadius: 8
      }
    }
  };

  const activityOverTimeData = {
    labels: Object.keys(chartData.postsCreated),
    datasets: [
      {
        label: 'Posts',
        data: Object.values(chartData.postsCreated),
        backgroundColor: colors.primary.medium,
        borderColor: colors.primary.dark,
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: colors.primary.dark
      },
      {
        label: 'Comments',
        data: Object.values(chartData.commentsPosted),
        backgroundColor: colors.accent.blue,
        borderColor: '#2c5282',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: '#2b6cb0'
      },
    ],
  };

  const postCategoriesData = {
    labels: Object.keys(chartData.categories),
    datasets: [
      {
        label: 'Posts by Category',
        data: Object.values(chartData.categories),
        backgroundColor: [
          colors.primary.light,
          colors.primary.medium,
          colors.accent.blue,
          '#a0aec0',
          colors.primary.dark
        ],
        borderColor: '#fff',
        borderWidth: 1,
        hoverOffset: 10
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-medium"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-teal-600">Analytics Dashboard</h1>
            <p className="text-gray-600">Track your community's growth and engagement</p>
          </div>
          <div className="flex space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-medium focus:border-primary-medium text-teal-600"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last 12 Months</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <Bar options={barChartOptions} data={activityOverTimeData} />
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <Pie options={pieChartOptions} data={postCategoriesData} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium mb-4 text-teal-600">Recent Activity</h3>
          <div className="space-y-4">
            {[...stats.posts]
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, 5)
              .map(post => (
                <div key={post.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0 hover:bg-gray-50 p-2 rounded transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-800">{post.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {post.userName || 'Anonymous'} • {post.timestamp.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <span className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {post.likes?.length || 0}
                      </span>
                      <span className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {post.comments?.length || 0}
                      </span>
                    </div>
                  </div>
                  {post.content && (
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                      {post.content.substring(0, 120)}{post.content.length > 120 ? '...' : ''}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chart;