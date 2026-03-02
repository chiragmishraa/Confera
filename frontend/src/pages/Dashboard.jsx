import "../styles/dashboard.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Settings from "../components/Settings";
import TiltCard from "../components/TiltCard";
import { useAuth } from "../contexts/AuthContext";
import { sessionAPI } from "../api/session";
import { Video, Plus, Clock, Users, Trash2, X, CheckCircle, Link2 } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [showRecentMeetings, setShowRecentMeetings] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [joinError, setJoinError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { user, isAuthenticated, loading, updateUser } = useAuth();

  useEffect(() => {
    // Set page title
    document.title = "Home - Confera";
    
    if (loading) return;
    
    if (!isAuthenticated) {
      window.location.href = "/";
      return;
    }

    // Show success message on login
    const justLoggedIn = sessionStorage.getItem("justLoggedIn");
    if (justLoggedIn) {
      setSuccessMessage("Successfully logged in!");
      sessionStorage.removeItem("justLoggedIn");
      setTimeout(() => setSuccessMessage(""), 3000);
    }

    // Load recent meetings from backend
    loadRecentMeetings();
  }, [isAuthenticated, loading]);

  const loadRecentMeetings = async () => {
    try {
      const response = await sessionAPI.getUserMeetings();
      const meetings = response.data.meetings || [];
      setRecentMeetings(meetings);
    } catch (err) {
      console.error("Error loading meetings:", err);
      setRecentMeetings([]);
    }
  };

  const checkMeetingStatus = async (meetingCode) => {
    try {
      await sessionAPI.getSession(meetingCode);
      return "available";
    } catch (err) {
      return "expired";
    }
  };

  const deleteExpiredMeetings = async () => {
    // Reload meetings from backend - expired ones won't be returned
    await loadRecentMeetings();
  };

  const deleteAllMeetings = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAll = () => {
    setRecentMeetings([]);
    setShowDeleteConfirm(false);
  };

  const handleUserUpdate = (updatedUser) => {
    updateUser(updatedUser);
  };

  const createSession = async () => {
    try {
      const response = await sessionAPI.createSession({
        name: user?.name || "Unknown"
      });
      const meetingCode = response.data.meetingCode;
      // Meeting will be tracked automatically when user joins via socket
      navigate(`/conference/${meetingCode}`);
    } catch (err) {
      console.error("Error creating session:", err);
      setJoinError(err.message || "Failed to create session. Please try again.");
    }
  };

  const handleJoinSession = async (code = null) => {
    const meetingCode = code || joinCode.trim();
    
    if (!meetingCode) {
      setJoinError("Please enter a session code");
      return;
    }

    try {
      const normalizedCode = meetingCode.toUpperCase();
      await sessionAPI.getSession(normalizedCode);
      // Meeting will be tracked automatically when user joins via socket
      navigate(`/conference/${normalizedCode}`);
    } catch (err) {
      console.error("Error joining session:", err);
      if (err.code === 'VALIDATION_ERROR') {
        setJoinError("Invalid assembly code format");
      } else if (err.code === 'SESSION_ENDED') {
        setJoinError("This assembly has ended");
      } else if (err.code === 'SESSION_NOT_FOUND') {
        setJoinError("Assembly session not found");
      } else {
        setJoinError(err.message || "Assembly session not found");
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleJoinSession();
    }
  };

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "U";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="dashboard-container">
      {/* Success Message Toast */}
      {successMessage && (
        <div className="success-toast">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <nav className="top-nav">
        <div className="nav-left">
          <div className="logo">
            <img 
              src="/Confera.png" 
              alt="Confera" 
              style={{ 
                width: "28px", 
                height: "28px"
              }}
              onMouseEnter={(e) => e.currentTarget.classList.add('spinning')}
              onMouseLeave={(e) => e.currentTarget.classList.remove('spinning')}
            />
            <span>Confera</span>
          </div>
        </div>
        
        <div className="nav-right">
          <div 
            className="profile-btn"
            onClick={() => setShowSettings(true)}
          >
            <div className="avatar">
              {user?.profilePic ? (
                <img src={user.profilePic} alt={user.name} />
              ) : (
                <span>{getInitials(user?.name)}</span>
              )}
            </div>
            <span className="profile-name">{user?.name || "User"}</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* Background Watermark */}
        <div className="background-watermark">Confera</div>

        <div className="content-center">
          <h1 className="main-title">Welcome to Confera</h1>
          <p className="subtitle">Create or connect to a virtual conference</p>

          <div className="action-cards">
            <TiltCard>
              <button className="action-card primary create-card" onClick={createSession}>
                <div className="card-icon">
                  <Plus size={32} />
                </div>
                <h3>Create</h3>
                <p>Start a new assembly instantly</p>
              </button>
            </TiltCard>

            <TiltCard>
              <div className="action-card secondary connect-card" onClick={(e) => {
                // Focus input when clicking anywhere on the card except the button
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                  const input = e.currentTarget.querySelector('.join-input');
                  if (input) input.focus();
                }
              }}>
                <div className="card-icon">
                  <Link2 size={32} />
                </div>
                <h3>Connect</h3>
                <p>Enter code to join assembly</p>
                <div className="join-input-group">
                  <input
                    type="text"
                    placeholder="Enter assembly code"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value);
                      setJoinError("");
                    }}
                    onKeyDown={handleKeyDown}
                    className="join-input"
                    style={{
                      borderColor: joinError ? "#ef4444" : "rgba(255, 255, 255, 0.1)"
                    }}
                  />
                  <button
                    onClick={() => handleJoinSession()}
                    disabled={!joinCode.trim()}
                    className="join-btn"
                  >
                    Join
                  </button>
                </div>
                {joinError && (
                  <p style={{ 
                    fontSize: "12px", 
                    color: "#ef4444", 
                    margin: "6px 0 0 0",
                    textAlign: "center"
                  }}>
                    {joinError}
                  </p>
                )}
              </div>
            </TiltCard>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="bottom-nav-item active">
          <Video size={24} />
          <span>Home</span>
        </button>
        <button className="bottom-nav-item" onClick={() => setShowRecentMeetings(true)}>
          <Clock size={24} />
          <span>Recent</span>
        </button>
        <button className="bottom-nav-item" onClick={() => setShowSettings(true)}>
          <Users size={24} />
          <span>Profile</span>
        </button>
      </nav>

      {/* Recent Meetings Panel */}
      {showRecentMeetings && (
        <div className="modal-overlay" onClick={() => setShowRecentMeetings(false)}>
          <div className="recent-panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <h2>Recent Conferances</h2>
              <button 
                className="close-btn"
                onClick={() => setShowRecentMeetings(false)}
              >
                <X size={24} />
              </button>
            </div>

            {recentMeetings.length > 0 && (
              <div className="panel-actions">
                <button 
                  className="action-btn danger"
                  onClick={deleteExpiredMeetings}
                >
                  <Trash2 size={16} />
                  Delete Expired
                </button>
                <button 
                  className="action-btn danger"
                  onClick={deleteAllMeetings}
                >
                  <Trash2 size={16} />
                  Delete All
                </button>
              </div>
            )}

            <div className="meetings-list">
              {recentMeetings.length === 0 ? (
                <div className="empty-state">
                  <Clock size={48} />
                  <p>No recent conferances</p>
                  <span>Your conferancing history will appear here</span>
                </div>
              ) : (
                recentMeetings.map((meeting, index) => (
                  <MeetingCard
                    key={index}
                    meeting={meeting}
                    onJoin={handleJoinSession}
                    checkStatus={checkMeetingStatus}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <Settings 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        onUpdate={handleUserUpdate}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
          zIndex: 2000,
          padding: "20px"
        }}>
          <div style={{
            background: "#1e293b",
            borderRadius: "16px",
            padding: "30px",
            maxWidth: "450px",
            width: "100%",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(239, 68, 68, 0.3)"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px"
            }}>
              <Trash2 size={24} color="#ef4444" />
              <h3 style={{ 
                margin: 0, 
                color: "white",
                fontSize: "20px",
                fontWeight: "600"
              }}>
                Clear Conferancing History
              </h3>
            </div>
            
            <p style={{ 
              margin: "0 0 24px 0", 
              color: "#cbd5e1",
              fontSize: "15px",
              lineHeight: "1.6"
            }}>
              Are you sure you want to clear your conferancing history? This will only remove them from your view and cannot be undone.
            </p>

            <div style={{ 
              display: "flex", 
              gap: "12px",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "12px 24px",
                  background: "#475569",
                  border: "none",
                  borderRadius: "10px",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#64748b"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#475569"}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAll}
                style={{
                  padding: "12px 24px",
                  background: "#ef4444",
                  border: "none",
                  borderRadius: "10px",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#dc2626"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#ef4444"}
              >
                <Trash2 size={16} />
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Meeting Card Component
function MeetingCard({ meeting, onJoin, checkStatus }) {
  const [status, setStatus] = useState(meeting.status === 'active' ? 'available' : 'expired');

  useEffect(() => {
    // Only check status if it's marked as active
    if (meeting.status === 'active') {
      checkStatus(meeting.code).then(setStatus);
    }
  }, [meeting.code, meeting.status]);

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className={`meeting-card ${status}`}>
      <div className="meeting-info">
        <div className="meeting-code">
          {meeting.code}
          {meeting.isHost && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#3b82f6' }}>(Host)</span>}
        </div>
        <div className="meeting-meta">
          <span className="meeting-time">
            <Clock size={14} />
            {new Date(meeting.lastJoined).toLocaleDateString()} at{" "}
            {new Date(meeting.lastJoined).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          <span className="meeting-participants">
            <Users size={14} />
            {meeting.participantCount} participant{meeting.participantCount !== 1 ? 's' : ''}
          </span>
          <span className="meeting-duration" style={{ color: '#10b981' }}>
            <Clock size={14} />
            {formatDuration(meeting.duration || 0)}
          </span>
        </div>
      </div>
      <div className="meeting-actions">
        <span className={`status-badge ${status}`}>
          {status === "checking" ? "Checking..." : status === "available" ? "Active" : "Expired"}
        </span>
        {status === "available" && (
          <button 
            className="rejoin-btn"
            onClick={() => onJoin(meeting.code)}
          >
            Join
          </button>
        )}
      </div>
    </div>
  );
}
