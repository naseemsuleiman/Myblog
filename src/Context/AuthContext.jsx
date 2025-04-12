import { createContext, useContext, useEffect, useState } from 'react';
import { auth, loginWithEmail, signUpWithEmail, onAuthStateChangedListener } from '../firebase';

import { signOut } from 'firebase/auth'; 




const AuthContext = createContext();
const ADMIN_EMAIL = 'admin@gmail.com';
export function useAuth(){
    const context = useContext(AuthContext);
    if (!context) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
  };
export function AuthProvider({ children }){
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    

    useEffect(() => {
        const unsubscribe = onAuthStateChangedListener((user) => {
            setUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);
   
    const handleLogin = async (email, password) => {
        try {
            const userCredential = await loginWithEmail(email, password);
            const user = userCredential.user;
      
            if (user) {
                const role = user.email === ADMIN_EMAIL ? 'admin' : 'user';
                return { userCredential, role }; 
            }
        } catch (err) {
            setError('Login failed. Please check your credentials.');
            console.error(err);
            throw err;
        }
      };
      
    const handleSignup = async (email,password) => {
      
        try {
            setLoading(true);
            await signUpWithEmail(email, password);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            console.log('Attempting logout');
            await signOut(auth);
            console.log('Logout successful');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const value = {
        user,
        loading,
        error,
        email,
        password,
        setEmail,
        setPassword,
        handleLogin,
        handleSignup,
        handleLogout,
        clearError: () => setError(null)
    };

    return (<AuthContext.Provider value={value}>{children}</AuthContext.Provider>)
};




