import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { ArrowRightIcon, UserIcon, PencilSquareIcon, UsersIcon, BookOpenIcon, SparklesIcon } from "@heroicons/react/24/solid";

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (user) navigate("/home");
  }, [user, navigate]);

  
  const handleViewPosts = () => {
    navigate("/posts");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      
      <header className="absolute w-full z-20 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <PencilSquareIcon className="h-8 w-8 text-teal-500" />
            <span className="text-2xl font-bold text-white">Inkify</span>
          </div>
          <button 
            onClick={() => navigate("/login")} 
            className="text-white hover:text-teal-300 font-medium transition-colors"
          >
            Sign In
          </button>
        </div>
      </header>

      
      <section className="relative flex-1 flex items-center justify-center bg-gray-900">
        
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        
        
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute w-full h-full object-cover"
          src="/videos/inkify-hero.mp4"
        />
        
       
        <div className="relative z-20 text-center px-6 max-w-6xl mx-auto py-32">
          <div className="mb-6 flex justify-center">
            <span className="bg-teal-500/10 px-4 py-2 rounded-full text-teal-400 font-medium flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2" />
              The Writer's Sanctuary
            </span>
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight">
            Discover <span className="text-teal-400">Masterpieces</span> <br />On Inkify
          </h1>
          <p className="text-xl sm:text-2xl max-w-3xl mx-auto mb-10 text-gray-300">
            Where words find their power. Explore quality writing from our community of authors.
          </p>
          <div className="flex justify-center">
          <button
  onClick={() => navigate("/posts")} 
  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105"
>
  <BookOpenIcon className="w-6 h-6" /> Explore Writings
</button>
          </div>
        </div>
      </section>

      
      <div className="bg-white py-8 border-b">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-gray-500 mb-4">Trusted by writers at</p>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {['The New Yorker', 'Penguin', 'Medium', 'Writer\'s Digest', 'HarperCollins'].map((company) => (
              <span key={company} className="text-gray-700 font-medium opacity-80 hover:opacity-100 transition-opacity">
                {company}
              </span>
            ))}
          </div>
        </div>
      </div>

      
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Built for <span className="text-teal-500">Serious Writers</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional tools to help you focus on what matters - your writing.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Distraction-Free Editor",
                desc: "Our minimalist editor helps you focus solely on your words with customizable writing environments.",
                Icon: PencilSquareIcon,
                color: "text-teal-500"
              },
              {
                title: "Built-In Audience",
                desc: "Connect with thousands of engaged readers who appreciate quality writing.",
                Icon: UsersIcon,
                color: "text-indigo-500"
              },
              {
                title: "Monetization Options",
                desc: "Earn from your writing through subscriptions, tips, and sponsored content.",
                Icon: SparklesIcon,
                color: "text-amber-500"
              }
            ].map((feat, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-all">
                <div className={`${feat.color} mb-6`}>
                  <feat.Icon className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{feat.title}</h3>
                <p className="text-gray-600">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

   

     
      <section className="py-20 px-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Explore Great Writing?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Join thousands of readers discovering quality content on Inkify.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleViewPosts}
              className="bg-teal-600 hover:bg-teal-700 px-8 py-4 rounded-lg text-lg font-semibold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-105"
            >
              Browse Writings
            </button>
            <button
              onClick={() => navigate("/register")}
              className="bg-transparent border-2 border-gray-300 text-white hover:bg-white hover:text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105"
            >
              Start Your Writing Journey Here
            </button>
          </div>
        </div>
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
};

export default LandingPage;
