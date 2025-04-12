import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    updateDoc, 
    getDocs,
    query,
    where
  } from 'firebase/firestore';

import { db } from '../firebase';
  
  export const createUserProfile = async (userId, data) => {
    await setDoc(doc(db, 'users', userId), data);
  };
  
  export const getUserProfile = async (userId) => {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  };
  
  export const updateUserProfile = async (userId, data) => {
    await updateDoc(doc(db, 'users', userId), data);
  };
 

async function addBlogPost(db, blogPostData) {
  try {
    const docRef = await addDoc(collection(db, "published"), blogPostData);
    console.log("Document written with ID: ", docRef.id);
    return docRef.id; 
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e; 
  }
}


const blogPostData = {
  title: "My First Blog Post",
  content: "This is the content of my first blog post.",
  authorId: "user123",
  createdAt: new Date(),
  publishedAt: new Date(),
};
addBlogPost(db, blogPostData)
  .then((docId) => {
    console.log("Blog post added with ID:", docId);
  })
  .catch((error) => {
    console.error("Failed to add blog post:", error);
  });

