import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loadCurrentUser } from '../../store/slices/authSlice.js';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const role = searchParams.get('role');
    const isEmailVerified = searchParams.get('isEmailVerified') === 'true';

    if (!accessToken || !refreshToken) {
      navigate('/login');
      return;
    }

    // Save tokens first so api.js sends them in the header
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    // Now fetch the full user object — same as SessionLoader does on refresh
    dispatch(loadCurrentUser()).then((res) => {
      if (res.error) {
        navigate('/login');
        return;
      }

      if (!isEmailVerified) {
        navigate('/verify-otp');
      } else if (role === 'supplier') {
        navigate('/supplier/dashboard');
      } else {
        navigate('/marketplace');
      }
    });
  }, []);

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="text-center">
        <div className="spinner-border text-success mb-3" role="status" />
        <p className="text-muted">Signing you in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;