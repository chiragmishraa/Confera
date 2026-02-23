import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  UserPlus
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateName
} from "../utils/validators";
import { MIN_PASSWORD_LENGTH } from "../utils/constants";
import "../styles/auth.css";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const navigate = useNavigate();
  const { signup } = useAuth();
  const nameInputRef = useRef(null);

  // Auto-focus name input on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Calculate password strength
  useEffect(() => {
    if (formData.password) {
      const password = formData.password;
      let strength = 0;
      
      if (password.length >= MIN_PASSWORD_LENGTH) strength++;
      if (password.length >= 10) strength++;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
      if (/\d/.test(password)) strength++;
      if (/[^a-zA-Z0-9]/.test(password)) strength++;

      if (strength <= 2) setPasswordStrength('weak');
      else if (strength <= 4) setPasswordStrength('medium');
      else setPasswordStrength('strong');
    } else {
      setPasswordStrength(null);
    }
  }, [formData.password]);

  // Real-time validation
  useEffect(() => {
    if (touched.name && formData.name) {
      const nameError = validateName(formData.name);
      setErrors(prev => ({ ...prev, name: nameError }));
    }
  }, [formData.name, touched.name]);

  useEffect(() => {
    if (touched.username && formData.username) {
      const usernameError = validateUsername(formData.username);
      setErrors(prev => ({ ...prev, username: usernameError }));
    }
  }, [formData.username, touched.username]);

  useEffect(() => {
    if (touched.email && formData.email) {
      const emailError = validateEmail(formData.email);
      setErrors(prev => ({ ...prev, email: emailError }));
    }
  }, [formData.email, touched.email]);

  useEffect(() => {
    if (touched.password && formData.password) {
      const passwordError = validatePassword(formData.password);
      setErrors(prev => ({ ...prev, password: passwordError }));
    }
  }, [formData.password, touched.password]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      username: true,
      email: true,
      password: true
    });

    // Validate all fields
    const nameError = validateName(formData.name);
    const usernameError = validateUsername(formData.username);
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (nameError || usernameError || emailError || passwordError) {
      setErrors({
        name: nameError,
        username: usernameError,
        email: emailError,
        password: passwordError
      });

      // Focus first invalid field
      if (nameError) {
        nameInputRef.current?.focus();
      }
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await signup(formData);
      
      // Show success message and redirect
      setErrors({ 
        success: "Account created successfully! Redirecting to login..." 
      });
      
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      setErrors({
        general: err.message || "Failed to create account. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    formData.name &&
    formData.username &&
    formData.email &&
    formData.password &&
    !errors.name &&
    !errors.username &&
    !errors.email &&
    !errors.password;

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <img src="/Confera.png" alt="Confera Logo" />
          </div>
          <h1 className="auth-title">Join Confera</h1>
          <p className="auth-subtitle">Create your account to get started</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSignup} noValidate>
          {/* Success Alert */}
          {errors.success && (
            <div className="auth-alert success" role="alert">
              <CheckCircle />
              <span>{errors.success}</span>
            </div>
          )}

          {/* General Error Alert */}
          {errors.general && (
            <div className="auth-alert error" role="alert">
              <AlertCircle />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Name Input */}
          <div className="input-group">
            <label htmlFor="name" className="input-label">
              Full Name
            </label>
            <div className="input-wrapper">
              <input
                ref={nameInputRef}
                id="name"
                type="text"
                className={`auth-input ${
                  errors.name && touched.name ? 'error' : 
                  !errors.name && touched.name && formData.name ? 'success' : ''
                }`}
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                disabled={isLoading}
                autoComplete="name"
                aria-invalid={errors.name && touched.name ? 'true' : 'false'}
                aria-describedby={errors.name && touched.name ? 'name-error' : undefined}
              />
              <div className="input-icon">
                <User />
              </div>
            </div>
            {errors.name && touched.name && (
              <div id="name-error" className="error-message" role="alert">
                <AlertCircle />
                <span>{errors.name}</span>
              </div>
            )}
          </div>

          {/* Username Input */}
          <div className="input-group">
            <label htmlFor="username" className="input-label">
              Username
            </label>
            <div className="input-wrapper">
              <input
                id="username"
                type="text"
                className={`auth-input ${
                  errors.username && touched.username ? 'error' : 
                  !errors.username && touched.username && formData.username ? 'success' : ''
                }`}
                placeholder="Choose a unique username"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                onBlur={() => handleBlur('username')}
                disabled={isLoading}
                autoComplete="username"
                aria-invalid={errors.username && touched.username ? 'true' : 'false'}
                aria-describedby={errors.username && touched.username ? 'username-error' : undefined}
              />
              <div className="input-icon">
                <AtSign />
              </div>
            </div>
            {errors.username && touched.username && (
              <div id="username-error" className="error-message" role="alert">
                <AlertCircle />
                <span>{errors.username}</span>
              </div>
            )}
          </div>

          {/* Email Input */}
          <div className="input-group">
            <label htmlFor="email" className="input-label">
              Email Address
            </label>
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                className={`auth-input ${
                  errors.email && touched.email ? 'error' : 
                  !errors.email && touched.email && formData.email ? 'success' : ''
                }`}
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                disabled={isLoading}
                autoComplete="email"
                aria-invalid={errors.email && touched.email ? 'true' : 'false'}
                aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
              />
              <div className="input-icon">
                <Mail />
              </div>
            </div>
            {errors.email && touched.email && (
              <div id="email-error" className="error-message" role="alert">
                <AlertCircle />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          {/* Password Input */}
          <div className="input-group">
            <label htmlFor="password" className="input-label">
              Password
            </label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={`auth-input has-toggle ${
                  errors.password && touched.password ? 'error' : 
                  !errors.password && touched.password && formData.password ? 'success' : ''
                }`}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                disabled={isLoading}
                autoComplete="new-password"
                aria-invalid={errors.password && touched.password ? 'true' : 'false'}
                aria-describedby={
                  errors.password && touched.password 
                    ? 'password-error' 
                    : passwordStrength 
                    ? 'password-strength' 
                    : undefined
                }
              />
              <div className="input-icon">
                <Lock />
              </div>
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.password && touched.password && (
              <div id="password-error" className="error-message" role="alert">
                <AlertCircle />
                <span>{errors.password}</span>
              </div>
            )}
            {passwordStrength && !errors.password && (
              <div id="password-strength" className="password-strength">
                <span className="password-strength-label">
                  Password strength: {passwordStrength}
                </span>
                <div className="password-strength-bar">
                  <div className={`password-strength-fill ${passwordStrength}`}></div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="auth-button"
            disabled={isLoading || !isFormValid}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner" aria-hidden="true"></div>
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <UserPlus />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          <p className="auth-footer-text">
            Already have an account?{" "}
            <Link to="/" className="auth-link">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
