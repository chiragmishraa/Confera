import { useState, useEffect, useRef } from "react";
import { authAPI } from "../api/auth";
import { Settings as SettingsIcon, User, Lock, Info, Camera, Trash2, Save, LogOut, RotateCcw, Check, X as CloseIcon, Eye, EyeOff, Edit } from "lucide-react";

export default function Settings({ isOpen, onClose, user, onUpdate }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    profilePic: user?.profilePic || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [previewImage, setPreviewImage] = useState(user?.profilePic || "");
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [cropData, setCropData] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [showSuccess, setShowSuccess] = useState({
    profile: false,
    password: false
  });
  const [passwordErrors, setPasswordErrors] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || "",
        username: user.username || "",
        profilePic: user.profilePic || ""
      }));
      setPreviewImage(user.profilePic || "");
    }
  }, [user]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showMessage("Image size should be less than 2MB", "error");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          setImageToCrop(reader.result);
          setShowCropper(true);
          // Center the image
          setCropData({ x: 0, y: 0 });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const drawCropPreview = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    const size = 300; // Canvas size (square)
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Calculate dimensions to fit the smaller dimension and maintain aspect ratio
    const imgAspect = img.width / img.height;
    let scale, scaledWidth, scaledHeight;
    
    if (imgAspect > 1) {
      // Landscape: fit height
      scale = size / img.height;
      scaledHeight = size;
      scaledWidth = img.width * scale;
    } else {
      // Portrait or square: fit width
      scale = size / img.width;
      scaledWidth = size;
      scaledHeight = img.height * scale;
    }

    // Draw image with x and y positioning
    ctx.drawImage(
      img,
      cropData.x,
      cropData.y,
      scaledWidth,
      scaledHeight
    );

    // Draw semi-transparent overlay to show crop area
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    
    // Top overlay
    if (cropData.y > 0) {
      ctx.fillRect(0, 0, size, cropData.y);
    }
    
    // Bottom overlay
    const visibleBottom = cropData.y + scaledHeight;
    if (visibleBottom > size) {
      ctx.fillRect(0, size, size, visibleBottom - size);
    }
    
    // Left overlay
    if (cropData.x > 0) {
      ctx.fillRect(0, 0, cropData.x, size);
    }
    
    // Right overlay
    const visibleRight = cropData.x + scaledWidth;
    if (visibleRight > size) {
      ctx.fillRect(size, 0, visibleRight - size, size);
    }

    // Draw border around crop area
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
  };

  useEffect(() => {
    if (showCropper && imageToCrop) {
      drawCropPreview();
    }
  }, [cropData, showCropper, imageToCrop]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ 
      x: clientX - cropData.x, 
      y: clientY - cropData.y 
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      const img = imageRef.current;
      if (!img) return;
      
      const size = 300;
      const imgAspect = img.width / img.height;
      let scaledWidth, scaledHeight;
      
      if (imgAspect > 1) {
        // Landscape: fit height
        const scale = size / img.height;
        scaledHeight = size;
        scaledWidth = img.width * scale;
      } else {
        // Portrait or square: fit width
        const scale = size / img.width;
        scaledWidth = size;
        scaledHeight = img.height * scale;
      }
      
      const maxX = 0;
      const minX = size - scaledWidth;
      const maxY = 0;
      const minY = size - scaledHeight;
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const newX = clientX - dragStart.x;
      const newY = clientY - dragStart.y;
      
      setCropData({ 
        x: Math.max(minX, Math.min(maxX, newX)),
        y: Math.max(minY, Math.min(maxY, newY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    // Removed zoom functionality
  };

  const handleCropConfirm = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    // Create final cropped image at 200x200 (square)
    const finalCanvas = document.createElement("canvas");
    const finalSize = 200;
    finalCanvas.width = finalSize;
    finalCanvas.height = finalSize;
    const ctx = finalCanvas.getContext("2d");

    // Calculate scale and dimensions
    const previewSize = 300;
    const imgAspect = img.width / img.height;
    let scale, scaledWidth, scaledHeight;
    
    if (imgAspect > 1) {
      // Landscape: fit height
      scale = previewSize / img.height;
      scaledHeight = previewSize;
      scaledWidth = img.width * scale;
    } else {
      // Portrait or square: fit width
      scale = previewSize / img.width;
      scaledWidth = previewSize;
      scaledHeight = img.height * scale;
    }
    
    // Calculate which part of the original image to crop
    const sourceX = -cropData.x / scale;
    const sourceY = -cropData.y / scale;
    const sourceWidth = previewSize / scale;
    const sourceHeight = previewSize / scale;

    // Draw the cropped portion
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      finalSize,
      finalSize
    );

    // Convert to PNG
    const croppedImage = finalCanvas.toDataURL("image/png", 1.0);
    
    // Update both preview and form data
    setPreviewImage(croppedImage);
    setFormData(prev => ({ ...prev, profilePic: croppedImage }));
    
    // Close cropper and reset
    setShowCropper(false);
    setImageToCrop(null);
    setCropData({ x: 0, y: 0 });
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageToCrop(null);
    setCropData({ x: 0, y: 0 });
  };

  const handleRemoveImage = () => {
    setPreviewImage("");
    setFormData(prev => ({ ...prev, profilePic: "" }));
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const response = await authAPI.updateProfile({
        name: formData.name,
        username: formData.username,
        profilePic: formData.profilePic
      });

      setShowSuccess(prev => ({ ...prev, profile: true }));
      setTimeout(() => setShowSuccess(prev => ({ ...prev, profile: false })), 2000);
      onUpdate(response.data.user || response.data);
    } catch (err) {
      showMessage(err.message || "Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Clear previous errors
    setPasswordErrors({ current: "", new: "", confirm: "" });
    
    // Validate new password length
    if (formData.newPassword.length < 6) {
      setPasswordErrors(prev => ({ ...prev, new: "Password must be at least 6 characters" }));
      return;
    }

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setPasswordErrors(prev => ({ ...prev, confirm: "Passwords do not match" }));
      return;
    }

    // Validate new password is different from current
    if (formData.currentPassword === formData.newPassword) {
      setPasswordErrors(prev => ({ ...prev, new: "New password must be different from current password" }));
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      setShowSuccess(prev => ({ ...prev, password: true }));
      setTimeout(() => setShowSuccess(prev => ({ ...prev, password: false })), 2000);
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
      setPasswordErrors({ current: "", new: "", confirm: "" });
    } catch (err) {
      // Check if error is about incorrect current password
      if (err.message && err.message.toLowerCase().includes("current password")) {
        setPasswordErrors(prev => ({ ...prev, current: "Current password is incorrect" }));
      } else {
        showMessage(err.message || "Failed to change password", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  if (!isOpen) return null;

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "U";
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      padding: "20px"
    }}>
      <div style={{
        background: "#1e293b",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "600px",
        maxHeight: "90vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #334155",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h2 style={{ margin: 0, color: "white", display: "flex", alignItems: "center", gap: "10px" }}>
            <SettingsIcon size={24} />
            Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <CloseIcon size={24} />
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            padding: "12px 24px",
            background: message.type === "success" ? "#10b981" : "#ef4444",
            color: "white",
            textAlign: "center",
            fontSize: "14px"
          }}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: "0",
          borderBottom: "1px solid #334155",
          padding: window.innerWidth < 768 ? "0 12px" : "0 24px",
          alignItems: "flex-end",
          justifyContent: "center",
          overflowX: "auto",
          overflowY: "hidden",
          minHeight: "56px"
        }}>
          <button
            onClick={() => setActiveTab("profile")}
            style={{
              padding: window.innerWidth < 768 ? "12px 16px" : "12px 24px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "profile" ? "3px solid #3b82f6" : "3px solid transparent",
              color: activeTab === "profile" ? "#3b82f6" : "#94a3b8",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: window.innerWidth < 768 ? "14px" : "15px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              flexShrink: 0
            }}
          >
            <User size={window.innerWidth < 768 ? 18 : 20} />
            Profile
          </button>
          <button
            onClick={() => setActiveTab("security")}
            style={{
              padding: window.innerWidth < 768 ? "12px 16px" : "12px 24px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "security" ? "3px solid #3b82f6" : "3px solid transparent",
              color: activeTab === "security" ? "#3b82f6" : "#94a3b8",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: window.innerWidth < 768 ? "14px" : "15px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              flexShrink: 0
            }}
          >
            <Lock size={window.innerWidth < 768 ? 18 : 20} />
            Security
          </button>
          <button
            onClick={() => setActiveTab("about")}
            style={{
              padding: window.innerWidth < 768 ? "12px 16px" : "12px 24px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "about" ? "3px solid #3b82f6" : "3px solid transparent",
              color: activeTab === "about" ? "#3b82f6" : "#94a3b8",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: window.innerWidth < 768 ? "14px" : "15px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              flexShrink: 0
            }}
          >
            <Info size={window.innerWidth < 768 ? 18 : 20} />
            About
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: window.innerWidth < 768 ? "20px 20px" : "24px 40px",
          overflowY: "auto",
          flex: 1,
          color: "white"
        }}>
          {activeTab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingTop: "8px" }}>
              {/* Profile Picture */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "15px" }}>
                <div 
                  key={previewImage}
                  style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "12px",
                  background: previewImage ? `url(${previewImage})` : "#3b82f6",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "48px",
                  fontWeight: "bold",
                  color: "white",
                  border: "4px solid #334155",
                  position: "relative",
                  overflow: "hidden"
                }}>
                  {!previewImage && getInitials(formData.name)}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <label style={{
                    padding: "8px 16px",
                    background: "#3b82f6",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <Camera size={16} />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: "none" }}
                    />
                  </label>

                  {previewImage && (
                    <button
                      onClick={handleRemoveImage}
                      style={{
                        padding: "8px 16px",
                        background: "#ef4444",
                        border: "none",
                        borderRadius: "8px",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  )}
                </div>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                  Max size: 2MB. Formats: JPG, PNG, GIF
                </p>
              </div>

              {/* Name */}
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#94a3b8", fontSize: "14px", fontWeight: "500" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Username */}
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#94a3b8", fontSize: "14px", fontWeight: "500" }}>
                  Username (unique)
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  placeholder="Enter unique username"
                />
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "6px", margin: "6px 0 0 0" }}>
                  Username is private and used for login
                </p>
              </div>

              {/* Email (read-only) */}
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#94a3b8", fontSize: "14px", fontWeight: "500" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#64748b",
                    fontSize: "14px",
                    cursor: "not-allowed",
                    boxSizing: "border-box"
                  }}
                />
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "6px", margin: "6px 0 0 0" }}>
                  Email cannot be changed
                </p>
              </div>

              <button
                onClick={handleUpdateProfile}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0",
                  background: loading ? "#475569" : "#10b981",
                  border: "none",
                  borderRadius: "10px",
                  color: "white",
                  fontWeight: "bold",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  position: "relative",
                  overflow: "hidden",
                  height: "50px"
                }}
              >
                <div style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  right: "0",
                  bottom: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transform: showSuccess.profile ? "translateY(-100%)" : "translateY(0)",
                  transition: "transform 0.3s ease-in-out"
                }}>
                  <Save size={20} />
                  <span>{loading ? "Updating..." : "Save Changes"}</span>
                </div>
                <div style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  right: "0",
                  bottom: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transform: showSuccess.profile ? "translateY(0)" : "translateY(100%)",
                  transition: "transform 0.3s ease-in-out"
                }}>
                  <Check size={20} />
                  <span>Profile updated!</span>
                </div>
              </button>
            </div>
          )}

          {activeTab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingTop: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Change Password</h3>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#94a3b8", fontSize: "14px", fontWeight: "500" }}>
                  Current Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, currentPassword: e.target.value }));
                      setPasswordErrors(prev => ({ ...prev, current: "" }));
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 48px 12px 16px",
                      background: "#0f172a",
                      border: `1px solid ${passwordErrors.current ? "#ef4444" : "#334155"}`,
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordErrors.current && (
                  <p style={{ fontSize: "12px", color: "#ef4444", margin: "6px 0 0 0" }}>
                    {passwordErrors.current}
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#94a3b8", fontSize: "14px", fontWeight: "500" }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, newPassword: e.target.value }));
                      setPasswordErrors(prev => ({ ...prev, new: "" }));
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 48px 12px 16px",
                      background: "#0f172a",
                      border: `1px solid ${passwordErrors.new ? "#ef4444" : "#334155"}`,
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                    placeholder="Enter new password (min 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordErrors.new && (
                  <p style={{ fontSize: "12px", color: "#ef4444", margin: "6px 0 0 0" }}>
                    {passwordErrors.new}
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#94a3b8", fontSize: "14px", fontWeight: "500" }}>
                  Confirm New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      setPasswordErrors(prev => ({ ...prev, confirm: "" }));
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 48px 12px 16px",
                      background: "#0f172a",
                      border: `1px solid ${passwordErrors.confirm ? "#ef4444" : "#334155"}`,
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordErrors.confirm && (
                  <p style={{ fontSize: "12px", color: "#ef4444", margin: "6px 0 0 0" }}>
                    {passwordErrors.confirm}
                  </p>
                )}
              </div>

              <button
                onClick={handleChangePassword}
                disabled={loading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
                style={{
                  width: "100%",
                  padding: "0",
                  background: loading || !formData.currentPassword ? "#475569" : "#3b82f6",
                  border: "none",
                  borderRadius: "10px",
                  color: "white",
                  fontWeight: "bold",
                  cursor: loading || !formData.currentPassword ? "not-allowed" : "pointer",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  position: "relative",
                  overflow: "hidden",
                  height: "50px"
                }}
              >
                <div style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  right: "0",
                  bottom: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transform: showSuccess.password ? "translateY(-100%)" : "translateY(0)",
                  transition: "transform 0.3s ease-in-out"
                }}>
                  <Lock size={20} />
                  <span>{loading ? "Changing..." : "Change Password"}</span>
                </div>
                <div style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  right: "0",
                  bottom: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transform: showSuccess.password ? "translateY(0)" : "translateY(100%)",
                  transition: "transform 0.3s ease-in-out"
                }}>
                  <Check size={20} />
                  <span>Password changed!</span>
                </div>
              </button>
            </div>
          )}

          {activeTab === "about" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingTop: "8px" }}>
              {/* Hero Section */}
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <h2 style={{ 
                  margin: "0 0 12px 0", 
                  fontSize: "28px", 
                  fontWeight: "700",
                  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}>
                  Confera
                </h2>
                <p style={{ 
                  margin: 0, 
                  color: "#94a3b8", 
                  fontSize: "16px",
                  lineHeight: "1.6"
                }}>
                  Seamless video conferencing for modern teams
                </p>
              </div>

              {/* Mission Statement */}
              <div style={{ 
                padding: "20px", 
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
                borderRadius: "12px",
                border: "1px solid rgba(59, 130, 246, 0.2)"
              }}>
                <h3 style={{ 
                  marginTop: 0, 
                  marginBottom: "12px",
                  color: "white",
                  fontSize: "18px",
                  fontWeight: "600"
                }}>
                  Founded by Chirag
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: "#cbd5e1", 
                  fontSize: "15px",
                  lineHeight: "1.7"
                }}>
                  Confera was built to keep conversations flowing and distractions out of the way, whether it's team collaboration, project discussions, or catching up with friends. It isn't just another tool. Confera is a space designed to bring people together, wherever they are, with a focus on simplicity, clarity, and real human connection.
                </p>
              </div>

              {/* Founder Section */}
              <div style={{ 
                padding: "20px", 
                background: "#0f172a", 
                borderRadius: "12px",
                border: "1px solid #334155"
              }}>
                <h3 style={{ 
                  marginTop: 0, 
                  marginBottom: "16px",
                  color: "white",
                  fontSize: "18px",
                  fontWeight: "600"
                }}>
                  Our Mission
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: "#cbd5e1", 
                  fontSize: "15px",
                  lineHeight: "1.7"
                }}>
                  Confera was created to make virtual gatherings feel simple, natural, and actually enjoyable. Instead of cluttered interfaces and complicated setups, Confera focuses on what really matters: connecting people smoothly, clearly, and without friction. Our goal is to turn virtual gatherings into experiences that feel effortless, reliable, and genuinely interactive. We believe distance should never be a barrier to meaningful communication, whether for work, learning, or staying connected with people who matter.
                </p>
              </div>

              {/* Features Grid */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(2, 1fr)", 
                gap: "12px" 
              }}>
                <div style={{ 
                  padding: "16px", 
                  background: "#0f172a", 
                  borderRadius: "10px",
                  border: "1px solid #334155"
                }}>
                  <div style={{ 
                    fontSize: "24px", 
                    marginBottom: "8px" 
                  }}>
                    
                  </div>
                  <h4 style={{ 
                    margin: "0 0 6px 0", 
                    color: "white", 
                    fontSize: "15px",
                    fontWeight: "600"
                  }}>
                    ▶ HD Video
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: "#94a3b8", 
                    fontSize: "13px",
                    lineHeight: "1.5"
                  }}>
                    Smooth, high-quality video that keeps conversations clear and natural.
                  </p>
                </div>

                <div style={{ 
                  padding: "16px", 
                  background: "#0f172a", 
                  borderRadius: "10px",
                  border: "1px solid #334155"
                }}>
                  <div style={{ 
                    fontSize: "24px", 
                    marginBottom: "8px" 
                  }}>
                    
                  </div>
                  <h4 style={{ 
                    margin: "0 0 6px 0", 
                    color: "white", 
                    fontSize: "15px",
                    fontWeight: "600"
                  }}>
                    ⎙ Screen Share
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: "#94a3b8", 
                    fontSize: "13px",
                    lineHeight: "1.5"
                  }}>
                    Share your screen instantly for presentations, demos, or collaboration in real time.
                  </p>
                </div>

                <div style={{ 
                  padding: "16px", 
                  background: "#0f172a", 
                  borderRadius: "10px",
                  border: "1px solid #334155"
                }}>
                  <div style={{ 
                    fontSize: "24px", 
                    marginBottom: "8px" 
                  }}>
                    
                  </div>
                  <h4 style={{ 
                    margin: "0 0 6px 0", 
                    color: "white", 
                    fontSize: "15px",
                    fontWeight: "600"
                  }}>
                    ✉ Real-time Chat
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: "#94a3b8", 
                    fontSize: "13px",
                    lineHeight: "1.5"
                  }}>
                    Send messages, links, and quick updates without interrupting the flow of conversation.
                  </p>
                </div>

                <div style={{ 
                  padding: "16px", 
                  background: "#0f172a", 
                  borderRadius: "10px",
                  border: "1px solid #334155"
                }}>
                  <div style={{ 
                    fontSize: "24px", 
                    marginBottom: "8px" 
                  }}>
                    
                  </div>
                  <h4 style={{ 
                    margin: "0 0 6px 0", 
                    color: "white", 
                    fontSize: "15px",
                    fontWeight: "600"
                  }}>
                    🔒 Secure
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: "#94a3b8", 
                    fontSize: "13px",
                    lineHeight: "1.5"
                  }}>
                    Built with privacy in mind, so your conversations stay safe and protected.
                  </p>
                </div>
              </div>

              {/* Keyboard Shortcuts - Hidden on mobile */}
              <div style={{ 
                padding: "20px", 
                background: "#0f172a", 
                borderRadius: "12px",
                border: "1px solid #334155",
                display: window.innerWidth < 768 ? "none" : "block"
              }}>
                <h3 style={{ 
                  marginTop: 0, 
                  marginBottom: "16px",
                  color: "white",
                  fontSize: "18px",
                  fontWeight: "600"
                }}>
                  Keyboard Shortcuts
                </h3>
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "10px", 
                  fontSize: "14px", 
                  color: "#cbd5e1" 
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span>Toggle Camera</span>
                    <kbd style={{ 
                      background: "#334155", 
                      padding: "4px 10px", 
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      border: "1px solid #475569"
                    }}>
                      Alt+V
                    </kbd>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span>Toggle Microphone</span>
                    <kbd style={{ 
                      background: "#334155", 
                      padding: "4px 10px", 
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      border: "1px solid #475569"
                    }}>
                      Alt+A
                    </kbd>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span>Toggle Screen Share</span>
                    <kbd style={{ 
                      background: "#334155", 
                      padding: "4px 10px", 
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      border: "1px solid #475569"
                    }}>
                      Alt+S
                    </kbd>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span>View Participants</span>
                    <kbd style={{ 
                      background: "#334155", 
                      padding: "4px 10px", 
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      border: "1px solid #475569"
                    }}>
                      Alt+P
                    </kbd>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span>Toggle Chat</span>
                    <kbd style={{ 
                      background: "#334155", 
                      padding: "4px 10px", 
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      border: "1px solid #475569"
                    }}>
                      Alt+C
                    </kbd>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span>Leave Gathering</span>
                    <kbd style={{ 
                      background: "#334155", 
                      padding: "4px 10px", 
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      border: "1px solid #475569"
                    }}>
                      Alt+L
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Version & Footer */}
              <div style={{ 
                padding: "20px", 
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
                borderRadius: "12px",
                textAlign: "center",
                border: "1px solid rgba(59, 130, 246, 0.1)"
              }}>
                <p style={{ 
                  margin: 0, 
                  color: "#94a3b8",
                  fontSize: "14px"
                }}>
                  <strong style={{ color: "#cbd5e1" }}>Version:</strong> 1.0.0
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "20px 24px",
          borderTop: "1px solid #334155",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "#475569",
              border: "none",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Close
          </button>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              padding: "10px 20px",
              background: "#ef4444",
              border: "none",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 3000
        }}>
          <div style={{
            background: "#1e293b",
            borderRadius: "16px",
            padding: "30px",
            maxWidth: "400px",
            width: "90%",
            display: "flex",
            flexDirection: "column",
            gap: "20px"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "white"
            }}>
              <LogOut size={24} color="#ef4444" />
              <h3 style={{ margin: 0, fontSize: "20px" }}>Logout</h3>
            </div>
            
            <p style={{ 
              margin: 0, 
              color: "#94a3b8",
              fontSize: "15px",
              lineHeight: "1.5"
            }}>
              Are you sure you want to logout? You'll need to login again to access your account.
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#475569",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#ef4444",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {showCropper && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.9)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2000
        }}>
          <div style={{
            background: "#1e293b",
            borderRadius: "16px",
            padding: "30px",
            maxWidth: "500px",
            width: "90%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px"
          }}>
            <h3 style={{ margin: 0, color: "white" }}>Crop Your Photo</h3>
            
            <div style={{
              position: "relative",
              width: "300px",
              height: "300px",
              background: "#0f172a",
              borderRadius: "12px",
              overflow: "hidden",
              cursor: isDragging ? "grabbing" : "grab",
              userSelect: "none",
              touchAction: "none"
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            onWheel={handleWheel}
            >
              <canvas
                ref={canvasRef}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block"
                }}
              />
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              width: "100%",
              alignItems: "center"
            }}>
              <div style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center" }}>
                Drag to reposition
              </div>
              
              <button
                onClick={() => setCropData({ x: 0, y: 0 })}
                style={{
                  padding: "8px 16px",
                  background: "#475569",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>

            <div style={{ display: "flex", gap: "12px", width: "100%" }}>
              <button
                onClick={handleCropCancel}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#475569",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCropConfirm}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#10b981",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
              >
                <Check size={18} />
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
