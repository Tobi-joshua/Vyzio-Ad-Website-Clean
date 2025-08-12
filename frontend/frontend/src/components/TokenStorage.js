import { useEffect, useState } from 'react';

export const TokenStorage = {
  // Store access token
  storeToken: (token) => {
    try {
      localStorage.setItem('access_token', token);
    } catch (error) {
      console.error("Error storing token:", error);
    }
  },

  // Store refresh token
  storeRefreshToken: (token) => {
    try {
      localStorage.setItem('refresh_token', token);
    } catch (error) {
      console.error("Error storing refresh token:", error);
    }
  },

  // Store user type (tutor, student, applicant)
  storeUserType: (userType) => {
    try {
      localStorage.setItem('user_type', userType);
    } catch (error) {
      console.error("Error storing user type:", error);
    }
  },

  // Store user email
  storeUserEmail: (userEmail) => {
    try {
      localStorage.setItem('user_email', userEmail);
    } catch (error) {
      console.error("Error storing user email:", error);
    }
  },

  // Store Firestore UID
  storeFirestoreUID: (uid) => {
    try {
      localStorage.setItem('firestore_uid', uid);
    } catch (error) {
      console.error("Error storing Firestore UID:", error);
    }
  },

  // Getters
  getToken: () => {
    try {
      return localStorage.getItem('access_token');
    } catch (error) {
      console.error("Error retrieving token:", error);
    }
  },

  getRefreshToken: () => {
    try {
      return localStorage.getItem('refresh_token');
    } catch (error) {
      console.error("Error retrieving refresh token:", error);
    }
  },

  getUserType: () => {
    try {
      return localStorage.getItem('user_type');
    } catch (error) {
      console.error("Error retrieving user type:", error);
    }
  },

  getUserEmail: () => {
    try {
      return localStorage.getItem('user_email');
    } catch (error) {
      console.error("Error retrieving user email:", error);
    }
  },

  // Removers
  removeToken: () => {
    try {
      localStorage.removeItem('access_token');
    } catch (error) {
      console.error("Error removing token:", error);
    }
  },

  removeRefreshToken: () => {
    try {
      localStorage.removeItem('refresh_token');
    } catch (error) {
      console.error("Error removing refresh token:", error);
    }
  },

  removeUserType: () => {
    try {
      localStorage.removeItem('user_type');
    } catch (error) {
      console.error("Error removing user type:", error);
    }
  },

  removeUserEmail: () => {
    try {
      localStorage.removeItem('user_email');
    } catch (error) {
      console.error("Error removing user email:", error);
    }
  },

  removeFirestoreUID: () => {
    try {
      localStorage.removeItem('firestore_uid');
    } catch (error) {
      console.error("Error removing Firestore UID:", error);
    }
  },
  clear: () => {
  try {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_type');
    localStorage.removeItem('user_email');
    localStorage.removeItem('firestore_uid');
  } catch (error) {
    console.error("Error clearing tokens:", error);
  }
}

};