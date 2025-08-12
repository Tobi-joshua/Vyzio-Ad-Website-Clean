import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenStorage } from '../components/TokenStorage'; 
import { useWebToast } from './useWebToast'; 
import { API_BASE_URL } from '../constants';

const useAuthToken = () => {
  const navigate = useNavigate();
  const showToast = useWebToast();
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkTokenValidity = async () => {
    try {
      const token = TokenStorage.getToken(); 
      if (token) {
        const res = await fetch(`${API_BASE_URL}/api/token/verify/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          TokenStorage.removeToken();
          TokenStorage.removeUserType();
          TokenStorage.removeUserEmail();
          navigate('/login');
          showToast({
            message: 'Session Expired!',
            severity: 'error',
        duration: 4000,
          });
        } else {
          setToken(token);
        }
      } else {
        TokenStorage.removeToken();
        TokenStorage.removeUserType();
        TokenStorage.removeUserEmail();
        navigate('/login');
        showToast({
          message: 'Session Expired!',
         severity: 'error',
        duration: 4000,
        });
      }
    } catch (error) {
      showToast({
        message: error.message || 'An error occurred',
       severity: 'error',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkTokenValidity();
  }, []);

  return { token, isLoading };
};

export default useAuthToken;