import { Routes, Route, Navigate } from "react-router-dom";
// import { useAuth } from "./context/AuthContext";
import {  useAuth } from "./Context/AuthContext";
import Navbar from "./components/Navbar";


import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Home from "./pages/Home"; 
import Register from "./pages/Register";
import Profile from "./components/Profile";
import Dashboard from "./Admin/Dashboard";
import PublicPostsPage from "./components/PublicPostPage";
import UserStats from "./components/UserStats";
import Settings from "./components/Settings";


function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      
      {user && <Navbar />}

      <Routes>
        
        <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/home" />} />
        <Route path="/posts" element={<PublicPostsPage />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/home" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        <Route path="/register" element={!user ? <Register/> : <Navigate to="/home" />} />

        
        <Route 
          path="/home" 
          element={user ? <Home /> : <Navigate to="/" />} 
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/stats" element={<UserStats />} />
        <Route path="/settings" element={<Settings />} />

        
        
      </Routes>
      
    </>
  );
}

export default AppRoutes;