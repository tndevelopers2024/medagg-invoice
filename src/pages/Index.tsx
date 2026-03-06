import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (loggedInUser) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }, [navigate]);

  return null;
};

export default Index;