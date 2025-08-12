import React, { useState,useCallback,useEffect } from 'react';
import {
 Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputAdornment,
  Radio,
  RadioGroup,
  Tab,
  Tabs,
  TextField,
  Typography,
  Link,
  Container,
  CircularProgress,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { TokenStorage } from '../components/TokenStorage';
import LockIcon from '@mui/icons-material/Lock';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { styled } from '@mui/system';
import { useNavigate } from 'react-router-dom';
import { useWebToast } from '../hooks/useWebToast'; 
import { signInWithCustomToken } from "firebase/auth";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import {auth} from "../firebase/firebaseConfig";
import DataLoader from '../components/DataLoader';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { API_BASE_URL } from "../constants";


export default function Login() {
const [tabIndex, setTabIndex] = useState(0); // 0 = login, 1 = signup
const [signupRole, setSignupRole] = useState(null); // 'seller' | 'buyer'
const navigate = useNavigate();
// Signup state
const [signupData, setSignupData] = useState({
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  password1: '',
  password2: '',
});


// General Token
const [isLoading, setIsLoading] = useState(false);


// Login state
const [loginUsername, setLoginUsername] = useState('');
const [loginPassword, setLoginPassword] = useState('');
const [isUsernameValid, setIsUsernameValid] = useState(true);
const [passwordVisible, setPasswordVisible] = useState(false);
const showToast = useWebToast();
const [logging, setLogging] = useState(false);


 // For Sign Up
const [usernameChecking, setUsernameChecking] = useState(false);
const [emailChecking, setEmailChecking] = useState(false);
const [usernameExist, setUsernameExist] = useState(false);
const [emailExist, setEmailExist] = useState(false);
const [sigining, setSigning] = useState(false);
const [passwordVisible1, setPasswordVisible1] = useState(false);
const [passwordVisible2, setPasswordVisible2] = useState(false);

 const GradientBox = styled(Box)({
  background: 'linear-gradient(to right, #1e3a8a, #2563eb)',
  color: 'white',
  padding: '24px 16px',
  borderRadius: '8px',
  textAlign: 'center',
  marginBottom: '24px',
});



const checkTokenValidity = async () => {
  setIsLoading(true);
  try {
    const token = TokenStorage.getToken();
    const userType = TokenStorage.getUserType();

    if (token) {
      const res = await fetch(`${API_BASE_URL}/api/token/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({token}),
      });

      if (res.ok) {
        navigateBasedOnUserType(userType);
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  } catch (error) {
    showToast({
      message: error.message || 'Something went wrong',
      severity: 'error',
      duration: 3000,
    });
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  checkTokenValidity();
}, []);


  // Navigate based on user type

  const navigateBasedOnUserType = (userType) => {
  if (userType === 'buyer') {
    navigate('/buyers/dashboard');
  } else if (userType === 'seller') {
    navigate('/sellers/dashboard');
  } else {
    showToast({
      message: 'Unknown user type.',
      severity: 'error',
      duration: 3000,
    });
  }
};



                                              /* Login Section */


// For Login Inputs Check
const checkUsernameExists = useCallback(async () => {
  try {
    if (!loginUsername) return;

    const res = await fetch(`${API_BASE_URL}/api/check-username-email/?username=${encodeURIComponent(loginUsername)}`);
    if (!res.ok) throw new Error('Failed to validate username');

    const data = await res.json();

    // 1. Banned tutor case
    if (data.banned === true) {
      setIsUsernameValid(false);
      setLoginUsername('');
      showToast({
        message: 'This seller/buyer account has been banned 🚫',
        severity: 'error',
        duration: 4000,
      });
      return;
    }

    // 2. Inactive (unverified) tutor
    if (data.username_exists && data.is_active === false) {
      showToast({
        message: 'Your account is not verified. Please enter your email to generate a new token.',
        severity: 'warning',
        duration: 5000,
      });
      return;
    }

    // 3. Valid, active tutor
    if (data.username_exists) {
      setIsUsernameValid(true);
      showToast({
        message: `Welcome back ${loginUsername} ☺️`,
        severity: 'success',
        duration: 4000,
      });
    } else {
      // 4. Username not found
      setIsUsernameValid(false);
      setLoginUsername('');
      showToast({
        message: 'Username Does Not Exist!',
        severity: 'error',
        duration: 3000,
      });
    }
  } catch (error) {
    showToast({
      message: error.message || 'An unexpected error occurred.',
      severity: 'error',
      duration: 3000,
    });
  }
}, [loginUsername, showToast]);


const handleLogin = useCallback(async () => {
  if (!loginUsername || !loginPassword) {
    showToast({
      message: 'Please enter your username and password.',
      severity: 'info',
      duration: 3000,
    });
    return;
  }

  if (!isUsernameValid) {
    showToast({
      message: 'Username and password are not valid!',
      severity: 'error',
      duration: 3000,
    });
    return;
  }
  setLogging(true);
 try {
  const res = await fetch(`${API_BASE_URL}/api/user/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: loginUsername, password: loginPassword }),
  });
  const data = await res.json();
  if (data.refresh && data.access) {
    TokenStorage.storeUserType(data.userType);
    TokenStorage.storeToken(data.access);
    TokenStorage.storeRefreshToken(data.refresh);
    TokenStorage.storeUserEmail(data.email);
    TokenStorage.storeFirestoreUID(data.firebase_token);

    await signInWithCustomToken(auth, data.firebase_token);
    navigateBasedOnUserType(data.userType);
  } else {
    showToast({
      message: 'Username and password are not valid!',
      severity: 'error',
      duration: 3000,
    });
  }
} catch (error) {
  showToast({
    message: error.toString(),
    severity: 'error',
    duration: 3000,
  });
} finally {
  setLogging(false);
}
}, [loginUsername, loginPassword, isUsernameValid, showToast]);


const handleGoogleLogin = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const firebaseToken = await user.getIdToken();
    const response = await fetch(`${API_BASE_URL}/api/google/buyer/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: firebaseToken }),
    });

    const data = await response.json();

    if (response.ok && data.access && data.refresh) {
      TokenStorage.storeToken(data.access);
      TokenStorage.storeRefreshToken(data.refresh);
      TokenStorage.storeUserType(data.userType);
      TokenStorage.storeUserEmail(data.email);

      // Redirect
      navigateBasedOnUserType(data.userType); 
    } else {
      console.error("Backend login failed:", data);
      alert("Login failed: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    console.error("Google Login Error:", error);
    alert("Google Login Error. Please try again.");
  }
};


                                                         /* Sign Up Section */
// Validations
const passwordChecks = [
  { id: 1, text: 'At least 8 characters long', check: signupData.password1.length >= 8 },
  { id: 2, text: 'Contains a digit', check: /\d/.test(signupData.password1) },
  { id: 3, text: 'Contains an uppercase letter', check: /[A-Z]/.test(signupData.password1) },
  { id: 4, text: 'Contains a lowercase letter', check: /[a-z]/.test(signupData.password1) },
  { id: 5, text: 'Contains a special character', check: /[@$!%*?&]/.test(signupData.password1) },
  { id: 6, text: 'Passwords must match', check: signupData.password1 === signupData.password2 },
];

const allChecksPassed = passwordChecks.every((item) => item.check);
const isFormComplete = Object.values(signupData).every((val) => val.trim());
const debounceDelay = 500;
let typingTimer;


const handleSignupInputChange = (field, value) => {
     setSignupData((prev) => ({ ...prev, [field]: value }));
    if (field === 'username' || field === 'email') {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => checkFieldExistence(field, value), debounceDelay);
      field === 'username' ? setUsernameChecking(true) : setEmailChecking(true);
    }
  };

const checkFieldExistence = async (fieldName, value) => {
  if (!value.trim()) {
    fieldName === 'username' ? setUsernameChecking(false) : setEmailChecking(false);
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/check-username-email/?${fieldName}=${encodeURIComponent(value)}`
    );
    const data = await response.json();

    if (fieldName === 'username') {
      setUsernameChecking(false);
      setUsernameExist(data.username_exists);

      if (data.username_exists && data.banned === true) {
        showToast({
        message: 'This seller/buyer account has been banned 🚫',
        severity: 'error',
        duration: 4000,
      });
        setSignupData(prev => ({ ...prev, username: '' }));
        return;
      }

      if (data.username_exists) {
        showToast({
        message: 'This username already exists.',
        severity: 'info',
        duration: 4000,
      });
        setSignupData(prev => ({ ...prev, username: '' }));
      }
    } 
    
    else if (fieldName === 'email') {
      setEmailChecking(false);
      setEmailExist(data.email_exists);

      if (data.email_exists && data.banned === true) {
         showToast({
        message: 'This email is linked to a banned account.',
        severity: 'info',
        duration: 4000,
      });
        setSignupData(prev => ({ ...prev, email: '' }));
        return;
      }

      if (data.email_exists) {
         showToast({
        message: 'This email is already registered.',
        severity: 'info',
        duration: 4000,
      });
        setSignupData(prev => ({ ...prev, email: '' }));
      }
    }
  } catch (error) {
    fieldName === 'username' ? setUsernameChecking(false) : setEmailChecking(false);
    console.error('Error checking field existence:', error);
  }
};

const validateForm = () => {
    const { username, first_name, last_name, email, password1, password2 } =signupData;
    if (!username.trim()) {
      showToast({
        message: 'Username is required',
        severity: 'info',
        duration: 3000,
      });
      return false;
    }
    if (!first_name.trim()) {
      showToast({
        message: 'First name is required.',
        severity: 'info',
        duration: 3000,
      });
      return false;
    }
    if (!last_name.trim()) {
      showToast({
        message: 'Last name is required.',
        severity: 'info',
        duration: 3000,
      });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      showToast({
        message: 'Email address is required',
        severity: 'info',
        duration: 3000,
      });
      return false;
    } else if (!emailRegex.test(email)) {
      showToast({
        message: 'Enter a valid email address.',
        severity: 'info',
        duration: 3000,
      });
      return false;
    }
    if (!password1 || password1.length < 8) {
      showToast({
        message: 'Password must be at least 8 characters long.',
        severity: 'info',
        duration: 3000,
      });
      return false;
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password1)) {
      showToast({
        message: 'Password must include at least one uppercase letter, one number, and one special character.',
        severity: 'info',
        duration: 3000,
      });
      return false;
    }
    if (password1 !== password2) {
      showToast({
        message: 'Passwords do not match.',
        severity: 'info',
        duration: 3000,
      });
      return false;
    }
    return true;
  };

const handleSubmit = async (e) => {
  setSigning(true);
  e.preventDefault();
  if (tabIndex === 0) {
    return handleLogin(); 
  }

  if (!allChecksPassed || !isFormComplete) return;

   if (!validateForm()) return;

  const url = signupRole === 'buyer'
    ? `${API_BASE_URL}/api/auth/signup/buyer/`
    : `${API_BASE_URL}/api/auth/signup/seller/`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData),
    });
    const data = await res.json();
    if (res.ok) {
      setSigning(false);
      showToast({
        message: 'Account created successfully!',
        severity: 'success',
        duration: 4000,
      });
      setTabIndex(0);
      setSignupRole(null);
      setSignupData({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password1: '',
        password2: '',
      });
       navigate('/login');
    } else {
      alert(data.error || 'Signup failed.');
    }
  } catch (error) {
    alert('Error creating account. Please try again.');
  }
};




if (isLoading) {
    return (
     <DataLoader visible={true} />
    );
  }


  return (

    <Container
  disableGutters
  maxWidth="sm"
  sx={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    p: 2,
  }}
>
  {/* Form Card */}
  <Box
    sx={{
      width: '100%',
      maxWidth: 420,
      backgroundColor: 'white',
      borderRadius: 3,
      boxShadow: 6,
      p: { xs: 3, sm: 4 },
      overflowY: 'auto',
      maxHeight: '90vh',
      '&::-webkit-scrollbar': { display: 'none' },
    }}
  >
    {/* Tabs */}
    <Box
      sx={{
        alignSelf: 'center',
        borderRadius: 2,
        px: 1,
        py: 1,
        mb: { xs: 4, md: 4 },
      }}
    >
      <Tabs
        value={tabIndex}
        onChange={(_, i) => setTabIndex(i)}
        centered
        TabIndicatorProps={{ style: { display: 'none' } }}
        sx={{
          '& .MuiTab-root': {
            textTransform: 'none',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: 1,
            backgroundColor: '#888',
            mx: 1,
            minHeight: 0,
            fontWeight: 500,
          },
          '& .Mui-selected': {
            backgroundColor: '#1e3a8a',
            color: 'white',
          },
        }}
      >
        <Tab label="Login" />
        <Tab label="Sign Up" />
      </Tabs>
    </Box>

    {/* LOGIN PANEL */}
    {tabIndex === 0 && (
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <GradientBox sx={{ p: 2, mb: 2 }}>
          <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }} fontWeight="bold" color="white">
            Welcome Back!
          </Typography>
          <Typography variant="subtitle2" color="white">
            Access your Dashboard
          </Typography>
        </GradientBox>

        <Box
          sx={{
            backgroundColor: '#f5f5f5',
            borderRadius: 2,
            p: { xs: 2, sm: 3 },
            boxShadow: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* Username */}
          <TextField
            fullWidth
            label="Username"
            placeholder="Enter your username"
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
            onBlur={checkUsernameExists}
            disabled={isLoading || logging}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon />
                </InputAdornment>
              ),
              endAdornment: isLoading && (
                <InputAdornment position="end">
                  <CircularProgress size={20} thickness={5} />
                </InputAdornment>
              ),
            }}
          />

          {/* Password */}
          <TextField
            fullWidth
            label="Password"
            placeholder="Enter your password"
            type={passwordVisible ? 'text' : 'password'}
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            disabled={logging}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setPasswordVisible((vis) => !vis)}>
                    {passwordVisible ? <Visibility /> : <VisibilityOff />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box textAlign="right" mt={-1}>
            <Link href="/forgot-password" underline="hover" sx={{ fontSize: 13, fontWeight: 'bold' }}>
              Forgot Password?
            </Link>
          </Box>

          <Button
            fullWidth
            variant="contained"
            onClick={handleLogin}
            disabled={logging}
            sx={{
              backgroundColor: '#1e3a8a',
              '&:hover': { backgroundColor: '#1a2d6e' },
            }}
          >
            {logging ? 'Logging...' : 'Login'}
          </Button>

          <Divider />

          <Button fullWidth onClick={handleGoogleLogin} variant="outlined" startIcon={<GoogleIcon />}>
            Sign in with Google
          </Button>
        </Box>
      </Box>
    )}
          {/* SIGN UP PANEL */}
{tabIndex === 1 && (
            <Box sx={{ textAlign: 'center' }}>
              <GradientBox sx={{ p: 2, mb: 2 }}>
                <Typography
                  sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}
                  fontWeight="bold"
                  color="white"
                >
                  Create your account
                </Typography>
              </GradientBox>

              <Box
                sx={{
                  borderRadius: 2,
                  p: { xs: 2, sm: 3 },
                  boxShadow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {/* Username Field */}
<TextField
  fullWidth
  label="Username"
  value={signupData.username}
  onChange={(e) =>
    handleSignupInputChange('username', e.target.value)
  }
  error={usernameExist}
  helperText={usernameExist ? 'Username already exists' : ''}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <PersonIcon />
      </InputAdornment>
    ),
    endAdornment: (
      <InputAdornment position="end">
        {usernameChecking ? (
          <CircularProgress size={20} color="primary" />
        ) : usernameExist ? (
          <ErrorOutlineIcon color="error" />
        ) : null}
      </InputAdornment>
    ),
  }}
/>



{/* First Name Field */}
<TextField
  fullWidth
  label="First Name"
  value={signupData.first_name}
  disabled={!signupData.username.trim()}
  onChange={(e) =>
    handleSignupInputChange('first_name', e.target.value)
  }
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <PersonIcon />
      </InputAdornment>
    ),
  }}
/>


                <TextField
                  fullWidth
                  label="Last Name"
                  value={signupData.last_name}
                  disabled={!signupData.first_name.trim()}
                  onChange={(e) =>
                    handleSignupInputChange('last_name', e.target.value)
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />

            <FormControl
  component="fieldset"
  sx={{
    mt: 1,
    mb: 2,
    alignItems: 'flex-start',
  }}
>
  <FormLabel
    component="legend"
    sx={{
      fontWeight: 'bold',
      color: 'primary.main',
      mb: 1,
    }}
  >
    I am a
  </FormLabel>

<RadioGroup
  row
  value={signupRole || ''}
  onChange={(e) => setSignupRole(e.target.value)}
  sx={{ gap: 2 }}
>
  {['seller', 'buyer'].map((role) => (
    <FormControlLabel
      key={role}
      value={role}
      control={
        <Radio
          sx={{
            color: 'primary.main',
            '&.Mui-checked': {
              color: 'secondary.main',
            },
          }}
        />
      }
      label={role.charAt(0).toUpperCase() + role.slice(1)}
      componentsProps={{
        root: {
          sx: {
            bgcolor: signupRole === role ? 'secondary.light' : 'transparent',
            px: 2,
            py: 1,
            borderRadius: 2,
            transition: 'background 0.3s ease',
            '&:hover': {
              bgcolor: 'secondary.light',
            },
          },
        },
      }}
    />
  ))}
</RadioGroup>

</FormControl>

               
{/* Email Field */}
<TextField
  fullWidth
  label="Email"
  type="email"
  placeholder="you@example.com"
  value={signupData.email}
  onChange={(e) =>
    handleSignupInputChange('email', e.target.value)
  }
  error={emailExist}
  helperText={emailExist ? 'Email already registered' : ''}
  disabled={!signupData.last_name.trim()}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <EmailIcon />
      </InputAdornment>
    ),
    endAdornment: (
      <InputAdornment position="end">
        {emailChecking ? (
          <CircularProgress size={20} color="primary" />
        ) : emailExist ? (
          <ErrorOutlineIcon color="error" />
        ) : null}
      </InputAdornment>
    ),
  }}
/>
                <TextField
                  fullWidth
                  label="Password"
                  type={passwordVisible1 ? 'text' : 'password'}
                  value={signupData.password1}
                  disabled={!signupData.email.trim()}
                  onChange={(e) =>
                    handleSignupInputChange('password1', e.target.value)
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setPasswordVisible1((vis) => !vis)
                          }
                        >
                          {passwordVisible1 ? (
                            <Visibility />
                          ) : (
                            <VisibilityOff />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={passwordVisible2 ? 'text' : 'password'}
                  value={signupData.password2}
                  disabled={!signupData.password1}
                  onChange={(e) =>
                    handleSignupInputChange('password2', e.target.value)
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setPasswordVisible2((vis) => !vis)
                          }
                        >
                          {passwordVisible2 ? (
                            <Visibility />
                          ) : (
                            <VisibilityOff />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

             <Box component="ul" sx={{ mt: 1, pl: 3, textAlign: 'left', listStyle: 'none', p: 0 }}>
  {passwordChecks.map((item) => (
    <Box
      key={item.id}
      component="li"
      sx={{
        color: item.check ? 'green' : 'red',
        mb: 0.5,
        display: 'flex',
        alignItems: 'center',
        fontSize: '0.95rem',
      }}
    >
      <span style={{ marginRight: '8px' }}>
        {item.check ? '✅' : '❌'}
      </span>
      {item.text}
    </Box>
  ))}
</Box>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={
                    !isFormComplete || !allChecksPassed || !signupRole
                  }
                  sx={{
                    backgroundColor: '#1e3a8a',
                    '&:hover': { backgroundColor: '#1a2d6e' }, mb:{xs:8,sm:8}
                  }}
                >
                 {sigining ? <CircularProgress size={20} color="primary" /> :' Sign Up'}
                </Button>
              </Box>
            </Box>
          )}
  </Box>
</Container>


    );
}