import { createContext, useContext, useEffect, useState } from 'react';
import { auth, loginWithEmail, signUpWithEmail, onAuthStateChangedListener,db } from '../firebase';

import { signOut,updateProfile,updateEmail,updatePassword,reauthenticateWithCredential,EmailAuthProvider,deleteUser } from 'firebase/auth'; 
import { doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';



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
    const updateUserProfile = async (displayName, bio) => {
        try {
            setLoading(true);
            
            
            await updateProfile(auth.currentUser, {
                displayName: displayName
            });

         
            await updateDoc(doc(db, 'users', user.uid), {
                displayName,
                bio,
                updatedAt: new Date()
            });

           
            setUser({ ...user, displayName });
            return true;
        } catch (error) {
            console.error('Error updating profile:', error);
            setError('Failed to update profile: ' + error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateUserEmail = async (newEmail, currentPassword) => {
        try {
            setLoading(true);
            
         
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await reauthenticateWithCredential(auth.currentUser, credential);

            await updateEmail(auth.currentUser, newEmail);

           
            await updateDoc(doc(db, 'users', user.uid), {
                email: newEmail,
                updatedAt: new Date()
            });

           
            setUser({ ...user, email: newEmail });
            return true;
        } catch (error) {
            console.error('Error updating email:', error);
            setError('Failed to update email: ' + error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateUserPassword = async (newPassword, currentPassword) => {
        try {
            setLoading(true);
            
           
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await reauthenticateWithCredential(auth.currentUser, credential);

            
            await updatePassword(auth.currentUser, newPassword);
            return true;
        } catch (error) {
            console.error('Error updating password:', error);
            setError('Failed to update password: ' + error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteUserAccount = async (currentPassword) => {
        try {
            setLoading(true);
            
          
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await reauthenticateWithCredential(auth.currentUser, credential);

           
            await deleteDoc(doc(db, 'users', user.uid));

           
            await deleteUser(auth.currentUser);

            await handleLogout();
            setUser(null);
            return true;
        } catch (error) {
            console.error('Error deleting account:', error);
            setError('Failed to delete account: ' + error.message);
            return false;
        } finally {
            setLoading(false);
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
        updateUserProfile,
        updateUserEmail,
        updateUserPassword,
        deleteUserAccount,
        clearError: () => setError(null)
    };

    return (<AuthContext.Provider value={value}>{children}</AuthContext.Provider>)
};




