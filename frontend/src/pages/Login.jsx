import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  LogIn
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { validateEmail } from "../utils/validators";
import "../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const emailInputRef = useRef(null);

  // Auto-focus email input on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Real-time validation
  useEffect(() => {
    if (touched.email && email) {
      const emailError = validateEmail(email);
      setErrors(prev => ({ ...prev, email: emailError }));
    }
  }, [email, touched.email]);

  useEffect(() => {
    if (touched.password && password) {
      const passwordError = !password ? 'Password is required' : null;
      setErrors(prev => ({ ...prev, password: passwordError }));
    }
  }, [password, touched.password]);

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ email: true, password: true });

    // Validate all fields
    const emailError = validateEmail(email);
    const passwordError = !password ? 'Password is required' : null;

    if (emailError || passwordError) {
      setErrors({ 
        email: emailError, 
        password: passwordError 
      });
      
      // Focus first invalid field
      if (emailError) {
        emailInputRef.current?.focus();
      }
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await login({ email, password });
      sessionStorage.setItem("justLoggedIn", "true");
      navigate("/home");
    } catch (err) {
      setErrors({ 
        general: err.message || "Invalid email or password. Please try again." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = email && password && !errors.email && !errors.password;

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <img src="/Confera.png" alt="Confera Logo" />
          </div>
          <h1 className="auth-title">Welcome to Confera</h1>
          <p className="auth-subtitle">Sign in to continue to your account</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleLogin} noValidate>
          {/* General Error Alert */}
          {errors.general && (
            <div className="auth-alert error" role="alert">
              <AlertCircle />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Email Input */}
          <div className="input-group">
            <label htmlFor="email" className="input-label">
              Email Address
            </label>
            <div className="input-wrapper">
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                className={`auth-input ${errors.email && touched.email ? 'error' : ''}`}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                className={`auth-input has-toggle ${errors.password && touched.password ? 'error' : ''}`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                disabled={isLoading}
                autoComplete="current-password"
                aria-invalid={errors.password && touched.password ? 'true' : 'false'}
                aria-describedby={errors.password && touched.password ? 'password-error' : undefined}
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
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          <p className="auth-footer-text">
            Don't have an account?{" "}
            <Link to="/signup" className="auth-link">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
