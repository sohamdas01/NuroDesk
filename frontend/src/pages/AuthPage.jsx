import { useState } from 'react';
import Login from '../components/Login';
import Signup from '../components/Signup';

function AuthPage() {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <>
      {showLogin ? (
        <Login onSwitchToSignup={() => setShowLogin(false)} />
      ) : (
        <Signup onSwitchToLogin={() => setShowLogin(true)} />
      )}
    </>
  );
}

export default AuthPage;