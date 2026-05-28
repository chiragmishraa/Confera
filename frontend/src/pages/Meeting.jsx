import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { authAPI } from "../api/auth";
import { sessionAPI } from "../api/session";
import { SOCKET_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";
import Settings from "../components/Settings";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Users, 
  MessageSquare, 
  PhoneOff,
  Menu,
  X,
  Copy,
  Keyboard,
  Monitor,
  MonitorOff,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Volume2,
  VolumeX,
  Check,
  Circle,
  Pause,
  Play,
  Maximize,
  Minimize,
  VolumeX as VolumeOff,
  Camera,
  CameraOff,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Zap,
  MousePointer,
  MessageCircleOff,
  UserX,
  MonitorX,
  Headphones,
  ChevronDown
} from "lucide-react";

// Custom scrollbar styles
const scrollbarStyles = `
  *, *::before, *::after {
    -webkit-tap-highlight-color: transparent !important;
    box-sizing: border-box;
  }

  html, body {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
  }

  button, a, div, video, span, input, textarea {
    -webkit-tap-highlight-color: transparent !important;
    outline: none;
  }

  button {
    -webkit-appearance: none;
  }

  button:focus, button:active {
    outline: none !important;
    box-shadow: none;
  }

  :focus {
    outline: none !important;
  }

  #screen-container, #screen-video,
  [id^="screen-container-"], [id^="screen-video-"] {
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
  }

  .screen-controls {
    transition: opacity 0.3s ease, transform 0.3s ease;
    opacity: 0;
    transform: scale(0.95);
    pointer-events: none;
  }

  .screen-controls.visible {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }

  .screen-controls button {
    transition: transform 0.15s ease, background 0.2s ease;
  }

  .screen-controls button:active {
    transform: scale(0.85) !important;
  }
  .chat-messages-scroll::-webkit-scrollbar {
    width: 8px;
  }
  
  .chat-messages-scroll::-webkit-scrollbar-track {
    background: #1e293b;
    border-radius: 4px;
  }
  
  .chat-messages-scroll::-webkit-scrollbar-thumb {
    background: #475569;
    border-radius: 4px;
  }
  
  .chat-messages-scroll::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }
  
  @keyframes soundWave {
    0%, 100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.6;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.3);
      opacity: 0.2;
    }
  }
  
  .sound-wave {
    animation: soundWave 1.5s ease-in-out infinite;
  }

  #screen-container {
    position: relative;
    width: 100%;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
    touch-action: manipulation;
    background: black;
  }

  #screen-video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: black;
  }

  :fullscreen #screen-container,
  :-webkit-full-screen #screen-container {
    width: 100vw;
    height: 100vh;
    background: black;
  }
`;

/* Disable all console logs
if (process.env.NODE_ENV === 'production' || true) {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}
*/

export default function Meeting() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const peersRef = useRef({});
  const socketRef = useRef(null);
  const iceCandidatesQueue = useRef({}); // Queue for ICE candidates
  const screenIceCandidatesQueue = useRef({}); // Queue for screen share ICE candidates

  const [stream, setStream] = useState(null);
  const currentStreamRef = useRef(null);
  const originalMediaStreamRef = useRef(null); // Store original camera/mic stream
  const [remoteStreams, setRemoteStreams] = useState({});
  
  // Helper to update stream and ref together
  const updateStream = (newStream) => {
    setStream(newStream);
    currentStreamRef.current = newStream;
  };
  const [isCameraOn, setIsCameraOn] = useState(false); // Changed to false (off by default)
  const [isMicOn, setIsMicOn] = useState(false); // Changed to false (off by default)
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);
  const screenPeerRef = useRef({}); // Separate peer connections for screen share
  const screenSocketIdRef = useRef(null); // Store screen share socket ID
  const [connectionStatus, setConnectionStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [notification, setNotification] = useState(null);
  const [debugInfo, setDebugInfo] = useState({
    peersCount: 0,
    remoteStreamsCount: 0,
    socketConnected: false
  });
  const [sessionTimer, setSessionTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserReady, setIsUserReady] = useState(false); // Fires socket effect exactly once
  const currentUserRef = useRef(null); // Ref so socket effect can read latest user without re-running
  const [participants, setParticipants] = useState({}); // Store user info by socket ID
  const [participantMediaStatus, setParticipantMediaStatus] = useState({}); // Track camera/mic status for each participant
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [footerVisible, setFooterVisible] = useState(true);
  const footerTimerRef = useRef(null);
  const [openTroubleshootIndex, setOpenTroubleshootIndex] = useState(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showChatReset, setShowChatReset] = useState(false);
  const [chatPosition, setChatPosition] = useState({ x: window.innerWidth - 370, y: 80 });
  const [chatSize, setChatSize] = useState({ width: 350, height: 500 });
  
  // Password and host controls state
  const [meetingPassword, setMeetingPassword] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null); // socketId of user to remove
  const [showMeetingPassword, setShowMeetingPassword] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState(""); // Store the actual password from backend
  const [showRevealedPassword, setShowRevealedPassword] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [userPings, setUserPings] = useState({});
  const [selfPing, setSelfPing] = useState(null);
  const [hearAll, setHearAll] = useState(false); // Hear all participants regardless of slide
  const [speakingUsers, setSpeakingUsers] = useState({}); // Track who is speaking
  const audioAnalyzersRef = useRef({}); // Store audio analyzers for each participant
  const remoteAudioRefs = useRef({}); // Store remote audio elements for muting during screen share
  const remoteVideoRefs = useRef({}); // Store remote video elements for muting during screen share

  // Screen share overlay controls — keyed by participant ID for independent state
  const [screenState, setScreenState] = useState({});
  const controlsTimeoutRef = useRef({});
  const wasFullscreenRef = useRef(false);
  const controlsStateRef = useRef({});

  // Reactive mobile detection (updates on resize/rotation)
  const [isMobileState, setIsMobileState] = useState(window.innerWidth < 768);

  const code = window.location.pathname.split("/").pop();

  // Audio context for sound effects
  const playSound = (frequency, duration, type = 'join') => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      // Envelope for smoother sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);

      // Cleanup
      setTimeout(() => {
        audioContext.close();
      }, duration * 1000 + 100);
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  };

  const playJoinSound = () => {
    // Pleasant ascending tone
    playSound(523.25, 0.15); // C5
    setTimeout(() => playSound(659.25, 0.15), 80); // E5
  };

  const playLeaveSound = () => {
    // Gentle descending tone
    playSound(659.25, 0.15); // E5
    setTimeout(() => playSound(523.25, 0.15), 80); // C5
  };

  // Audio detection for speaking indicator
  const setupAudioDetection = (stream, userId) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioSource.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Debouncing variables
      let lastSpeakingState = false;
      let speakingStartTime = 0;
      let silenceStartTime = 0;
      const SPEAKING_THRESHOLD = 20; // Audio level threshold
      const MIN_SPEAKING_DURATION = 200; // Must speak for 200ms to trigger
      const MIN_SILENCE_DURATION = 300; // Must be silent for 300ms to stop

      // Store analyzer for cleanup
      audioAnalyzersRef.current[userId] = { audioContext, analyser };

      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        
        const currentTime = Date.now();
        const isCurrentlySpeaking = average > SPEAKING_THRESHOLD;
        
        // Debounce logic to prevent flickering
        if (isCurrentlySpeaking && !lastSpeakingState) {
          // Started speaking
          if (speakingStartTime === 0) {
            speakingStartTime = currentTime;
          } else if (currentTime - speakingStartTime >= MIN_SPEAKING_DURATION) {
            // Confirmed speaking after minimum duration
            lastSpeakingState = true;
            silenceStartTime = 0;
            
            setSpeakingUsers(prev => {
              if (prev[userId] !== true) {
                // Broadcast speaking status to other users (only for self)
                if (userId === 'self' && socketRef.current) {
                  socketRef.current.emit('speaking-status-changed', {
                    roomCode: code.toUpperCase(),
                    isSpeaking: true
                  });
                }
                return { ...prev, [userId]: true };
              }
              return prev;
            });
          }
        } else if (!isCurrentlySpeaking && lastSpeakingState) {
          // Started silence
          if (silenceStartTime === 0) {
            silenceStartTime = currentTime;
          } else if (currentTime - silenceStartTime >= MIN_SILENCE_DURATION) {
            // Confirmed silence after minimum duration
            lastSpeakingState = false;
            speakingStartTime = 0;
            
            setSpeakingUsers(prev => {
              if (prev[userId] !== false) {
                // Broadcast speaking status to other users (only for self)
                if (userId === 'self' && socketRef.current) {
                  socketRef.current.emit('speaking-status-changed', {
                    roomCode: code.toUpperCase(),
                    isSpeaking: false
                  });
                }
                return { ...prev, [userId]: false };
              }
              return prev;
            });
          }
        } else if (isCurrentlySpeaking && lastSpeakingState) {
          // Continue speaking - reset silence timer
          silenceStartTime = 0;
        } else if (!isCurrentlySpeaking && !lastSpeakingState) {
          // Continue silence - reset speaking timer
          speakingStartTime = 0;
        }

        // Continue checking
        if (audioAnalyzersRef.current[userId]) {
          requestAnimationFrame(checkAudioLevel);
        }
      };

      checkAudioLevel();
    } catch (err) {
      console.error('Error setting up audio detection:', err);
    }
  };

  // Cleanup audio analyzer
  const cleanupAudioDetection = (userId) => {
    if (audioAnalyzersRef.current[userId]) {
      try {
        audioAnalyzersRef.current[userId].audioContext.close();
      } catch (err) {
        console.error('Error closing audio context:', err);
      }
      delete audioAnalyzersRef.current[userId];
    }
    setSpeakingUsers(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  };

  // Inject custom scrollbar styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = scrollbarStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Auto-hide footer after 4 seconds of inactivity
  useEffect(() => {
    const startTimer = () => {
      clearTimeout(footerTimerRef.current);
      footerTimerRef.current = setTimeout(() => {
        setFooterVisible(false);
      }, 4000);
    };

    // Start the initial timer
    startTimer();

    // Reset timer only on touch and keyboard — NOT mouse movement
    const resetTimer = () => {
      setFooterVisible(true);
      startTimer();
    };

    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('keydown', resetTimer);

    return () => {
      clearTimeout(footerTimerRef.current);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, []);

  // Fetch current user info on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found");
          navigate("/");
          return;
        }

        const userData = await authAPI.getProfile();
        console.log("✅ Fetched current user:", userData.data || userData);
        const user = userData.data || userData;
        setCurrentUser(user);
        currentUserRef.current = user;
        setIsUserReady(true);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        navigate("/");
      }
    };

    fetchCurrentUser();
  }, []);

  // Timer management - load saved time and start timer
  useEffect(() => {
    // Set page title
    document.title = "Conference - Confera";
    
    // Load saved timer from localStorage
    const savedTimer = localStorage.getItem(`meeting_timer_${code}`);
    if (savedTimer) {
      setSessionTimer(parseInt(savedTimer, 10));
    }

    // Start timer when component mounts
    setIsTimerRunning(true);

    return () => {
      // Pause timer and save when leaving
      setIsTimerRunning(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [code]);

  // Timer interval effect
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setSessionTimer(prev => {
          const newTime = prev + 1;
          // Save to localStorage every second
          localStorage.setItem(`meeting_timer_${code}`, newTime.toString());
          return newTime;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning, code]);

  // Get initials from name
  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "U";
  };

  // Format timer display (HH:MM:SS)
  const formatTimer = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup media tracks on page unload/navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log("🛑 Stopped track:", track.kind);
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also cleanup when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log("🛑 Stopped track on unmount:", track.kind);
        });
      }
    };
  }, [stream]);

  // Show notification helper
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Monitor remote streams changes
  useEffect(() => {
    console.log("🔄 Remote streams updated:", Object.keys(remoteStreams));
    console.log("🔄 Number of remote streams:", Object.keys(remoteStreams).length);
    
    // Log details of each stream
    Object.entries(remoteStreams).forEach(([id, stream]) => {
      console.log(`📺 Stream ${id}:`, {
        streamId: stream?.id,
        tracks: stream?.getTracks().map(t => ({
          kind: t.kind,
          id: t.id,
          enabled: t.enabled,
          readyState: t.readyState,
          muted: t.muted
        }))
      });
    });
    
    setDebugInfo(prev => ({
      ...prev,
      remoteStreamsCount: Object.keys(remoteStreams).length,
      peersCount: Object.keys(peersRef.current).length
    }));
  }, [remoteStreams]);

  // Keep ref in sync with state — used by socket effect to avoid re-running it on name changes
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    // Don't start socket connection until we have current user
    if (!currentUserRef.current) return;
    // Connect to socket.io through the same origin (will use proxy)
    socketRef.current = io(SOCKET_URL || undefined, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      setDebugInfo(prev => ({ ...prev, socketConnected: true }));
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      setDebugInfo(prev => ({ ...prev, socketConnected: false }));
    });

    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);
      setError(error.message || "Failed to connect to assembly");
      setIsLoading(false);
    });

    const start = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        // Store original camera/mic stream in ref so it's always accessible
        originalMediaStreamRef.current = media;

        // Disable camera and mic by default
        media.getVideoTracks().forEach(track => track.enabled = false);
        media.getAudioTracks().forEach(track => track.enabled = false);

        if (videoRef.current) {
          videoRef.current.srcObject = media;
        }
        updateStream(media);
        
        // Set up audio detection for self
        setupAudioDetection(media, 'self');
        
        setIsLoading(false);

        // Join the room with user info
        const userInfo = {
          userId: currentUserRef.current.id || currentUserRef.current._id,
          name: currentUserRef.current.name,
          username: currentUserRef.current.username,
          profilePic: currentUserRef.current.profilePic || ""
        };
        
        // Normalize room code to uppercase for consistency with backend
        const normalizedCode = code.toUpperCase();
        
        // Verify session exists before joining via socket
        try {
          const sessionRes = await sessionAPI.getSession(normalizedCode);
          if (!sessionRes || !sessionRes.data) {
            setError("Assembly session not found");
            setIsLoading(false);
            return;
          }
          
          // Check if user is host
          const session = sessionRes.data;
          const isUserHost = session.hostId._id === (currentUserRef.current.id || currentUserRef.current._id) || 
                            session.hostId === (currentUserRef.current.id || currentUserRef.current._id);
          setIsHost(isUserHost);
          setIsLocked(session.isLocked || false);
          
          // If host and meeting is locked, store the password
          if (isUserHost && session.isLocked && session.password) {
            setRevealedPassword(session.password);
          }
          
          console.log("Session info:", { isHost: isUserHost, isLocked: session.isLocked });
        } catch (sessionErr) {
          console.error("Session verification failed:", sessionErr);
          setError(sessionErr.message || "Assembly session not found or has ended");
          setIsLoading(false);
          return;
        }

        socket.emit("join-room", { roomCode: normalizedCode, userInfo });
        console.log("Joined room:", normalizedCode, "with user info:", userInfo);

        // Handle existing users in the room
        socket.on("existing-users", (users) => {
          console.log("👥 ========== EXISTING USERS EVENT RECEIVED ==========");
          console.log("👥 Existing users in room:", users);
          console.log("👥 Number of existing users:", users.length);
          console.log("👥 My socket ID:", socket.id);
          console.log("👥 Users details:", JSON.stringify(users, null, 2));
          
          users.forEach(async (user) => {
            const socketId = user.socketId;
            const userInfo = user.userInfo;
            const isCameraOn = user.isCameraOn || false;
            const isMicOn = user.isMicOn || false;
            const isScreenSharing = user.isScreenSharing || false;
            
            console.log("📋 Existing user:", socketId, userInfo);
            
            // Use originalMediaStreamRef or media
            const myStream = originalMediaStreamRef.current || media;
            console.log("📋 Creating offer to existing user with my stream:", {
              hasOriginalStream: !!originalMediaStreamRef.current,
              hasMedia: !!media,
              hasStream: !!myStream,
              streamTracks: myStream?.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled }))
            });
            
            if (!myStream) {
              console.error("❌ No media stream available to create offer!");
              return;
            }
            
            // Store participant info
            setParticipants(prev => ({
              ...prev,
              [socketId]: userInfo
            }));
            
            // Store media status
            setParticipantMediaStatus(prev => ({
              ...prev,
              [socketId]: { isCameraOn, isMicOn, isScreenSharing }
            }));
            
            if (peersRef.current[socketId]) {
              console.log("⚠️ Peer already exists for:", socketId);
              return;
            }

            // Create peer and send offer to existing user
            const peer = createPeer(socketId, myStream, socket);
            peersRef.current[socketId] = peer;

            try {
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
              console.log("📤 Sending offer to existing user:", socketId);
              socket.emit("offer", { offer, to: socketId, room: code });
            } catch (err) {
              console.error("Error creating offer for existing user:", err);
            }
          });
        });

        // When a new user joins the room
        socket.on("user-joined", async (data) => {
          const socketId = data.socketId;
          const userInfo = data.userInfo;
          const isCameraOn = data.isCameraOn || false;
          const isMicOn = data.isMicOn || false;
          const isScreenSharing = data.isScreenSharing || false;
          
          console.log("🟢 User joined:", socketId, userInfo);
          
          showNotification(`${userInfo.name} joined the assembly`, "success");
          playJoinSound(); // Play join sound
          
          // Store participant info
          setParticipants(prev => ({
            ...prev,
            [socketId]: userInfo
          }));
          
          // Store media status
          setParticipantMediaStatus(prev => ({
            ...prev,
            [socketId]: { isCameraOn, isMicOn, isScreenSharing }
          }));
          
          // If we're currently screen sharing, send our screen share to the new user
          // Use refs instead of state to avoid stale closure issues
          if (screenStreamRef.current && screenSocketIdRef.current) {
            console.log("📤 Sending screen share to new user:", socketId);
            console.log("📤 Screen share state:", { 
              hasScreenStream: !!screenStreamRef.current,
              screenSocketId: screenSocketIdRef.current 
            });
            
            const screenPeer = createScreenPeer(socketId, screenStreamRef.current, socketRef.current);
            screenPeerRef.current[socketId] = screenPeer;
            
            // Apply bandwidth optimization for screen share
            const senders = screenPeer.getSenders();
            senders.forEach(sender => {
              if (sender.track && sender.track.kind === 'video') {
                const parameters = sender.getParameters();
                if (!parameters.encodings) {
                  parameters.encodings = [{}];
                }
                // Adaptive bitrate: 2.5 Mbps for high quality, can scale down
                parameters.encodings[0].maxBitrate = 2500000; // 2.5 Mbps
                // Enable degradation preference for better quality on poor networks
                if ('degradationPreference' in parameters.encodings[0]) {
                  parameters.encodings[0].degradationPreference = 'maintain-framerate';
                }
                sender.setParameters(parameters)
                  .then(() => console.log("✅ Screen share video bitrate set to 2.5 Mbps for new user:", socketId))
                  .catch(err => console.error("❌ Error setting video bitrate:", err));
              }
              // AUDIO QUALITY IMPROVEMENT: Increase audio bitrate for screen share
              if (sender.track && sender.track.kind === 'audio') {
                const parameters = sender.getParameters();
                if (!parameters.encodings) {
                  parameters.encodings = [{}];
                }
                // Set high bitrate for screen share audio (music, videos)
                parameters.encodings[0].maxBitrate = 128000; // 128 kbps for high quality audio
                sender.setParameters(parameters)
                  .then(() => console.log("✅ Screen share audio bitrate set to 128 kbps for new user:", socketId))
                  .catch(err => console.error("❌ Error setting audio bitrate:", err));
              }
            });
            
            try {
              const offer = await screenPeer.createOffer();
              
              // AUDIO QUALITY IMPROVEMENT: Enable stereo and high bitrate in SDP
              offer.sdp = offer.sdp.replace(
                /useinbandfec=1/g,
                "useinbandfec=1; stereo=1; maxaveragebitrate=128000"
              );
              console.log("✅ SDP modified for stereo audio and high bitrate");
              
              await screenPeer.setLocalDescription(offer);
              console.log("📤 Sending screen share offer to new user:", socketId);
              socketRef.current.emit("screen-offer", { 
                offer, 
                to: socketId, 
                from: socketRef.current.id, // Use real socket ID, not dummy
                screenSocketId: screenSocketIdRef.current, // Send dummy ID for UI tracking
                room: code 
              });
            } catch (err) {
              console.error("Error creating screen share offer for new user:", err);
            }
          } else {
            console.log("📤 Not sending screen share to new user:", {
              hasScreenStream: !!screenStreamRef.current,
              hasScreenSocketId: !!screenSocketIdRef.current
            });
          }
          
          // DON'T create peer here - wait for them to send us an offer
          // The new joiner will create offers to all existing users
          console.log("⏳ Waiting for offer from new user:", socketId);
        });

        // When receiving an offer from another user
        socket.on("offer", async ({ offer, from }) => {
          console.log("📥 ========== OFFER RECEIVED ==========");
          console.log("📥 Received offer from:", from);
          console.log("📥 My socket ID:", socket.id);
          console.log("📥 Current state:", {
            isScreenSharing,
            hasOriginalStream: !!originalMediaStreamRef.current,
            hasStream: !!stream,
            originalStreamTracks: originalMediaStreamRef.current?.getTracks().map(t => ({ 
              kind: t.kind, 
              enabled: t.enabled, 
              readyState: t.readyState 
            })),
            streamTracks: stream?.getTracks().map(t => ({ 
              kind: t.kind, 
              enabled: t.enabled, 
              readyState: t.readyState 
            }))
          });
          
          const existingPeer = peersRef.current[from];
          
          console.log("📥 Existing peer state:", {
            exists: !!existingPeer,
            signalingState: existingPeer?.signalingState,
            connectionState: existingPeer?.connectionState,
            iceConnectionState: existingPeer?.iceConnectionState
          });
          
          // GLARE HANDLING: If we have a peer in "have-local-offer" state, we have a glare condition
          // Both peers sent offers simultaneously. Resolve by comparing socket IDs.
          if (existingPeer && existingPeer.signalingState === 'have-local-offer') {
            console.log("⚠️ GLARE DETECTED! Both peers sent offers simultaneously");
            console.log("⚠️ My socket ID:", socket.id, "Their socket ID:", from);
            
            // Use lexicographic comparison to decide who wins
            // The peer with the "smaller" socket ID becomes the offerer, the other becomes answerer
            if (socket.id < from) {
              console.log("✅ I win the glare - keeping my offer, ignoring theirs");
              // Ignore their offer, wait for them to process our offer and send an answer
              return;
            } else {
              console.log("✅ They win the glare - discarding my offer, processing theirs");
              // Close our peer and create a new one to process their offer
              try {
                existingPeer.close();
              } catch (e) {
                console.error("Error closing peer during glare resolution:", e);
              }
              delete peersRef.current[from];
              // Continue to create new peer and process their offer below
            }
          }
          
          // Check if this is a renegotiation (peer already exists and is connected)
          if (existingPeer && existingPeer.connectionState !== 'closed' && existingPeer.signalingState !== 'have-local-offer') {
            console.log("� Renegotiation offer received from:", from);
            try {
              await existingPeer.setRemoteDescription(new RTCSessionDescription(offer));
              console.log("✅ Set remote description for renegotiation");
              
              const answer = await existingPeer.createAnswer();
              await existingPeer.setLocalDescription(answer);
              console.log("📤 Sending renegotiation answer to:", from);
              socket.emit("answer", { answer, to: from, room: code });
            } catch (err) {
              console.error("Error handling renegotiation offer:", err);
            }
            return;
          }
          
          // If peer exists but is closed, clean it up
          if (existingPeer) {
            console.log("⚠️ Peer exists but is closed, recreating for:", from);
            try {
              existingPeer.close();
            } catch (e) {
              console.error("Error closing old peer:", e);
            }
            delete peersRef.current[from];
          }

          // Create new peer connection - ALWAYS use camera/mic stream for regular peers
          // Screen share uses separate peer connections
          // IMPORTANT: Use originalMediaStreamRef to get the original camera/mic stream
          // even if we're currently screen sharing
          const cameraStream = originalMediaStreamRef.current || media;
          
          // CRITICAL VALIDATION: Ensure camera stream exists
          if (!cameraStream) {
            console.error("❌ CRITICAL: No camera stream available to create peer!");
            console.error("❌ originalMediaStreamRef.current:", originalMediaStreamRef.current);
            console.error("❌ media:", media);
            console.error("❌ stream:", stream);
            return;
          }
          
          console.log("📹 Creating peer with camera stream:", {
            hasOriginalStream: !!originalMediaStreamRef.current,
            hasMedia: !!media,
            streamTracks: cameraStream?.getTracks().map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled, readyState: t.readyState }))
          });
          const peer = createPeer(from, cameraStream, socket);
          peersRef.current[from] = peer;

          try {
            await peer.setRemoteDescription(new RTCSessionDescription(offer));
            console.log("✅ Set remote description from offer");
            
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            console.log("� Sending answer to:", from);
            socket.emit("answer", { answer, to: from, room: code });
            
            // Process queued ICE candidates
            if (iceCandidatesQueue.current[from]) {
              console.log("📦 Processing", iceCandidatesQueue.current[from].length, "queued ICE candidates for:", from);
              for (const candidate of iceCandidatesQueue.current[from]) {
                try {
                  await peer.addIceCandidate(new RTCIceCandidate(candidate));
                  console.log("✅ Added queued ICE candidate");
                } catch (err) {
                  console.error("Error adding queued ICE candidate:", err);
                }
              }
              iceCandidatesQueue.current[from] = [];
            }
            
            console.log("📥 ========== OFFER PROCESSING COMPLETE ==========");
          } catch (err) {
            console.error("❌ Error handling offer:", err);
            console.error("❌ Error name:", err.name);
            console.error("❌ Error message:", err.message);
            console.error("❌ Error stack:", err.stack);
          }
        });

        // When receiving an answer
        socket.on("answer", async ({ answer, from }) => {
          console.log("📥 Received answer from:", from);
          
          const peer = peersRef.current[from];
          if (!peer) {
            console.error("❌ No peer found for:", from);
            return;
          }
          
          console.log("📥 Peer signaling state:", peer.signalingState);
          
          // If peer is already stable, check if we actually have media flowing
          if (peer.signalingState === "stable") {
            console.log("⚠️ Peer already stable when answer arrived");
            console.log("⚠️ Checking if media is flowing...");
            
            const receivers = peer.getReceivers();
            const hasMedia = receivers.some(r => r.track && r.track.readyState === 'live');
            
            console.log("⚠️ Receivers:", receivers.length);
            console.log("⚠️ Has live media:", hasMedia);
            
            if (hasMedia) {
              console.log("✅ Media is flowing, ignoring answer");
              return;
            } else {
              console.log("❌ No media flowing despite stable state - this is the bug!");
              console.log("❌ Closing peer and will recreate on next offer");
              
              // Close the broken peer
              try {
                peer.close();
              } catch (e) {
                console.error("Error closing peer:", e);
              }
              delete peersRef.current[from];
              
              // Remove from remote streams
              setRemoteStreams(prev => {
                const updated = { ...prev };
                delete updated[from];
                return updated;
              });
              
              return;
            }
          }
          
          // If we're in "have-remote-offer", it means we lost a glare
          // and are processing their offer. The answer is for our old offer which we discarded.
          if (peer.signalingState === "have-remote-offer") {
            console.log("ℹ️ Ignoring answer - we lost a glare and discarded our offer");
            return;
          }
          
          // Only process answer if we're in "have-local-offer" state
          if (peer.signalingState !== "have-local-offer") {
            console.warn("⚠️ Unexpected peer state for answer:", peer.signalingState);
            return;
          }
          
          try {
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
            console.log("✅ Set remote description for:", from);
            
            // Process queued ICE candidates
            if (iceCandidatesQueue.current[from]) {
              console.log("📦 Processing", iceCandidatesQueue.current[from].length, "queued ICE candidates for:", from);
              for (const candidate of iceCandidatesQueue.current[from]) {
                try {
                  await peer.addIceCandidate(new RTCIceCandidate(candidate));
                  console.log("✅ Added queued ICE candidate");
                } catch (err) {
                  console.error("Error adding queued ICE candidate:", err);
                }
              }
              iceCandidatesQueue.current[from] = [];
            }
          } catch (err) {
            console.error("❌ Error setting remote description:", err);
            console.error("❌ Peer state was:", peer.signalingState);
          }
        });

        // When receiving ICE candidates
        socket.on("ice-candidate", async ({ candidate, from }) => {
          console.log("🧊 Received ICE candidate from:", from);
          
          const peer = peersRef.current[from];
          if (!peer) {
            console.error("❌ No peer found for ICE candidate from:", from);
            // Queue the candidate for later
            if (!iceCandidatesQueue.current[from]) {
              iceCandidatesQueue.current[from] = [];
            }
            iceCandidatesQueue.current[from].push(candidate);
            console.log("📦 Queued ICE candidate for:", from);
            return;
          }
          
          // Check if remote description is set
          if (!peer.remoteDescription || !peer.remoteDescription.type) {
            console.log("⏳ Remote description not set yet, queuing ICE candidate");
            if (!iceCandidatesQueue.current[from]) {
              iceCandidatesQueue.current[from] = [];
            }
            iceCandidatesQueue.current[from].push(candidate);
            return;
          }
          
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("✅ Added ICE candidate from:", from);
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        });

        // When a user leaves
        socket.on("user-left", (data) => {
          const socketId = data.socketId;
          const userInfo = data.userInfo;
          
          console.log("🔴 User left:", socketId, userInfo);
          
          showNotification(`${userInfo?.name || "A participant"} left the assembly`, "info");
          playLeaveSound(); // Play leave sound
          
          // Clean up audio detection
          cleanupAudioDetection(socketId);
          
          // Remove participant info
          setParticipants(prev => {
            const updated = { ...prev };
            delete updated[socketId];
            return updated;
          });
          
          // Close and remove peer connection
          if (peersRef.current[socketId]) {
            console.log("🗑️ Closing peer connection for:", socketId);
            try {
              peersRef.current[socketId].close();
            } catch (err) {
              console.error("Error closing peer:", err);
            }
            delete peersRef.current[socketId];
          }
          
          // Remove from remote streams
          setRemoteStreams(prev => {
            const updated = { ...prev };
            delete updated[socketId];
            console.log("🗑️ Removed stream for:", socketId, "Remaining streams:", Object.keys(updated).length);
            return updated;
          });
          
          // Update debug info
          setDebugInfo(prev => ({
            ...prev,
            peersCount: Object.keys(peersRef.current).length,
            remoteStreamsCount: Object.keys(remoteStreams).length - 1
          }));
        });

        // Chat message handler
        socket.on("chat-message", (data) => {
          console.log("💬 Received chat message:", data);
          setMessages(prev => [...prev, data]);
          
          // Increment unread count if chat is closed
          if (!showChat) {
            setUnreadCount(prev => prev + 1);
          }
        });

        // Listen for ping broadcasts from other users
        socket.on("user-ping-update", ({ socketId, ping }) => {
          console.log("📡 Received ping update:", socketId, ping);
          setUserPings(prev => ({
            ...prev,
            [socketId]: ping
          }));
        });

        // Listen for media status changes from other participants
        socket.on("user-media-status-changed", ({ socketId, isCameraOn, isMicOn, isScreenSharing }) => {
          console.log("📹 Media status changed:", socketId, { isCameraOn, isMicOn, isScreenSharing });
          setParticipantMediaStatus(prev => ({
            ...prev,
            [socketId]: { isCameraOn, isMicOn, isScreenSharing }
          }));
        });

        // Listen for speaking status changes from other participants
        socket.on("user-speaking-status-changed", ({ socketId, isSpeaking }) => {
          console.log("🎤 Speaking status changed:", socketId, isSpeaking);
          setSpeakingUsers(prev => ({
            ...prev,
            [socketId]: isSpeaking
          }));
        });

        // Listen for real-time name/profilePic updates from other participants
        socket.on("user-info-updated", ({ socketId, name, profilePic }) => {
          console.log("✏️ User info updated:", socketId, name);
          setParticipants(prev => {
            if (!prev[socketId]) return prev;
            return {
              ...prev,
              [socketId]: { ...prev[socketId], name, profilePic }
            };
          });
          // If it's our own update, refresh currentUser display
          if (socketId === socket.id) {
            setCurrentUser(prev => {
              const updated = prev ? { ...prev, name, profilePic } : prev;
              currentUserRef.current = updated;
              return updated;
            });
          }
        });

        // Listen for screen share started
        socket.on("screen-share-started", async ({ socketId, screenSocketId, userInfo }) => {
          console.log("🖥️ ========== SCREEN SHARE STARTED EVENT ==========");
          console.log("🖥️ Screen share started by:", socketId, "Screen ID:", screenSocketId);
          console.log("🖥️ Screen share user info:", userInfo);
          console.log("🖥️ My socket ID:", socket.id);
          console.log("🖥️ Is this my own screen share?", socketId === socket.id);
          
          // Don't add our own screen share as a remote participant
          if (socketId === socket.id) {
            console.log("⏭️ Skipping own screen share participant (already added locally)");
            return;
          }
          
          console.log("✅ Adding remote screen share participant");
          
          // Store screen share participant info
          setParticipants(prev => ({
            ...prev,
            [screenSocketId]: userInfo
          }));
          
          // Mark as screen sharing
          setParticipantMediaStatus(prev => ({
            ...prev,
            [screenSocketId]: { isCameraOn: false, isMicOn: false, isScreenSharing: true }
          }));
          
          showNotification(`${userInfo.name} started sharing`, "info");
        });

        // Listen for screen share stopped
        socket.on("screen-share-stopped", ({ socketId, screenSocketId }) => {
          console.log("🖥️ Screen share stopped by:", socketId, "Screen ID:", screenSocketId);
          
          // Remove screen share participant
          setParticipants(prev => {
            const updated = { ...prev };
            delete updated[screenSocketId];
            return updated;
          });
          
          // Close screen peer connection
          if (peersRef.current[screenSocketId]) {
            try {
              peersRef.current[screenSocketId].close();
            } catch (e) {
              console.error("Error closing screen peer:", e);
            }
            delete peersRef.current[screenSocketId];
          }
          
          // Remove from remote streams
          setRemoteStreams(prev => {
            const updated = { ...prev };
            delete updated[screenSocketId];
            return updated;
          });
        });

        // Listen for being removed from meeting
        socket.on("removed-from-meeting", ({ message }) => {
          console.log("🚫 Removed from assembly:", message);
          showNotification(message, "error");
          
          // Disconnect and leave
          setTimeout(() => {
            leaveMeeting();
          }, 2000);
        });

        // Listen for participant removed (for other participants)
        socket.on("participant-removed", ({ socketId }) => {
          console.log("🚫 Participant removed:", socketId);
          
          // Remove participant
          setParticipants(prev => {
            const updated = { ...prev };
            delete updated[socketId];
            return updated;
          });
          
          // Close peer connection
          if (peersRef.current[socketId]) {
            try {
              peersRef.current[socketId].close();
            } catch (e) {
              console.error("Error closing peer:", e);
            }
            delete peersRef.current[socketId];
          }
          
          // Remove from remote streams
          setRemoteStreams(prev => {
            const updated = { ...prev };
            delete updated[socketId];
            return updated;
          });
        });

        // Listen for screen share offers
        socket.on("screen-offer", async ({ offer, from, screenSocketId }) => {
          console.log("═══════════════════════════════════════════════════");
          console.log("📥 RECEIVED SCREEN SHARE OFFER");
          console.log("═══════════════════════════════════════════════════");
          console.log("📥 From:", from);
          console.log("📥 Screen socket ID:", screenSocketId);
          console.log("📥 Offer type:", offer.type);
          
          // STEP 1: Create peer connection BEFORE processing offer
          console.log("🔧 Step 1: Creating screen share peer connection...");
          const peer = createScreenPeer(from, null, socket, screenSocketId);
          screenPeerRef.current[from] = peer;
          console.log("✅ Peer created and stored in screenPeerRef");

          try {
            // STEP 2: Set remote description (offer)
            console.log("🔧 Step 2: Setting remote description (offer)...");
            console.log("🔧 Peer signaling state before:", peer.signalingState);
            
            await peer.setRemoteDescription(new RTCSessionDescription(offer));
            
            console.log("✅ Remote description set successfully");
            console.log("✅ Peer signaling state after:", peer.signalingState);
            
            // STEP 3: Process queued ICE candidates
            console.log("🔧 Step 3: Processing queued ICE candidates...");
            if (screenIceCandidatesQueue.current[from] && screenIceCandidatesQueue.current[from].length > 0) {
              console.log("📦 Found", screenIceCandidatesQueue.current[from].length, "queued ICE candidates");
              
              for (const candidate of screenIceCandidatesQueue.current[from]) {
                try {
                  await peer.addIceCandidate(new RTCIceCandidate(candidate));
                  console.log("✅ Added queued ICE candidate:", candidate.type || 'unknown');
                } catch (err) {
                  console.error("❌ Error adding queued ICE candidate:", err);
                }
              }
              
              // Clear the queue
              screenIceCandidatesQueue.current[from] = [];
              console.log("✅ All queued ICE candidates processed and queue cleared");
            } else {
              console.log("📦 No queued ICE candidates to process");
            }
            
            // STEP 4: Create answer
            console.log("🔧 Step 4: Creating answer...");
            const answer = await peer.createAnswer();
            console.log("✅ Answer created");
            
            // STEP 5: Set local description (answer)
            console.log("🔧 Step 5: Setting local description (answer)...");
            await peer.setLocalDescription(answer);
            console.log("✅ Local description set");
            console.log("✅ Peer signaling state:", peer.signalingState);
            
            // STEP 6: Send answer
            console.log("🔧 Step 6: Sending answer to:", from);
            socket.emit("screen-answer", { answer, to: from, room: code });
            console.log("✅ Answer sent successfully");
            
            console.log("═══════════════════════════════════════════════════");
            console.log("✅ SCREEN SHARE OFFER PROCESSING COMPLETE");
            console.log("═══════════════════════════════════════════════════");
            
          } catch (err) {
            console.error("═══════════════════════════════════════════════════");
            console.error("❌ ERROR HANDLING SCREEN SHARE OFFER");
            console.error("═══════════════════════════════════════════════════");
            console.error("❌ Error:", err);
            console.error("❌ Error name:", err.name);
            console.error("❌ Error message:", err.message);
            console.error("❌ Peer signaling state:", peer?.signalingState);
            console.error("❌ Peer connection state:", peer?.connectionState);
            console.error("═══════════════════════════════════════════════════");
          }
        });

        // Listen for screen share answers
        socket.on("screen-answer", async ({ answer, from }) => {
          console.log("═══════════════════════════════════════════════════");
          console.log("📥 RECEIVED SCREEN SHARE ANSWER");
          console.log("═══════════════════════════════════════════════════");
          console.log("📥 From:", from);
          console.log("📥 Answer type:", answer.type);
          
          const peer = screenPeerRef.current[from];
          
          if (!peer) {
            console.error("❌ No screen peer found for:", from);
            console.error("❌ Available screen peers:", Object.keys(screenPeerRef.current));
            return;
          }
          
          console.log("✅ Found screen peer for:", from);
          console.log("🔧 Peer signaling state before:", peer.signalingState);
          console.log("🔧 Peer connection state:", peer.connectionState);
          
          // Check if we're in the correct state to receive answer
          if (peer.signalingState !== "have-local-offer") {
            console.warn("⚠️ Unexpected signaling state:", peer.signalingState);
            console.warn("⚠️ Expected: have-local-offer");
            
            if (peer.signalingState === "stable") {
              console.log("ℹ️ Peer already stable, ignoring answer");
              return;
            }
          }
          
          try {
            // STEP 1: Set remote description (answer)
            console.log("🔧 Step 1: Setting remote description (answer)...");
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
            console.log("✅ Remote description set successfully");
            console.log("✅ Peer signaling state after:", peer.signalingState);
            
            // STEP 2: Process queued ICE candidates
            console.log("🔧 Step 2: Processing queued ICE candidates...");
            if (screenIceCandidatesQueue.current[from] && screenIceCandidatesQueue.current[from].length > 0) {
              console.log("📦 Found", screenIceCandidatesQueue.current[from].length, "queued ICE candidates");
              
              for (const candidate of screenIceCandidatesQueue.current[from]) {
                try {
                  await peer.addIceCandidate(new RTCIceCandidate(candidate));
                  console.log("✅ Added queued ICE candidate:", candidate.type || 'unknown');
                } catch (err) {
                  console.error("❌ Error adding queued ICE candidate:", err);
                }
              }
              
              // Clear the queue
              screenIceCandidatesQueue.current[from] = [];
              console.log("✅ All queued ICE candidates processed and queue cleared");
            } else {
              console.log("📦 No queued ICE candidates to process");
            }
            
            console.log("═══════════════════════════════════════════════════");
            console.log("✅ SCREEN SHARE ANSWER PROCESSING COMPLETE");
            console.log("═══════════════════════════════════════════════════");
            
          } catch (err) {
            console.error("═══════════════════════════════════════════════════");
            console.error("❌ ERROR SETTING SCREEN SHARE REMOTE DESCRIPTION");
            console.error("═══════════════════════════════════════════════════");
            console.error("❌ Error:", err);
            console.error("❌ Error name:", err.name);
            console.error("❌ Error message:", err.message);
            console.error("❌ Peer signaling state:", peer.signalingState);
            console.error("❌ Peer connection state:", peer.connectionState);
            console.error("═══════════════════════════════════════════════════");
          }
        });

        // Listen for screen share ICE candidates
        socket.on("screen-ice-candidate", async ({ candidate, from }) => {
          console.log("🧊 ═══════════════════════════════════════════════");
          console.log("🧊 RECEIVED SCREEN SHARE ICE CANDIDATE");
          console.log("🧊 ═══════════════════════════════════════════════");
          console.log("🧊 From:", from);
          console.log("🧊 Candidate type:", candidate.type || 'unknown');
          
          const peer = screenPeerRef.current[from];
          
          // CASE 1: Peer doesn't exist yet - queue the candidate
          if (!peer) {
            console.warn("⚠️ No screen peer found for:", from);
            console.warn("⚠️ Available screen peers:", Object.keys(screenPeerRef.current));
            console.log("📦 Queuing ICE candidate for later...");
            
            if (!screenIceCandidatesQueue.current[from]) {
              screenIceCandidatesQueue.current[from] = [];
            }
            screenIceCandidatesQueue.current[from].push(candidate);
            
            console.log("📦 Candidate queued. Queue size:", screenIceCandidatesQueue.current[from].length);
            console.log("🧊 ═══════════════════════════════════════════════");
            return;
          }
          
          console.log("✅ Found screen peer for:", from);
          console.log("🔧 Peer signaling state:", peer.signalingState);
          console.log("🔧 Remote description set:", !!peer.remoteDescription);
          
          // CASE 2: Remote description not set yet - queue the candidate
          if (!peer.remoteDescription || !peer.remoteDescription.type) {
            console.log("⏳ Remote description not set yet");
            console.log("📦 Queuing ICE candidate until remote description is set...");
            
            if (!screenIceCandidatesQueue.current[from]) {
              screenIceCandidatesQueue.current[from] = [];
            }
            screenIceCandidatesQueue.current[from].push(candidate);
            
            console.log("📦 Candidate queued. Queue size:", screenIceCandidatesQueue.current[from].length);
            console.log("🧊 ═══════════════════════════════════════════════");
            return;
          }
          
          // CASE 3: Peer ready - add candidate immediately
          console.log("✅ Peer ready, adding ICE candidate immediately...");
          
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("✅ ✅ ✅ ICE CANDIDATE ADDED SUCCESSFULLY");
            console.log("✅ Candidate type:", candidate.type || 'unknown');
            
            if (candidate.type === 'relay') {
              console.log("🎯 RELAY candidate added - excellent for cross-network!");
            }
            
          } catch (err) {
            console.error("❌ Error adding screen share ICE candidate:", err);
          }
          
          console.log("🧊 ═══════════════════════════════════════════════");
        });
      } catch (err) {
        console.error("Error accessing media devices:", err);
        
        let errorMessage = "Unable to access your camera and microphone. ";
        
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errorMessage += "Grant permission to continue. Don't worry about camera and mic, both will remain disabled until you turn them on.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          errorMessage += "No camera or microphone detected on your device.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          errorMessage += "Your camera or microphone is currently being used by another application.";
        } else if (err.name === "OverconstrainedError") {
          errorMessage += "Your device doesn't meet the required media constraints.";
        } else {
          errorMessage += "Verify your device settings and try again.";
        }
        
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    start();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      Object.values(peersRef.current).forEach(peer => {
        try {
          peer.close();
        } catch (e) {
          console.error("Error closing peer:", e);
        }
      });
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isUserReady]);

  function createPeer(remoteId, media, socket) {
    console.log("🔧 Creating peer connection for:", remoteId);
    console.log("🔧 Media stream:", media, "Tracks:", media?.getTracks().length);
    
    // Check for force relay mode (for testing TURN)
    const forceRelay = localStorage.getItem('forceRelay') === 'true';
    console.log("🔧 Force relay mode:", forceRelay);
    
    const peerConfig = {
      iceServers: [
        // ========================================
        // YOUR SELF-HOSTED TURN SERVER
        // REPLACE WITH YOUR VPS IP AND CREDENTIALS
        // ========================================
        {
          urls: [
            "turn:YOUR_VPS_IP:3478?transport=udp",
            "turn:YOUR_VPS_IP:3478?transport=tcp"
          ],
          username: "turnuser",
          credential: "turnpassword"
        },
        // ========================================
        // FALLBACK STUN SERVERS
        // ========================================
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
      ],
      // ICE candidate pool for faster connection
      iceCandidatePoolSize: 10
    };
    
    // Force relay mode for testing (bypasses direct/srflx candidates)
    if (forceRelay) {
      peerConfig.iceTransportPolicy = "relay";
      console.log("⚠️ ICE transport policy set to RELAY ONLY");
    }
    
    const peer = new RTCPeerConnection(peerConfig);

    // Add local tracks to peer connection
    if (media && media.getTracks) {
      const tracks = media.getTracks();
      console.log(`📹 Adding ${tracks.length} tracks to peer connection`);
      console.log(`📹 Media stream ID:`, media.id);
      
      tracks.forEach(track => {
        console.log(`➕ Adding ${track.kind} track to peer for:`, remoteId, {
          id: track.id,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        });
        
        try {
          // IMPORTANT: Pass the stream as second parameter
          const sender = peer.addTrack(track, media);
          console.log("✅ Track added successfully, sender:", sender);
          console.log("✅ Sender track:", sender.track?.kind, sender.track?.id);
        } catch (err) {
          console.error("❌ Error adding track:", err);
        }
      });
      
      // Verify tracks were added
      const senders = peer.getSenders();
      console.log("🔍 Verification - Total senders after adding tracks:", senders.length);
      senders.forEach((sender, index) => {
        console.log(`  Sender ${index}:`, sender.track?.kind, sender.track?.id);
      });
    } else {
      console.error("❌ No media stream or getTracks method!");
    }

    // Update debug info
    setDebugInfo(prev => ({
      ...prev,
      peersCount: Object.keys(peersRef.current).length + 1
    }));

    // Handle incoming tracks
    peer.ontrack = (e) => {
      console.log("🎥 Received remote track from:", remoteId, "Kind:", e.track.kind);
      console.log("🎥 Track details:", {
        id: e.track.id,
        label: e.track.label,
        enabled: e.track.enabled,
        muted: e.track.muted,
        readyState: e.track.readyState
      });
      console.log("🎥 Event streams:", e.streams.length);
      
      const remoteStream = e.streams[0];
      console.log("🎥 Remote stream:", remoteStream?.id, "Tracks:", remoteStream?.getTracks().length);
      
      if (remoteStream) {
        // Set up audio detection for this stream
        const hasAudio = remoteStream.getAudioTracks().length > 0;
        if (hasAudio) {
          setupAudioDetection(remoteStream, remoteId);
        }
        
        // Force a state update by using a callback
        setRemoteStreams(prev => {
          console.log("📺 Updating remote streams, adding:", remoteId);
          console.log("📺 Current remote streams:", Object.keys(prev));
          
          // Check if stream already exists
          if (prev[remoteId]) {
            console.log("⚠️ Stream already exists for:", remoteId, "- updating");
          }
          
          const updated = {
            ...prev,
            [remoteId]: remoteStream
          };
          console.log("📺 Updated remote streams:", Object.keys(updated));
          console.log("📺 New state will have", Object.keys(updated).length, "remote streams");
          
          // Force re-render by creating a new object
          return { ...updated };
        });
        
        // Also log the stream tracks
        console.log("📺 Stream tracks:", remoteStream.getTracks().map(t => ({
          kind: t.kind,
          id: t.id,
          enabled: t.enabled,
          readyState: t.readyState
        })));
        
        // Manually trigger a re-render
        setTimeout(() => {
          console.log("🔄 Forcing component update check");
          setDebugInfo(prev => ({ ...prev, remoteStreamsCount: Object.keys(remoteStreams).length + 1 }));
        }, 100);
      } else {
        console.error("❌ No remote stream in ontrack event!");
      }
    };

    // Handle ICE candidates
    peer.onicecandidate = (e) => {
      if (e.candidate) {
        // Log ICE candidate type for debugging
        const candidateType = e.candidate.type || 'unknown';
        const candidateProtocol = e.candidate.protocol || 'unknown';
        const candidateAddress = e.candidate.address || e.candidate.ip || 'unknown';
        const candidatePort = e.candidate.port || 'unknown';
        
        console.log("🧊 ICE Candidate for", remoteId, ":", {
          type: candidateType,
          protocol: candidateProtocol,
          address: candidateAddress,
          port: candidatePort,
          priority: e.candidate.priority,
          foundation: e.candidate.foundation
        });
        
        // Highlight relay candidates (TURN)
        if (candidateType === 'relay') {
          console.log("✅ RELAY (TURN) candidate selected - media will route through TURN server");
        } else if (candidateType === 'srflx') {
          console.log("⚠️ SRFLX (STUN) candidate - direct connection with NAT traversal");
        } else if (candidateType === 'host') {
          console.log("⚠️ HOST candidate - local network connection");
        }
        
        socket.emit("ice-candidate", {
          candidate: e.candidate,
          to: remoteId,
          room: code
        });
      } else {
        console.log("🧊 ICE gathering complete for:", remoteId);
      }
    };

    // Monitor connection state
    peer.onconnectionstatechange = () => {
      const connState = peer.connectionState;
      console.log(`🔌 Connection state for ${remoteId}:`, connState);
      
      // Only update if ICE hasn't already set it to connected
      // (ICE state is more reliable for screen shares)
      if (connState === "connected") {
        setConnectionStatus(prev => ({
          ...prev,
          [remoteId]: "connected"
        }));
      } else if (connState === "connecting" || connState === "new") {
        // Don't override if ICE is already connected
        setConnectionStatus(prev => {
          if (prev[remoteId] === "connected") {
            return prev; // Keep connected status
          }
          return {
            ...prev,
            [remoteId]: "connecting"
          };
        });
      }
      
      // Remove failed or closed connections
      if (connState === "failed" || connState === "closed") {
        console.log("❌ Connection failed/closed, cleaning up:", remoteId);
        setConnectionStatus(prev => ({
          ...prev,
          [remoteId]: "failed"
        }));
        
        setTimeout(() => {
          if (peersRef.current[remoteId]) {
            try {
              peersRef.current[remoteId].close();
            } catch (err) {
              console.error("Error closing failed peer:", err);
            }
            delete peersRef.current[remoteId];
          }
          
          setRemoteStreams(prev => {
            const updated = { ...prev };
            delete updated[remoteId];
            console.log("🗑️ Removed failed connection stream for:", remoteId);
            return updated;
          });
        }, 2000); // Wait 2 seconds before cleanup
      }
      
      // Log detailed connection info when connected
      if (connState === "connected") {
        console.log("✅ Peer connection established!");
        console.log("📊 Connection stats:", {
          localDescription: peer.localDescription?.type,
          remoteDescription: peer.remoteDescription?.type,
          iceConnectionState: peer.iceConnectionState,
          iceGatheringState: peer.iceGatheringState,
          signalingState: peer.signalingState
        });
        
        // Check senders (outgoing tracks)
        const senders = peer.getSenders();
        console.log("📤 Senders (outgoing tracks):", senders.length);
        senders.forEach(sender => {
          if (sender.track) {
            console.log(`  - ${sender.track.kind}:`, sender.track.id, "enabled:", sender.track.enabled);
          }
        });
        
        // Check receivers (incoming tracks)
        const receivers = peer.getReceivers();
        console.log("📥 Receivers (incoming tracks):", receivers.length);
        receivers.forEach(receiver => {
          if (receiver.track) {
            console.log(`  - ${receiver.track.kind}:`, receiver.track.id, "enabled:", receiver.track.enabled);
          }
        });
      }
    };

    peer.oniceconnectionstatechange = () => {
      const iceState = peer.iceConnectionState;
      console.log(`🧊 ICE connection state for ${remoteId}:`, iceState);
      
      // Update connection status based on ICE state (more reliable than connection state)
      if (iceState === "connected" || iceState === "completed") {
        console.log(`✅ Setting ${remoteId} as connected based on ICE state`);
        setConnectionStatus(prev => ({
          ...prev,
          [remoteId]: "connected"
        }));
      } else if (iceState === "checking") {
        setConnectionStatus(prev => ({
          ...prev,
          [remoteId]: "connecting"
        }));
      } else if (iceState === "failed" || iceState === "disconnected") {
        setConnectionStatus(prev => ({
          ...prev,
          [remoteId]: "failed"
        }));
        
        if (iceState === "failed") {
          console.error("❌ ICE connection failed! Trying to restart...");
          peer.restartIce();
        }
      }
    };

    peer.onsignalingstatechange = () => {
      console.log(`📡 Signaling state for ${remoteId}:`, peer.signalingState);
    };

    return peer;
  }

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
      
      // Broadcast camera status to other participants
      if (socketRef.current) {
        socketRef.current.emit("media-status-update", {
          roomCode: code.toUpperCase(),
          isCameraOn: videoTrack.enabled,
          isMicOn,
          isScreenSharing
        });
      }
    }
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
      
      // Broadcast mic status to other participants
      if (socketRef.current) {
        socketRef.current.emit("media-status-update", {
          roomCode: code.toUpperCase(),
          isCameraOn,
          isMicOn: audioTrack.enabled,
          isScreenSharing
        });
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        console.log("🖥️ Starting screen share...");
        
        // Check if screen share is supported
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          if (isMobile) {
            // Offer alternative: Use rear camera to show screen
            const useCamera = window.confirm(
              "Screen sharing is not supported on mobile devices.\n\n" +
              "Would you like to use your rear camera instead to show your screen?"
            );
            
            if (!useCamera) {
              showNotification("Screen sharing cancelled", "info");
              return;
            }
            
            // Use rear camera as alternative
            try {
              const cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                  facingMode: { ideal: "environment" }, // Rear camera
                  width: { ideal: 1920 },
                  height: { ideal: 1080 }
                },
                audio: true
              });
              
              console.log("✅ Camera stream obtained for mobile");
              console.log("📹 Camera stream tracks:", cameraStream.getTracks().map(t => ({
                kind: t.kind,
                id: t.id,
                label: t.label,
                enabled: t.enabled,
                readyState: t.readyState,
                muted: t.muted
              })));
              
              // CRITICAL: Ensure all tracks are enabled
              cameraStream.getTracks().forEach(track => {
                track.enabled = true;
                console.log("✅ Enabled camera track:", track.kind, track.id);
              });
              
              // Treat camera stream as "screen share"
              screenStreamRef.current = cameraStream;
              const screenSocketId = `${socketRef.current.id}-screen`;
              screenSocketIdRef.current = screenSocketId;
              
              // Handle when user stops sharing
              cameraStream.getVideoTracks()[0].onended = () => {
                console.log("📱 Camera share ended");
                stopScreenShare();
              };
              
              // Notify backend
              console.log("📤 Notifying backend about camera share...");
              socketRef.current.emit('start-screen-share', {
                roomCode: code.toUpperCase(),
                userInfo: {
                  userId: currentUser.id || currentUser._id,
                  name: currentUser.name,
                  username: currentUser.username,
                  profilePic: currentUser.profilePic
                }
              });
              
              // Store locally
              setParticipants(prev => ({
                ...prev,
                [screenSocketId]: {
                  userId: currentUser.id || currentUser._id,
                  name: `${currentUser.name}'s Camera`,
                  username: currentUser.username,
                  profilePic: currentUser.profilePic
                }
              }));
              
              setParticipantMediaStatus(prev => ({
                ...prev,
                [screenSocketId]: { isCameraOn: false, isMicOn: false, isScreenSharing: true }
              }));
              
              // Create peer connections
              const activeParticipantIds = Object.keys(participants).filter(id => 
                id !== socketRef.current.id && !id.endsWith('-screen')
              );
              console.log("👥 Creating camera share peers for:", activeParticipantIds.length, "users:", activeParticipantIds);
              
              for (const peerId of activeParticipantIds) {
                console.log("🔧 Creating camera share peer for:", peerId);
                const screenPeer = createScreenPeer(peerId, cameraStream, socketRef.current);
                screenPeerRef.current[peerId] = screenPeer;
                
                // Verify tracks were added
                const senders = screenPeer.getSenders();
                console.log("📹 Camera share senders for", peerId, ":", senders.length);
                senders.forEach((sender, index) => {
                  console.log(`  Sender ${index}:`, sender.track ? {
                    kind: sender.track.kind,
                    id: sender.track.id,
                    enabled: sender.track.enabled,
                    readyState: sender.track.readyState
                  } : 'NO TRACK');
                });
                
                try {
                  const offer = await screenPeer.createOffer();
                  console.log("✅ Offer created, SDP includes video:", offer.sdp.includes('m=video'));
                  
                  await screenPeer.setLocalDescription(offer);
                  console.log("📤 Sending camera share offer to:", peerId);
                  socketRef.current.emit("screen-offer", { 
                    offer, 
                    to: peerId, 
                    from: socketRef.current.id,
                    screenSocketId: screenSocketId,
                    room: code 
                  });
                  console.log("✅ Offer sent to:", peerId);
                } catch (err) {
                  console.error("❌ Error creating camera share offer for", peerId, ":", err);
                }
              }
              
              setIsScreenSharing(true);
              showNotification("Camera sharing started (mobile alternative)", "success");
              console.log("✅ Camera share started as screen share alternative");
              return;
              
            } catch (err) {
              console.error("❌ Camera access error:", err);
              showNotification("Could not access camera", "error");
              return;
            }
          } else {
            showNotification("Screen sharing is not supported in this browser", "error");
            return;
          }
        }
        
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: 30, max: 60 },
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 }
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            suppressLocalAudioPlayback: true, // Prevent browser from re-capturing meeting audio
            sampleRate: 48000,
            channelCount: 2,
            latency: 0
          }
        });
        
        console.log("🎵 Screen stream obtained");
        console.log("🎵 Screen stream tracks:", screenStream.getTracks().map(t => ({ 
          kind: t.kind, 
          id: t.id, 
          label: t.label,
          enabled: t.enabled,
          readyState: t.readyState
        })));
        
        const screenAudioTrack = screenStream.getAudioTracks()[0];
        console.log("🎵 Screen audio track available:", !!screenAudioTrack);
        if (screenAudioTrack) {
          console.log("🎵 Screen audio track details:", {
            id: screenAudioTrack.id,
            label: screenAudioTrack.label,
            enabled: screenAudioTrack.enabled,
            readyState: screenAudioTrack.readyState,
            muted: screenAudioTrack.muted
          });
        }
        
        // DO NOT add mic to screen stream — mic is sent via normal WebRTC stream only
        // Remote audio is NOT muted — user must still hear participants.
        // suppressLocalAudioPlayback prevents the browser from looping captured audio back.
        
        console.log("🎵 Final screen stream tracks:", screenStream.getTracks().map(t => ({ 
          kind: t.kind, 
          id: t.id, 
          label: t.label,
          enabled: t.enabled 
        })));
        
        screenStreamRef.current = screenStream;
        const screenSocketId = `${socketRef.current.id}-screen`;
        screenSocketIdRef.current = screenSocketId;
        
        // Handle when user stops sharing via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          console.log("🖥️ Screen share ended via browser UI");
          stopScreenShare();
        };
        
        // Notify backend to create dummy participant
        socketRef.current.emit('start-screen-share', {
          roomCode: code.toUpperCase(),
          userInfo: {
            userId: currentUser.id || currentUser._id,
            name: currentUser.name,
            username: currentUser.username,
            profilePic: currentUser.profilePic
          }
        });
        
        // Store own screen share participant info locally
        setParticipants(prev => ({
          ...prev,
          [screenSocketId]: {
            userId: currentUser.id || currentUser._id,
            name: `${currentUser.name}'s Screen`,
            username: currentUser.username,
            profilePic: currentUser.profilePic
          }
        }));
        
        // Mark as screen sharing
        setParticipantMediaStatus(prev => ({
          ...prev,
          [screenSocketId]: { isCameraOn: false, isMicOn: false, isScreenSharing: true }
        }));
        
        // Create peer connections for screen share to all existing participants
        // Get all active participants (excluding self and their screen shares)
        const activeParticipantIds = Object.keys(participants).filter(id => 
          id !== socketRef.current.id && !id.endsWith('-screen')
        );
        console.log("📤 Creating screen share peers for", activeParticipantIds.length, "participants:", activeParticipantIds);
        
        for (const peerId of activeParticipantIds) {
          console.log("🔧 Creating screen share peer for:", peerId);
          const screenPeer = createScreenPeer(peerId, screenStream, socketRef.current);
          screenPeerRef.current[peerId] = screenPeer;
          
          // Apply bandwidth optimization for screen share
          const senders = screenPeer.getSenders();
          senders.forEach(sender => {
            if (sender.track && sender.track.kind === 'video') {
              const parameters = sender.getParameters();
              if (!parameters.encodings) {
                parameters.encodings = [{}];
              }
              // Adaptive bitrate: 2.5 Mbps for high quality, can scale down
              parameters.encodings[0].maxBitrate = 2500000; // 2.5 Mbps
              // Enable degradation preference for better quality on poor networks
              if ('degradationPreference' in parameters.encodings[0]) {
                parameters.encodings[0].degradationPreference = 'maintain-framerate';
              }
              sender.setParameters(parameters)
                .then(() => console.log("✅ Screen share video bitrate set to 2.5 Mbps for:", peerId))
                .catch(err => console.error("❌ Error setting video bitrate:", err));
            }
            // AUDIO QUALITY IMPROVEMENT: Increase audio bitrate for screen share
            if (sender.track && sender.track.kind === 'audio') {
              const parameters = sender.getParameters();
              if (!parameters.encodings) {
                parameters.encodings = [{}];
              }
              // Set high bitrate for screen share audio (music, videos)
              parameters.encodings[0].maxBitrate = 128000; // 128 kbps for high quality audio
              sender.setParameters(parameters)
                .then(() => console.log("✅ Screen share audio bitrate set to 128 kbps for:", peerId))
                .catch(err => console.error("❌ Error setting audio bitrate:", err));
            }
          });
          
          try {
            const offer = await screenPeer.createOffer();
            
            // AUDIO QUALITY IMPROVEMENT: Enable stereo and high bitrate in SDP
            offer.sdp = offer.sdp.replace(
              /useinbandfec=1/g,
              "useinbandfec=1; stereo=1; maxaveragebitrate=128000"
            );
            console.log("✅ SDP modified for stereo audio and high bitrate");
            
            await screenPeer.setLocalDescription(offer);
            console.log("📤 Sending screen share offer to:", peerId);
            socketRef.current.emit("screen-offer", { 
              offer, 
              to: peerId, 
              from: socketRef.current.id, // Use real socket ID, not dummy
              screenSocketId: screenSocketId, // Send dummy ID for UI tracking
              room: code 
            });
          } catch (err) {
            console.error("Error creating screen share offer:", err);
          }
        }
        
        setIsScreenSharing(true);
        
        if (screenAudioTrack) {
          // Detect if user shared entire screen (vs a tab) — entire screen captures meeting audio
          const trackLabel = screenAudioTrack.label?.toLowerCase() || '';
          const isEntireScreen = trackLabel.includes('screen') || trackLabel.includes('monitor') || trackLabel.includes('display');
          
          if (isEntireScreen) {
            showNotification("⚠️ For echo-free audio, share a Chrome Tab instead of Entire Screen", "info");
          } else {
            showNotification("Screen sharing started with audio", "success");
          }
        } else {
          showNotification("Screen sharing started (no system audio)", "info");
        }
        console.log("✅ Screen share started");
        
      } else {
        // Stop screen sharing
        stopScreenShare();
      }
    } catch (err) {
      console.error("❌ Screen share error:", err);
      if (err.name === "NotAllowedError") {
        showNotification("Screen share permission denied", "error");
      } else {
        showNotification("Failed to start screen share", "error");
      }
    }
  };

  const stopScreenShare = async () => {
    console.log("🖥️ Stopping screen share...");
    
    const screenSocketId = screenSocketIdRef.current;
    
    // Stop screen stream
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("🛑 Stopped screen track:", track.kind);
      });
      screenStreamRef.current = null;
    }
    
    // Close all screen share peer connections
    Object.values(screenPeerRef.current).forEach(peer => {
      try {
        peer.close();
      } catch (e) {
        console.error("Error closing screen peer:", e);
      }
    });
    screenPeerRef.current = {};
    
    // Remove own screen share participant info locally
    if (screenSocketId) {
      setParticipants(prev => {
        const updated = { ...prev };
        delete updated[screenSocketId];
        return updated;
      });
      
      setParticipantMediaStatus(prev => {
        const updated = { ...prev };
        delete updated[screenSocketId];
        return updated;
      });
    }
    
    // Notify backend to remove dummy participant
    if (socketRef.current && screenSocketIdRef.current) {
      socketRef.current.emit('stop-screen-share', {
        roomCode: code.toUpperCase()
      });
    }
    
    screenSocketIdRef.current = null;
    setIsScreenSharing(false);
    
    // Renegotiate connections to switch back to camera stream
    console.log("🔄 Renegotiating connections to restore camera stream");
    const renegotiatePromises = Object.keys(peersRef.current).map(async (peerId) => {
      const peer = peersRef.current[peerId];
      if (!peer || peer.connectionState === 'closed') return;
      
      try {
        // Get current senders
        const senders = peer.getSenders();
        
        // Replace tracks with camera/mic tracks
        if (stream) {
          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];
          
          for (const sender of senders) {
            if (sender.track) {
              if (sender.track.kind === 'video' && videoTrack) {
                console.log("🔄 Replacing video track for:", peerId);
                await sender.replaceTrack(videoTrack);
              } else if (sender.track.kind === 'audio' && audioTrack) {
                console.log("🔄 Replacing audio track for:", peerId);
                await sender.replaceTrack(audioTrack);
              }
            }
          }
          console.log("✅ Tracks replaced for:", peerId);
        }
      } catch (err) {
        console.error("Error renegotiating connection for:", peerId, err);
      }
    });
    
    // Wait for all renegotiations to complete
    await Promise.all(renegotiatePromises);
    console.log("✅ All connections renegotiated");
    
    showNotification("Screen sharing stopped", "info");
    console.log("✅ Screen share stopped");
  };

  // Create peer connection specifically for screen sharing
    function createScreenPeer(remoteId, screenStream, socket, screenSocketId = null) {
      console.log("═══════════════════════════════════════════════════");
      console.log("🔧 CREATING SCREEN SHARE PEER CONNECTION");
      console.log("═══════════════════════════════════════════════════");
      console.log("🔧 Remote ID:", remoteId);
      console.log("🔧 Screen stream provided:", !!screenStream);
      console.log("🔧 Screen socket ID:", screenSocketId);
      console.log("🔧 Role:", screenStream ? "SENDER" : "RECEIVER");

      // Check for force relay mode (for testing TURN)
      const forceRelay = localStorage.getItem('forceRelay') === 'true';
      console.log("🔧 Force relay mode:", forceRelay);

      const peerConfig = {
        iceServers: [
          // ========================================
          // YOUR SELF-HOSTED TURN SERVER
          // REPLACE WITH YOUR VPS IP AND CREDENTIALS
          // ========================================
          {
            urls: [
              "turn:YOUR_VPS_IP:3478?transport=udp",
              "turn:YOUR_VPS_IP:3478?transport=tcp"
            ],
            username: "turnuser",
            credential: "turnpassword"
          },
          // ========================================
          // FALLBACK STUN SERVERS
          // ========================================
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" }
        ],
        iceCandidatePoolSize: 10
      };

      // Force relay mode for testing (bypasses direct/srflx candidates)
      if (forceRelay) {
        peerConfig.iceTransportPolicy = "relay";
        console.log("⚠️ Screen share ICE transport policy set to RELAY ONLY");
      }

      const peer = new RTCPeerConnection(peerConfig);
      
      // Initialize ICE candidate queue for this peer
      if (!screenIceCandidatesQueue.current[remoteId]) {
        screenIceCandidatesQueue.current[remoteId] = [];
        console.log("📦 Initialized ICE candidate queue for:", remoteId);
      }

      // Add screen stream tracks if provided (for sending screen share)
      if (screenStream && screenStream.getTracks) {
        const tracks = screenStream.getTracks();
        console.log(`📹 Adding ${tracks.length} screen tracks to peer connection`);

        tracks.forEach(track => {
          try {
            const sender = peer.addTrack(track, screenStream);
            console.log(`✅ Added screen ${track.kind} track:`, track.id);
          } catch (err) {
            console.error(`Error adding screen ${track.kind} track:`, err);
          }
        });
      } else {
        console.log("📥 No screen stream provided - this is a receiver peer");
      }

      // Handle incoming tracks (for receiving screen shares)
      peer.ontrack = (e) => {
        const remoteStream = e.streams[0];
        if (!remoteStream) return;

        const idToStore = screenSocketId ? screenSocketId : remoteId;

        setRemoteStreams(prev => {
          if (prev[idToStore]?.id === remoteStream.id) return prev;
          return {
            ...prev,
            [idToStore]: remoteStream
          };
        });
      };

      // ICE candidate handler
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          const candidateType = event.candidate.type || 'unknown';
          console.log("🧊 Screen share ICE Candidate for", remoteId, ":", {
            type: candidateType,
            protocol: event.candidate.protocol,
            address: event.candidate.address
          });
          
          socket.emit("screen-ice-candidate", { 
            candidate: event.candidate, 
            to: remoteId,
            from: socket.id
          });
        } else {
          console.log("🧊 Screen share ICE gathering complete for:", remoteId);
        }
      };

      // Connection state handler
      peer.onconnectionstatechange = () => {
        const connState = peer.connectionState;
        console.log("🔌 ═══════════════════════════════════════════════");
        console.log("🔌 SCREEN SHARE CONNECTION STATE CHANGED");
        console.log("🔌 ═══════════════════════════════════════════════");
        console.log("🔌 Peer:", remoteId);
        console.log("🔌 Connection state:", connState);
        console.log("🔌 ICE connection state:", peer.iceConnectionState);
        console.log("🔌 Signaling state:", peer.signalingState);

        const statusId = screenSocketId || remoteId;

        if (connState === "connected") {
          console.log("✅ ✅ ✅ SCREEN SHARE PEER CONNECTED SUCCESSFULLY!");
          
          // Log selected candidate pair
          peer.getStats().then(stats => {
            stats.forEach(report => {
              if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                console.log("🎯 Selected candidate pair:", {
                  state: report.state,
                  nominated: report.nominated
                });
              }
              if (report.type === 'local-candidate' && report.candidateType) {
                console.log("📍 Local candidate:", {
                  type: report.candidateType,
                  protocol: report.protocol,
                  port: report.port
                });
              }
              if (report.type === 'remote-candidate' && report.candidateType) {
                console.log("📍 Remote candidate:", {
                  type: report.candidateType,
                  protocol: report.protocol,
                  port: report.port
                });
              }
            });
          });
          
          setConnectionStatus(prev => ({
            ...prev,
            [statusId]: "connected"
          }));
        } else if (connState === "connecting") {
          console.log("🔄 Screen share peer connecting...");
          setConnectionStatus(prev => ({
            ...prev,
            [statusId]: "connecting"
          }));
        } else if (connState === "failed") {
          console.error("❌ ❌ ❌ SCREEN SHARE CONNECTION FAILED!");
          console.error("❌ Peer:", remoteId);
          console.error("❌ ICE connection state:", peer.iceConnectionState);
          console.error("❌ Signaling state:", peer.signalingState);
          
          setConnectionStatus(prev => ({
            ...prev,
            [statusId]: "failed"
          }));

          // Try ICE restart
          console.log("🔄 Attempting ICE restart...");
          try {
            peer.restartIce();
            console.log("✅ ICE restart initiated for screen share");
          } catch (err) {
            console.error("❌ ICE restart failed:", err);
          }
        } else if (connState === "closed") {
          console.log("🔒 Screen share connection closed");
          setConnectionStatus(prev => ({
            ...prev,
            [statusId]: "closed"
          }));
        }
        console.log("🔌 ═══════════════════════════════════════════════");
      };

      peer.oniceconnectionstatechange = () => {
        const iceState = peer.iceConnectionState;
        console.log("🧊 Screen share ICE connection state for", remoteId, ":", iceState);

        const statusId = screenSocketId || remoteId;

        if (iceState === "connected" || iceState === "completed") {
          console.log("✅ Screen share ICE connected");
          setConnectionStatus(prev => ({
            ...prev,
            [statusId]: "connected"
          }));
        } else if (iceState === "checking") {
          setConnectionStatus(prev => ({
            ...prev,
            [statusId]: "connecting"
          }));
        } else if (iceState === "failed") {
          console.error("❌ Screen share ICE failed");
          setConnectionStatus(prev => ({
            ...prev,
            [statusId]: "failed"
          }));
        } else if (iceState === "disconnected") {
          console.warn("⚠️ Screen share ICE disconnected");
          setConnectionStatus(prev => ({
            ...prev,
            [statusId]: "disconnected"
          }));
        }
      };

      peer.onsignalingstatechange = () => {
        console.log(`📡 Screen share signaling state for ${remoteId}:`, peer.signalingState);
      };

      return peer;
    }


  const leaveMeeting = async () => {
    console.log("🚪 Leaving assembly, saving duration:", sessionTimer);
    
    // Stop all media tracks
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log("🛑 Stopped track on leave:", track.kind);
      });
    }
    
    // Close all peer connections
    Object.values(peersRef.current).forEach(peer => {
      try {
        peer.close();
      } catch (e) {
        console.error("Error closing peer:", e);
      }
    });
    
    // Save duration to backend
    try {
      console.log("💾 Saving duration to backend:", sessionTimer, "seconds");
      const response = await sessionAPI.updateDuration(code, sessionTimer);
      console.log("✅ Duration saved successfully:", response);
    } catch (err) {
      console.error("❌ Error saving duration:", err);
    }
    
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    navigate("/home");
  };

  // Handle profile update from Settings modal — updates local state and broadcasts to room
  const handleProfileUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    currentUserRef.current = updatedUser;
    if (socketRef.current) {
      socketRef.current.emit("update-user-info", {
        roomCode: code.toUpperCase(),
        name: updatedUser.name,
        profilePic: updatedUser.profilePic || ""
      });
    }
  };

  // Password management handlers
  const handleSetPassword = async () => {
    if (!meetingPassword.trim()) {
      setPasswordError("Password cannot be empty");
      return;
    }
    
    try {
      await sessionAPI.setPassword(code.toUpperCase(), meetingPassword);
      setIsLocked(true);
      setShowPasswordInput(false);
      setRevealedPassword(meetingPassword); // Store the password
      setMeetingPassword("");
      setPasswordError("");
      setShowMeetingPassword(false);
      showNotification("Assembly locked with password", "success");
    } catch (err) {
      console.error("Error setting password:", err);
      setPasswordError(err.message || "Failed to set password");
    }
  };

  const handleRemovePassword = async () => {
    try {
      await sessionAPI.removePassword(code.toUpperCase());
      setIsLocked(false);
      setMeetingPassword("");
      setRevealedPassword(""); // Clear stored password
      setShowRevealedPassword(false);
      showNotification("Assembly password removed", "success");
    } catch (err) {
      console.error("Error removing password:", err);
      showNotification("Failed to remove password", "error");
    }
  };

  // Remove participant handler
  const handleRemoveParticipant = async (socketId) => {
    if (!socketRef.current) return;
    
    try {
      // Emit socket event to remove participant
      socketRef.current.emit("remove-participant", {
        roomCode: code.toUpperCase(),
        socketId: socketId,
        hostId: currentUser.id || currentUser._id
      });
      
      setShowRemoveConfirm(null);
      showNotification("Participant removed", "success");
    } catch (err) {
      console.error("Error removing participant:", err);
      showNotification("Failed to remove participant", "error");
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current) return;
    
    socketRef.current.emit("chat-message", {
      roomCode: code.toUpperCase(),
      message: newMessage.trim(),
      userInfo: {
        name: currentUser?.name,
        username: currentUser?.username,
        profilePic: currentUser?.profilePic || ""
      }
    });
    
    setNewMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    setShowChat(!showChat);
    if (!showChat) {
      setUnreadCount(0);
    }
  };

  // Measure ping/latency to a specific user
  // Measure ping to server (for self) and broadcast to others
  const measureSelfPing = () => {
    if (!socketRef.current) return;
    
    const startTime = Date.now();
    socketRef.current.emit("ping-server", {}, () => {
      const latency = Date.now() - startTime;
      setSelfPing(latency);
      
      // Broadcast my ping to all other participants
      socketRef.current.emit("broadcast-ping", {
        roomCode: code.toUpperCase(),
        ping: latency
      });
    });
  };

  // Periodically update pings for all users
  useEffect(() => {
    const pingInterval = setInterval(() => {
      // Measure ping to server and broadcast
      measureSelfPing();
    }, 5000); // Update every 5 seconds

    // Initial measurement
    measureSelfPing();

    return () => clearInterval(pingInterval);
  }, []);

  // Reset chat position to default
  const resetChatPosition = () => {
    setChatPosition({ x: window.innerWidth - 370, y: 80 });
    setChatSize({ width: 350, height: 500 });
    setShowChatReset(true);
    setTimeout(() => {
      setShowChatReset(false);
    }, 2000);
  };

  const handleChatMouseDown = (e) => {
    if (e.target.closest('.chat-header')) {
      e.preventDefault();
      setIsDragging(true);
      const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
      setDragOffset({
        x: clientX - chatPosition.x,
        y: clientY - chatPosition.y
      });
    }
  };

  const handleChatMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
      
      const newX = clientX - dragOffset.x;
      const newY = clientY - dragOffset.y;
      
      // Keep chat within viewport bounds using current chat size
      const maxX = window.innerWidth - chatSize.width;
      const maxY = window.innerHeight - 100;
      
      setChatPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleChatMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleChatMouseMove);
      window.addEventListener('mouseup', handleChatMouseUp);
      window.addEventListener('touchmove', handleChatMouseMove, { passive: false });
      window.addEventListener('touchend', handleChatMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleChatMouseMove);
        window.removeEventListener('mouseup', handleChatMouseUp);
        window.removeEventListener('touchmove', handleChatMouseMove);
        window.removeEventListener('touchend', handleChatMouseUp);
      };
    }
  }, [isDragging, dragOffset, chatPosition, chatSize]);

  // Resize handlers
  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
  };

  const handleResizeMove = (e) => {
    if (isResizing && resizeDirection) {
      e.preventDefault();
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

      let newWidth = chatSize.width;
      let newHeight = chatSize.height;
      let newX = chatPosition.x;
      let newY = chatPosition.y;

      // Handle different resize directions
      if (resizeDirection.includes('e')) {
        newWidth = clientX - chatPosition.x;
      }
      if (resizeDirection.includes('w')) {
        const deltaX = clientX - chatPosition.x;
        newWidth = chatSize.width - deltaX;
        newX = clientX;
      }
      if (resizeDirection.includes('s')) {
        newHeight = clientY - chatPosition.y;
      }
      if (resizeDirection.includes('n')) {
        const deltaY = clientY - chatPosition.y;
        newHeight = chatSize.height - deltaY;
        newY = clientY;
      }

      // Apply constraints
      newWidth = Math.max(300, Math.min(newWidth, window.innerWidth - newX));
      newHeight = Math.max(300, Math.min(newHeight, window.innerHeight - newY - 20));

      setChatSize({ width: newWidth, height: newHeight });
      if (resizeDirection.includes('w') || resizeDirection.includes('n')) {
        setChatPosition({ x: newX, y: newY });
      }
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeDirection(null);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      window.addEventListener('touchmove', handleResizeMove, { passive: false });
      window.addEventListener('touchend', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
        window.removeEventListener('touchmove', handleResizeMove);
        window.removeEventListener('touchend', handleResizeEnd);
      };
    }
  }, [isResizing, resizeDirection, chatSize, chatPosition]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-adjust currentSlide when participants change
  useEffect(() => {
    const totalSlides = calculateTotalSlides();
    const maxSlide = Math.max(0, totalSlides - 1);
    
    // If current slide exceeds max, adjust to the last valid slide
    if (currentSlide > maxSlide) {
      console.log(`📊 Adjusting slide from ${currentSlide} to ${maxSlide}`);
      setCurrentSlide(maxSlide);
    }
  }, [remoteStreams, currentSlide, isScreenSharing]);

  // Helper function to build participants list consistently
  const buildParticipantsList = () => {
    // Build list of regular participants (no screen shares as separate items)
    const regularParticipants = [
      { 
        id: 'self', 
        name: currentUser?.name || "You", 
        profilePic: currentUser?.profilePic || "",
        isSelf: true,
        stream: stream,
        screenStream: isScreenSharing && screenStreamRef.current ? screenStreamRef.current : null
      },
      ...Object.entries(remoteStreams)
        .filter(([userId]) => !userId.endsWith('-screen')) // Exclude screen share streams
        .map(([userId, remoteStream]) => {
          // Find matching screen share stream for this user
          const screenShareId = `${userId}-screen`;
          const screenStream = remoteStreams[screenShareId] || null;
          
          return {
            id: userId,
            stream: remoteStream,
            name: participants[userId]?.name || `User ${userId.substring(0, 6)}`,
            profilePic: participants[userId]?.profilePic || "",
            isSelf: false,
            screenStream: screenStream
          };
        })
    ];
    
    return regularParticipants;
  };

  // Helper function to calculate total slides consistently
  const calculateTotalSlides = () => {
    const allParticipants = buildParticipantsList();
    // 2 users per slide (screen shares are now part of user containers)
    return Math.ceil(allParticipants.length / 2);
  };

  // Slide navigation functions
  const nextSlide = () => {
    const totalSlides = calculateTotalSlides();
    setCurrentSlide(prev => Math.min(prev + 1, totalSlides - 1));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      const isMobile = window.innerWidth < 768;
      
      // Alt + V = Toggle video
      if (e.altKey && e.key === 'v') {
        e.preventDefault();
        toggleCamera();
      }
      // Alt + A = Toggle audio
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        toggleMic();
      }
      // Alt + S = Toggle screen share
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        toggleScreenShare();
      }
      // Alt + L = Leave meeting
      if (e.altKey && e.key === 'l') {
        e.preventDefault();
        if (confirm('Are you sure you want to leave the assembly?')) {
          leaveMeeting();
        }
      }
      // Alt + P = Toggle participants panel
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        setShowParticipants(prev => !prev);
      }
      // Alt + C = Toggle chat
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        toggleChat();
      }
      // Arrow keys for slides - DESKTOP ONLY
      if (!isMobile) {
        // Arrow Left = Previous slide
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prevSlide();
        }
        // Arrow Right = Next slide
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextSlide();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [stream, isCameraOn, isMicOn, showParticipants, showChat, currentSlide]);

  // Automatic audio device switching for screen share audio
  useEffect(() => {
    // Function to update audio output device for all screen share video elements
    const updateAudioOutputDevice = async () => {
      try {
        // Get all video elements that have screen share audio
        const videoElements = document.querySelectorAll('video[data-is-screen-share-audio="true"]');
        
        if (videoElements.length === 0) return;
        
        // Get the default audio output device
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        
        console.log("🔊 Available audio output devices:", audioOutputs.length);
        
        // Find the default or first available audio output
        const defaultDevice = audioOutputs.find(d => d.deviceId === 'default') || audioOutputs[0];
        
        if (!defaultDevice) {
          console.log("⚠️ No audio output device found");
          return;
        }
        
        console.log("🔊 Switching screen share audio to device:", defaultDevice.label || defaultDevice.deviceId);
        
        // Update sinkId for all screen share video elements
        for (const videoEl of videoElements) {
          if (typeof videoEl.setSinkId === 'function') {
            try {
              await videoEl.setSinkId(defaultDevice.deviceId);
              console.log("✅ Audio output switched for screen share video");
            } catch (err) {
              console.error("❌ Error setting sinkId:", err);
            }
          } else {
            console.log("⚠️ setSinkId not supported in this browser");
          }
        }
      } catch (err) {
        console.error("❌ Error updating audio output device:", err);
      }
    };
    
    // Listen for device changes (when user connects/disconnects Bluetooth, headphones, etc.)
    const handleDeviceChange = () => {
      console.log("🔊 Audio device changed, updating output...");
      // Small delay to ensure device is ready
      setTimeout(updateAudioOutputDevice, 500);
    };
    
    // Add event listener for device changes
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    // Initial setup - update devices when component mounts or remote streams change
    updateAudioOutputDevice();
    
    // Cleanup
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [remoteStreams]); // Re-run when remote streams change (new screen shares)

  // Helper function to handle video ref assignment
  const handleVideoRef = (el, participant) => {
    if (!el) return;
    
    console.log("🎬 handleVideoRef called for:", participant.id, {
      isSelf: participant.isSelf,
      isScreenShare: participant.isScreenShare,
      hasStream: !!participant.stream,
      streamId: participant.stream?.id,
      tracks: participant.stream?.getTracks().length
    });
    
    if (participant.isSelf && !participant.isScreenShare) {
      // Regular self video
      if (videoRef.current !== el) {
        videoRef.current = el;
      }
      if (stream && el.srcObject !== stream) {
        console.log("🎬 Setting self camera stream");
        el.srcObject = stream;
      }
    } else if (participant.isSelf && participant.isScreenShare) {
      // Self screen share
      if (participant.stream && el.srcObject !== participant.stream) {
        console.log("🎬 Setting self screen share stream:", participant.stream.id);
        console.log("🎬 Self screen share tracks:", participant.stream.getTracks().map(t => ({
          kind: t.kind,
          id: t.id,
          enabled: t.enabled,
          readyState: t.readyState
        })));
        el.srcObject = participant.stream;
        el.muted = true; // Ensure self screen share is muted
        el.play().catch(err => {
          console.error("Error playing self screen share:", err);
          // Try setting attributes and playing again
          el.setAttribute('playsinline', '');
          el.setAttribute('autoplay', '');
          setTimeout(() => el.play().catch(e => console.error("Retry failed:", e)), 100);
        });
      }
    } else {
      // Remote participant (including remote screen shares)
      if (!participant.id.endsWith('-screen')) {
        remoteVideoRefs.current[participant.id] = el;
      }
      if (participant.stream) {
        const needsUpdate = el.srcObject !== participant.stream;
        
        if (needsUpdate) {
          console.log("🎬 Setting remote stream for:", participant.id, "Stream:", participant.stream.id, "Tracks:", participant.stream.getTracks().length);
          participant.stream.getTracks().forEach(track => {
            console.log(`  Track: ${track.kind} ${track.id} enabled:${track.enabled} readyState:${track.readyState}`);
          });
          
          el.srcObject = participant.stream;
        } else {
          console.log("✅ Stream already set for:", participant.id);
        }
        
        // Ensure video element attributes are set
        el.setAttribute('playsinline', '');
        el.setAttribute('autoplay', '');
        
        // Always try to play for screen shares (even if stream is already set)
        if (participant.isScreenShare || participant.id.endsWith('-screen')) {
          console.log("🎬 Ensuring screen share video is playing");
          el.muted = false; // Remote screen shares should have audio
          el.volume = 1.0; // Boost volume to 3x for louder system audio
          
          // Mark this element as a screen share audio element for device switching
          el.dataset.isScreenShareAudio = 'true';
          
          // Check if video is paused and play it
          if (el.paused) {
            console.log("🎬 Video is paused, forcing play");
            el.play().catch(err => {
              console.error("Error playing screen share video:", err);
              // Try again after a short delay
              setTimeout(() => {
                console.log("🔄 Retrying screen share video play");
                el.play().catch(e => console.error("Retry failed:", e));
              }, 500);
            });
          } else {
            console.log("✅ Video is already playing");
          }
        } else if (el.paused) {
          el.play().catch(err => console.error("Error playing video:", err));
        }
      } else {
        console.warn("⚠️ No stream available for participant:", participant.id);
      }
    }
  };

  // Screen share overlay control handlers

  // Helper: get state for one screen (with defaults)
  const getScreen = (id) => ({
    showControls: false, isPlaying: true, isMuted: false, isFullscreen: false,
    ...(screenState[id] || {})
  });

  // Helper: update state for one screen
  const updateScreen = (id, patch) => {
    setScreenState(prev => ({ ...prev, [id]: { ...getScreen(id), ...prev[id], ...patch } }));
    // Also keep ref in sync for DOM restore
    controlsStateRef.current[id] = { ...getScreen(id), ...controlsStateRef.current[id], ...patch };
  };

  // Sync React state → video DOM for a specific screen
  const syncVideoState = (id) => {
    const video = document.getElementById(`screen-video-${id}`);
    const container = document.getElementById(`screen-container-${id}`);
    if (!video) return;
    const state = controlsStateRef.current[id] || { isPlaying: true, isMuted: false, isFullscreen: false };
    video.muted = state.isMuted;
    if (state.isPlaying) video.play().catch(() => {});
    else video.pause();
    if (state.isFullscreen && container && !document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    }
  };

  const handleScreenTap = (id) => {
    const current = getScreen(id);
    if (current.showControls) {
      updateScreen(id, { showControls: false });
      clearTimeout(controlsTimeoutRef.current[id]);
      return;
    }
    updateScreen(id, { showControls: true });
    clearTimeout(controlsTimeoutRef.current[id]);
    controlsTimeoutRef.current[id] = setTimeout(() => updateScreen(id, { showControls: false }), 3000);
  };

  const togglePlay = (id) => {
    const video = document.getElementById(`screen-video-${id}`);
    if (!video) return;
    if (video.paused) { video.play(); updateScreen(id, { isPlaying: true }); }
    else { video.pause(); updateScreen(id, { isPlaying: false }); }
  };

  const toggleMute = (id) => {
    const video = document.getElementById(`screen-video-${id}`);
    if (!video) return;
    video.muted = !video.muted;
    updateScreen(id, { isMuted: video.muted });
  };

  const toggleFullscreen = (id) => {
    const el = document.getElementById(`screen-container-${id}`);
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
      updateScreen(id, { isFullscreen: true });
    } else {
      document.exitFullscreen?.();
      updateScreen(id, { isFullscreen: false });
    }
  };

  // Sync fullscreen state from browser events (find which screen is fullscreen by ID)
  useEffect(() => {
    const handleFsChange = () => {
      const isNow = !!document.fullscreenElement;
      wasFullscreenRef.current = isNow;
      const el = document.fullscreenElement;
      if (el) {
        const id = el.id?.replace("screen-container-", "");
        if (id) updateScreen(id, { isFullscreen: true });
      } else {
        // Exited fullscreen — clear isFullscreen on all screens
        setScreenState(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(id => { next[id] = { ...next[id], isFullscreen: false }; });
          return next;
        });
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // Sync video DOM when remote streams update (WebRTC renegotiation)
  useEffect(() => {
    Object.keys(controlsStateRef.current).forEach(id => setTimeout(() => syncVideoState(id), 300));
  }, [remoteStreams]);

  // Restore state after rotation / resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobileState(window.innerWidth < 768);
      Object.keys(controlsStateRef.current).forEach(id => setTimeout(() => syncVideoState(id), 500));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <style>{`
        .settings-panel::-webkit-scrollbar,
        .settings-content::-webkit-scrollbar {
          width: 8px;
        }
        .settings-panel::-webkit-scrollbar-track,
        .settings-content::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 4px;
        }
        .settings-panel::-webkit-scrollbar-thumb,
        .settings-content::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }
        .settings-panel::-webkit-scrollbar-thumb:hover,
        .settings-content::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
      <div style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobileState ? "15px" : "20px",
        paddingBottom: isMobileState ? "90px" : "100px",
        position: "relative",
        overflow: "auto"
      }}>
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: notification.type === "success" ? "#10b981" : notification.type === "error" ? "#ef4444" : "#3b82f6",
          color: "white",
          padding: "15px 20px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          zIndex: 2000,
          animation: "slideIn 0.3s ease-out",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
          <span>{notification.type === "success" ? "✓" : notification.type === "error" ? "✗" : "ℹ"}</span>
          <span>{notification.message}</span>
          <style>{`
            @keyframes slideIn {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}

      {isLoading && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "32px",
          padding: "clamp(20px, 5vw, 40px)",
          maxWidth: "500px",
          width: "90%"
        }}>
          {/* Animated icon container */}
          <div style={{
            position: "relative",
            width: "120px",
            height: "120px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {/* Outer rotating ring */}
            <div style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              border: "3px solid transparent",
              borderTopColor: "#3b82f6",
              borderRightColor: "#3b82f6",
              borderRadius: "50%",
              animation: "spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite"
            }} />
            
            {/* Middle pulsing ring */}
            <div style={{
              position: "absolute",
              width: "85%",
              height: "85%",
              border: "2px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "50%",
              animation: "pulse 2s ease-in-out infinite"
            }} />
            
            {/* Inner icon background */}
            <div style={{
              position: "relative",
              width: "70px",
              height: "70px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(59, 130, 246, 0.4)",
              animation: "float 3s ease-in-out infinite"
            }}>
              <Video size={32} strokeWidth={2.5} color="white" />
            </div>
          </div>

          {/* Text content */}
          <div style={{ 
            textAlign: "center",
            animation: "fadeIn 0.6s ease-out"
          }}>
            <h2 style={{ 
              fontSize: "clamp(20px, 4vw, 24px)",
              fontWeight: "600",
              marginBottom: "12px",
              background: "linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              Setting up your workspace
            </h2>
            <p style={{ 
              fontSize: "clamp(14px, 3vw, 16px)", 
              color: "#94a3b8",
              lineHeight: "1.6",
              marginBottom: "8px"
            }}>
              Requesting camera and microphone access
            </p>
            <p style={{ 
              fontSize: "clamp(12px, 2.5vw, 14px)", 
              color: "#64748b",
              lineHeight: "1.5"
            }}>
              Your devices will remain off until you enable them
            </p>
          </div>

          {/* Progress dots */}
          <div style={{
            display: "flex",
            gap: "8px",
            alignItems: "center"
          }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#3b82f6",
                  animation: `dotPulse 1.4s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`
                }}
              />
            ))}
          </div>

          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            @keyframes pulse {
              0%, 100% { 
                transform: scale(1);
                opacity: 0.6;
              }
              50% { 
                transform: scale(1.1);
                opacity: 0.3;
              }
            }
            
            @keyframes float {
              0%, 100% { 
                transform: translateY(0px);
              }
              50% { 
                transform: translateY(-10px);
              }
            }
            
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            @keyframes dotPulse {
              0%, 100% {
                transform: scale(1);
                opacity: 0.5;
              }
              50% {
                transform: scale(1.5);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}

      {error && (
        <div style={{
          background: "#ef4444",
          padding: "clamp(20px, 5vw, 30px)",
          borderRadius: "12px",
          maxWidth: "500px",
          width: "90%",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(239, 68, 68, 0.3)"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            marginBottom: "15px" 
          }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "50%",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Lock size={48} strokeWidth={2} />
            </div>
          </div>
          <h2 style={{ 
            margin: "0 0 15px 0",
            fontSize: "clamp(20px, 4vw, 24px)"
          }}>Access Denied</h2>
          <p style={{ 
            marginBottom: "20px", 
            lineHeight: "1.6",
            fontSize: "clamp(14px, 3vw, 16px)"
          }}>{error}</p>
          <div style={{ 
            display: "flex", 
            gap: "10px", 
            justifyContent: "center",
            flexWrap: "wrap"
          }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "12px 24px",
                background: "white",
                color: "#ef4444",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "clamp(13px, 2.5vw, 14px)",
                transition: "transform 0.2s, box-shadow 0.2s",
                minWidth: "120px"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => navigate("/home")}
              style={{
                padding: "12px 24px",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "clamp(13px, 2.5vw, 14px)",
                transition: "transform 0.2s, box-shadow 0.2s",
                minWidth: "120px"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Header with Code and Participants - Fixed to top */}
          <div style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            right: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "calc(100% - 40px)",
            maxWidth: "1600px",
            margin: "0 auto",
            flexWrap: "wrap",
            gap: "15px",
            zIndex: 100
          }}>
            {/* Meeting Code with Animation */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255, 255, 255, 0.05)",
              padding: "10px 16px",
              borderRadius: "12px",
              position: "relative",
              overflow: "hidden",
              height: "44px"
            }}>
              <div style={{
                display: "flex",
                flexDirection: "column",
                position: "relative",
                height: "24px",
                overflow: "hidden"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transform: showCopied ? "translateY(-100%)" : "translateY(0)",
                  transition: "transform 0.3s ease-in-out",
                  height: "24px"
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: window.innerWidth < 768 ? "14px" : "16px",
                    whiteSpace: "nowrap"
                  }}>
                    {window.innerWidth >= 395 && "Code: "}<span style={{ color: "#3b82f6", fontFamily: "monospace" }}>{code}</span>
                  </h3>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  position: "absolute",
                  top: "100%",
                  transform: showCopied ? "translateY(-100%)" : "translateY(0)",
                  transition: "transform 0.3s ease-in-out",
                  height: "24px",
                  color: "#10b981",
                  fontSize: window.innerWidth < 768 ? "14px" : "16px",
                  fontWeight: "600",
                  whiteSpace: "nowrap"
                }}>
                  ✓ {window.innerWidth < 395 ? "Copied!" : "Code copied!"}
                </div>
              </div>
              <button 
                onClick={(e) => {
                  navigator.clipboard.writeText(code);
                  setShowCopied(true);
                  setTimeout(() => {
                    setShowCopied(false);
                  }, 2000);
                }}
                title="Copy assembly code"
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  background: "#3b82f6",
                  color: "white",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: showCopied ? "translateY(-100%)" : "translateY(0)",
                  opacity: showCopied ? 0 : 1
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#2563eb"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#3b82f6"}
              >
                <Copy size={16} />
              </button>
            </div>

            {/* Profile Button */}
            <div
              onClick={() => setShowProfileSettings(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: (() => {
                  const name = currentUser?.name || "User";
                  const isMobile = window.innerWidth < 768;
                  const nameHidden = isMobile && name.length > 12;
                  return nameHidden ? "4px" : "4px 16px 4px 4px";
                })(),
                background: "rgba(30, 41, 59, 0.6)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
                height: "44px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(30, 41, 59, 0.8)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
              title="Settings"
            >
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                fontSize: "14px",
                overflow: "hidden",
                flexShrink: 0
              }}>
                {currentUser?.profilePic ? (
                  <img
                    src={currentUser.profilePic}
                    alt={currentUser.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
                  />
                ) : (
                  <span style={{ color: "white" }}>{getInitials(currentUser?.name)}</span>
                )}
              </div>
              {window.innerWidth >= 395 && (
                <span style={{ fontSize: "14px", fontWeight: "500", color: "white", whiteSpace: "nowrap" }}>
                  {(() => {
                    const name = currentUser?.name || "User";
                    const isMobile = window.innerWidth < 768;
                    // On mobile, hide name if longer than 12 chars — just show the avatar
                    if (isMobile && name.length > 12) return null;
                    return name;
                  })()}
                </span>
              )}
            </div>
          </div>

          {/* Main Content Wrapper */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: "1600px",
            margin: "0 auto",
            gap: "15px",
            paddingTop: "80px" // Add padding to account for fixed header
          }}>

          {/* Participants Panel */}
          {showParticipants && (
            <div style={{
              position: "fixed",
              top: "80px",
              right: "20px",
              background: "#1e293b",
              borderRadius: "12px",
              padding: "20px",
              minWidth: "250px",
              maxHeight: "400px",
              overflowY: "auto",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              zIndex: 1000
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px"
              }}>
                <h3 style={{ margin: 0 }}>Participants</h3>
                <button
                  onClick={() => setShowParticipants(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "20px"
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Current User */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px",
                  background: "rgba(59, 130, 246, 0.1)",
                  borderRadius: "8px"
                }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    background: currentUser?.profilePic ? `url(${currentUser.profilePic}) center/cover` : "#3b82f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    color: "white",
                    fontWeight: "bold",
                    border: "2px solid rgba(255, 255, 255, 0.1)",
                    overflow: "hidden"
                  }}>
                    {!currentUser?.profilePic && (currentUser?.name?.charAt(0).toUpperCase() || "Y")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold" }}>{currentUser?.name || "You"}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "5px" }}>
                      {selfPing !== null && (
                        <span style={{ 
                          marginLeft: "0px", 
                          color: selfPing < 100 ? "#10b981" : selfPing < 200 ? "#f59e0b" : "#ef4444",
                          fontSize: "11px"
                        }}>
                          • {selfPing}ms
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remote Users */}
                {Object.entries(remoteStreams)
                  .filter(([userId]) => !userId.endsWith('-screen')) // Exclude screen share dummies
                  .map(([userId, remoteStream]) => {
                  const participant = participants[userId];
                  const displayName = participant?.name || `User ${userId.substring(0, 6)}`;
                  const profilePic = participant?.profilePic;
                  const initials = displayName.charAt(0).toUpperCase();
                  const ping = userPings[userId];
                  
                  return (
                  <div key={userId} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px",
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "8px"
                  }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      background: profilePic ? `url(${profilePic}) center/cover` : "#10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      color: "white",
                      fontWeight: "bold",
                      border: "2px solid rgba(255, 255, 255, 0.1)",
                      overflow: "hidden"
                    }}>
                      {!profilePic && initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold" }}>{displayName}</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "5px" }}>
                        {connectionStatus[userId] === "connected" && (
                          <><Circle size={8} fill="#10b981" color="#10b981" /> Connected</>
                        )}
                        {connectionStatus[userId] === "connecting" && (
                          <><Circle size={8} fill="#f59e0b" color="#f59e0b" /> Connecting</>
                        )}
                        {connectionStatus[userId] === "failed" && (
                          <><Circle size={8} fill="#ef4444" color="#ef4444" /> Failed</>
                        )}
                        {ping !== undefined && connectionStatus[userId] === "connected" && (
                          <span style={{ 
                            marginLeft: "5px", 
                            color: ping < 100 ? "#10b981" : ping < 200 ? "#f59e0b" : "#ef4444",
                            fontSize: "11px"
                          }}>
                            • {ping}ms
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chat Panel */}
          {showChat && (
            <div 
              style={{
                position: "fixed",
                top: `${chatPosition.y}px`,
                left: `${chatPosition.x}px`,
                width: `${chatSize.width}px`,
                height: `${chatSize.height}px`,
                background: "#1e293b",
                borderRadius: "12px",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
                display: "flex",
                flexDirection: "column",
                zIndex: 1000,
                cursor: isDragging ? 'grabbing' : 'default',
                touchAction: 'none',
                overflow: "hidden",
                boxSizing: "border-box"
              }}
              onMouseDown={handleChatMouseDown}
              onTouchStart={handleChatMouseDown}
            >
              {/* Resize Handles */}
              {/* Top-left corner */}
              <div
                onMouseDown={(e) => handleResizeStart(e, 'nw')}
                onTouchStart={(e) => handleResizeStart(e, 'nw')}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '20px',
                  height: '20px',
                  cursor: 'nw-resize',
                  zIndex: 10
                }}
              />
              {/* Top-right corner */}
              <div
                onMouseDown={(e) => handleResizeStart(e, 'ne')}
                onTouchStart={(e) => handleResizeStart(e, 'ne')}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '20px',
                  height: '20px',
                  cursor: 'ne-resize',
                  zIndex: 10
                }}
              />
              {/* Bottom-left corner */}
              <div
                onMouseDown={(e) => handleResizeStart(e, 'sw')}
                onTouchStart={(e) => handleResizeStart(e, 'sw')}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '20px',
                  height: '20px',
                  cursor: 'sw-resize',
                  zIndex: 10
                }}
              />
              {/* Bottom-right corner */}
              <div
                onMouseDown={(e) => handleResizeStart(e, 'se')}
                onTouchStart={(e) => handleResizeStart(e, 'se')}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '20px',
                  height: '20px',
                  cursor: 'se-resize',
                  zIndex: 10
                }}
              />
              {/* Chat Header */}
              <div 
                className="chat-header"
                style={{
                  padding: "15px 20px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  touchAction: 'none'
                }}
              >
                <h3 style={{ margin: 0, fontSize: "18px" }}>Chat</h3>
                <button
                  onClick={() => setShowChat(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "white",
                    fontSize: "24px",
                    cursor: "pointer",
                    padding: "0",
                    lineHeight: "1"
                  }}
                >
                  ×
                </button>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "15px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                scrollbarWidth: "thin",
                scrollbarColor: "#475569 #1e293b"
              }}
              className="chat-messages-scroll"
              >
                {messages.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: "40px 20px"
                  }}>
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwnMessage = msg.userInfo.name === currentUser?.name;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isOwnMessage ? "flex-end" : "flex-start"
                        }}
                      >
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "4px"
                        }}>
                          {!isOwnMessage && (
                            <div style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "6px",
                              background: msg.userInfo.profilePic 
                                ? `url(${msg.userInfo.profilePic}) center/cover` 
                                : "#3b82f6",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: "bold",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              overflow: "hidden"
                            }}>
                              {!msg.userInfo.profilePic && 
                                msg.userInfo.name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
                              }
                            </div>
                          )}
                          <span style={{
                            fontSize: "12px",
                            color: "#94a3b8",
                            fontWeight: "500"
                          }}>
                            {isOwnMessage ? "You" : msg.userInfo.name}
                          </span>
                          <span style={{
                            fontSize: "10px",
                            color: "#64748b"
                          }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <div style={{
                          background: isOwnMessage ? "#3b82f6" : "rgba(255, 255, 255, 0.1)",
                          padding: "10px 14px",
                          borderRadius: "12px",
                          maxWidth: "80%",
                          wordWrap: "break-word",
                          fontSize: "14px",
                          lineHeight: "1.5"
                        }}>
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {/* Input Area */}
              <div style={{
                padding: "15px",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                flexShrink: 0
              }}>
                <div style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center"
                }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "white",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: "none",
                      background: newMessage.trim() ? "#3b82f6" : "#475569",
                      color: "white",
                      cursor: newMessage.trim() ? "pointer" : "not-allowed",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "all 0.2s",
                      flexShrink: 0,
                      whiteSpace: "nowrap"
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Video Carousel */}
          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: "1200px",
            margin: "0",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            {/* Carousel Container */}
            <div style={{
              position: "relative",
              width: "100%"
            }}>
              {(() => {
                // Use consistent participant list
                const allParticipants = buildParticipantsList().map(p => ({
                  ...p,
                  video: p.id === 'self' ? videoRef : undefined,
                  connectionStatus: connectionStatus[p.id]
                }));

                const isMobile = isMobileState;
                const participantsPerSlide = 2;
                const startIndex = currentSlide * participantsPerSlide;
                const currentParticipants = allParticipants.slice(startIndex, startIndex + participantsPerSlide);
                const screensharesOnSlide = currentParticipants.filter(p => p.screenStream);
                
                // Mobile: Show all participants stacked vertically
                if (isMobile) {
                  return (
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                      width: "100%",
                      margin: "0 auto"
                    }}>
                      {allParticipants.map((participant) => {
                        const isSpeaking = speakingUsers[participant.id];
                        const hasScreenShare = !!participant.screenStream;
                        
                        return (
                          <div key={participant.id} style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            width: "100%"
                          }}>
                            {/* Screen Share (if active) - Above user video */}
                            {hasScreenShare && (
                              <div
                                id={`screen-container-${participant.id}`}
                                onClick={() => handleScreenTap(participant.id)}
                                style={{
                                  position: "relative",
                                  borderRadius: "16px",
                                  overflow: "hidden",
                                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                                  border: "2px solid rgba(59, 130, 246, 0.5)",
                                  width: "100%",
                                  aspectRatio: "16/9",
                                  background: "black",
                                  touchAction: "manipulation",
                                  cursor: "pointer"
                                }}>
                                <video
                                  id={`screen-video-${participant.id}`}
                                  key={`screen-${participant.id}`}
                                  autoPlay
                                  playsInline
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                    background: "black",
                                    display: "block"
                                  }}
                                  ref={(el) => {
                                    if (el && participant.screenStream && el.srcObject !== participant.screenStream) {
                                      el.srcObject = participant.screenStream;
                                      el.addEventListener("loadedmetadata", () => setTimeout(() => syncVideoState(participant.id), 200), { once: true });
                                    }
                                  }}
                                />
                                {/* Overlay controls — always in DOM, shown via CSS class */}
                                <div className={`screen-controls${getScreen(participant.id).showControls ? " visible" : ""}`} style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: "rgba(0,0,0,0.4)",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 50
                                  }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); togglePlay(participant.id); }}
                                        style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", padding: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                      >
                                        {getScreen(participant.id).isPlaying ? <Pause size={28} color="white" /> : <Play size={28} color="white" />}
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleMute(participant.id); }}
                                        style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", padding: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                      >
                                        {getScreen(participant.id).isMuted ? <VolumeX size={28} color="white" /> : <Volume2 size={28} color="white" />}
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleFullscreen(participant.id); }}
                                        style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", padding: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                      >
                                        {getScreen(participant.id).isFullscreen ? <Minimize size={28} color="white" /> : <Maximize size={28} color="white" />}
                                      </button>
                                    </div>
                                  </div>
                                <div style={{
                                  position: "absolute",
                                  bottom: "12px",
                                  left: "12px",
                                  padding: "8px 16px",
                                  fontSize: "13px",
                                  fontWeight: "600",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  color: "white",
                                  textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
                                  pointerEvents: "none"
                                }}>
                                  <Monitor size={14} color="white" />
                                  <span>{participant.name}'s Screen</span>
                                </div>
                              </div>
                            )}
                            
                            {/* User Video */}
                        <div style={{ 
                          position: "relative",
                          borderRadius: "16px",
                          overflow: "hidden",
                          boxShadow: isSpeaking 
                            ? "0 0 0 3px #10b981, 0 4px 20px rgba(0, 0, 0, 0.3)"
                            : "0 4px 20px rgba(0, 0, 0, 0.3)",
                          border: isSpeaking
                            ? "2px solid #10b981"
                            : participant.isSelf 
                              ? "2px solid rgba(59, 130, 246, 0.3)" 
                              : "2px solid rgba(16, 185, 129, 0.3)",
                          width: "100%",
                          height: "auto",
                          aspectRatio: "16/9",
                          transition: "all 0.3s ease"
                        }}>
                          <video
                            ref={(el) => handleVideoRef(el, participant)}
                            autoPlay
                            muted={participant.isSelf}
                            playsInline
                            style={{ 
                              width: "100%", 
                              height: "100%",
                              objectFit: "cover",
                              background: "#1e293b",
                              transform: participant.isSelf ? "scaleX(-1)" : "none"
                            }}
                          />
                          
                          {/* Profile Picture Overlay - Show when camera is off */}
                          {((participant.isSelf && !isCameraOn) || 
                           (!participant.isSelf && participantMediaStatus[participant.id]?.isCameraOn === false))
                           && (
                            <>
                              {/* Sound wave rings when speaking */}
                              {isSpeaking && (
                                <>
                                  <div className="sound-wave" style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    width: "100px",
                                    height: "100px",
                                    borderRadius: "12px",
                                    border: "3px solid #10b981",
                                    pointerEvents: "none"
                                  }} />
                                  <div className="sound-wave" style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    width: "100px",
                                    height: "100px",
                                    borderRadius: "12px",
                                    border: "3px solid #10b981",
                                    pointerEvents: "none",
                                    animationDelay: "0.5s"
                                  }} />
                                </>
                              )}
                              
                              <div style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              width: "80px",
                              height: "80px",
                              borderRadius: "12px",
                              background: participant.profilePic 
                                ? `url(${participant.profilePic}) center/cover` 
                                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "32px",
                              fontWeight: "bold",
                              color: "white",
                              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                              border: "2px solid rgba(255, 255, 255, 0.2)"
                            }}>
                              {!participant.profilePic && 
                                participant.name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
                              }
                            </div>
                            </>
                          )}
                          
                          <div style={{
                            position: "absolute",
                            bottom: "12px",
                            left: "12px",
                            background: "rgba(0, 0, 0, 0.8)",
                            backdropFilter: "blur(10px)",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}>
                            <span>{participant.name}</span>
                            {participant.isSelf && !isCameraOn && <VideoOff size={10} />}
                            {participant.isSelf && !isMicOn && <MicOff size={10} />}
                            {!participant.isSelf && participantMediaStatus[participant.id]?.isCameraOn === false && <VideoOff size={10} />}
                            {!participant.isSelf && participantMediaStatus[participant.id]?.isMicOn === false && <MicOff size={10} />}
                            {!participant.isSelf && participant.connectionStatus === "connected" && (
                              <Circle size={8} fill="#10b981" color="#10b981" />
                            )}
                            {!participant.isSelf && participant.connectionStatus === "connecting" && (
                              <Circle size={8} fill="#f59e0b" color="#f59e0b" />
                            )}
                            {!participant.isSelf && participant.connectionStatus === "failed" && (
                              <Circle size={8} fill="#ef4444" color="#ef4444" />
                            )}
                          </div>
                        </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Desktop: Carousel with 2 people per slide
                const totalSlides = calculateTotalSlides();

                return (
                  <>
                    {/* Screenshares Section - Above all user containers */}
                    {screensharesOnSlide.length > 0 && (
                      <div style={{
                        width: "100%",
                        marginBottom: "24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px"
                      }}>
                        {screensharesOnSlide.map((participant) => (
                          <div
                            id={`screen-container-${participant.id}`}
                            key={`screen-${participant.id}`}
                            onClick={() => handleScreenTap(participant.id)}
                            style={{
                              position: "relative",
                              borderRadius: "20px",
                              overflow: "hidden",
                              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                              border: "2px solid rgba(59, 130, 246, 0.5)",
                              width: "100%",
                              maxWidth: "1000px",
                              margin: "0 auto",
                              aspectRatio: "16/9",
                              background: "black",
                              cursor: "pointer",
                              touchAction: "manipulation"
                            }}>
                            <video
                              id={`screen-video-${participant.id}`}
                              key={`screen-video-${participant.id}`}
                              autoPlay
                              playsInline
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                background: "black",
                                display: "block"
                              }}
                              ref={(el) => {
                                if (el && participant.screenStream && el.srcObject !== participant.screenStream) {
                                  el.srcObject = participant.screenStream;
                                  el.addEventListener("loadedmetadata", () => setTimeout(() => syncVideoState(participant.id), 200), { once: true });
                                }
                              }}
                            />
                            {/* Overlay controls — always in DOM, shown via CSS class */}
                            <div className={`screen-controls${getScreen(participant.id).showControls ? " visible" : ""}`} style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(0,0,0,0.4)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 50
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); togglePlay(participant.id); }}
                                  style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", padding: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  {getScreen(participant.id).isPlaying ? <Pause size={28} color="white" /> : <Play size={28} color="white" />}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleMute(participant.id); }}
                                  style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", padding: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  {getScreen(participant.id).isMuted ? <VolumeX size={28} color="white" /> : <Volume2 size={28} color="white" />}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(participant.id); }}
                                  style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", padding: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  {getScreen(participant.id).isFullscreen ? <Minimize size={28} color="white" /> : <Maximize size={28} color="white" />}
                                </button>
                              </div>
                            </div>
                            <div style={{
                              position: "absolute",
                              bottom: "12px",
                              left: "12px",
                              padding: "6px 12px",
                              fontSize: "14px",
                              fontWeight: "500",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "white",
                              textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
                              pointerEvents: "none"
                            }}>
                              <span>{participant.name}'s Screen</span>
                              <Monitor size={12} color="#3b82f6" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Video Grid for Current Slide */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: currentParticipants.length === 1 ? "1fr" : "repeat(2, 1fr)",
                      gap: "20px",
                      width: "100%",
                      maxWidth: currentParticipants.length === 1 ? "600px" : "100%",
                      margin: "0 auto",
                      transition: "all 0.3s ease"
                    }}>
                      {currentParticipants.map((participant) => {
                        const isSpeaking = speakingUsers[participant.id];
                        
                        return (
                        <div key={`${participant.id}-${currentSlide}`} style={{ 
                          position: "relative",
                          borderRadius: "16px",
                          overflow: "hidden",
                          boxShadow: isSpeaking 
                            ? "0 0 0 3px #10b981, 0 4px 20px rgba(0, 0, 0, 0.3)"
                            : "0 4px 20px rgba(0, 0, 0, 0.3)",
                          border: isSpeaking
                            ? "2px solid #10b981"
                            : participant.isSelf 
                              ? "2px solid rgba(59, 130, 246, 0.3)" 
                              : "2px solid rgba(16, 185, 129, 0.3)",
                          aspectRatio: "16/9",
                          maxHeight: "400px",
                          transition: "all 0.3s ease"
                        }}>
                          <video
                            ref={(el) => handleVideoRef(el, participant)}
                            autoPlay
                            muted={participant.isSelf}
                            playsInline
                            style={{ 
                              width: "100%", 
                              height: "100%",
                              objectFit: "cover",
                              background: "#1e293b",
                              transform: participant.isSelf ? "scaleX(-1)" : "none"
                            }}
                          />
                          
                          {/* Profile Picture Overlay - Show when camera is off */}
                          {((participant.isSelf && !isCameraOn) || 
                           (!participant.isSelf && participantMediaStatus[participant.id]?.isCameraOn === false))
                           && (
                            <>
                              {/* Sound wave rings when speaking */}
                              {isSpeaking && (
                                <>
                                  <div className="sound-wave" style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    width: "140px",
                                    height: "140px",
                                    borderRadius: "16px",
                                    border: "3px solid #10b981",
                                    pointerEvents: "none"
                                  }} />
                                  <div className="sound-wave" style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    width: "140px",
                                    height: "140px",
                                    borderRadius: "16px",
                                    border: "3px solid #10b981",
                                    pointerEvents: "none",
                                    animationDelay: "0.5s"
                                  }} />
                                </>
                              )}
                              
                              <div style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              width: "120px",
                              height: "120px",
                              borderRadius: "16px",
                              background: participant.profilePic 
                                ? `url(${participant.profilePic}) center/cover` 
                                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "48px",
                              fontWeight: "bold",
                              color: "white",
                              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                              border: "3px solid rgba(255, 255, 255, 0.2)"
                            }}>
                              {!participant.profilePic && 
                                participant.name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
                              }
                            </div>
                            </>
                          )}
                          
                          <div style={{
                            position: "absolute",
                            bottom: "12px",
                            left: "12px",
                            background: "rgba(0, 0, 0, 0.8)",
                            backdropFilter: "blur(10px)",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}>
                            <span>{participant.name}</span>
                            {participant.isSelf && !isCameraOn && <VideoOff size={12} />}
                            {participant.isSelf && !isMicOn && <MicOff size={12} />}
                            {!participant.isSelf && participantMediaStatus[participant.id]?.isCameraOn === false && <VideoOff size={12} />}
                            {!participant.isSelf && participantMediaStatus[participant.id]?.isMicOn === false && <MicOff size={12} />}
                            {!participant.isSelf && participant.connectionStatus === "connected" && (
                              <Circle size={8} fill="#10b981" color="#10b981" />
                            )}
                            {!participant.isSelf && participant.connectionStatus === "connecting" && (
                              <Circle size={8} fill="#f59e0b" color="#f59e0b" />
                            )}
                            {!participant.isSelf && participant.connectionStatus === "failed" && (
                              <Circle size={8} fill="#ef4444" color="#ef4444" />
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    {/* Navigation Arrows - Desktop only */}
                    {totalSlides > 1 && (
                      <>
                        {/* Left Arrow */}
                        {currentSlide > 0 && (
                          <button
                            onClick={prevSlide}
                            style={{
                              position: "absolute",
                              left: "-70px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "rgba(30, 41, 59, 0.9)",
                              border: "2px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "50%",
                              width: "50px",
                              height: "50px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              fontSize: "24px",
                              color: "white",
                              transition: "all 0.2s",
                              zIndex: 10
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(59, 130, 246, 0.9)";
                              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(30, 41, 59, 0.9)";
                              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                            }}
                          >
                            ‹
                          </button>
                        )}

                        {/* Right Arrow */}
                        {currentSlide < totalSlides - 1 && (
                          <button
                            onClick={nextSlide}
                            style={{
                              position: "absolute",
                              right: "-70px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "rgba(30, 41, 59, 0.9)",
                              border: "2px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "50%",
                              width: "50px",
                              height: "50px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              fontSize: "24px",
                              color: "white",
                              transition: "all 0.2s",
                              zIndex: 10
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(59, 130, 246, 0.9)";
                              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(30, 41, 59, 0.9)";
                              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                            }}
                          >
                            ›
                          </button>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Slide Indicators (Dots) - Desktop only */}
            {(() => {
              const isMobile = isMobileState;
              
              // No pagination on mobile, so no dots needed
              if (isMobile) return null;
              
              const totalSlides = calculateTotalSlides();
              
              return totalSlides > 1 && (
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "15px",
                  paddingTop: "15px",
                  paddingBottom: "20px",
                  position: "relative",
                  zIndex: 50
                }}>
                  {/* Dots */}
                  <div style={{
                    display: "flex",
                    gap: "10px"
                  }}>
                    {Array.from({ length: totalSlides }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        style={{
                          width: currentSlide === index ? "30px" : "10px",
                          height: "10px",
                          borderRadius: "5px",
                          border: "none",
                          background: currentSlide === index 
                            ? "#3b82f6" 
                            : "rgba(255, 255, 255, 0.3)",
                          cursor: "pointer",
                          transition: "all 0.3s ease"
                        }}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}

          {/* Hidden Audio Elements for "Hear All" Feature */}
          {hearAll && (() => {
            // Get all remote participants (not self, not screen shares)
            const allRemoteParticipants = Object.entries(remoteStreams)
              .filter(([id]) => !id.endsWith('-screen'))
              .map(([id, stream]) => ({
                id,
                stream,
                name: participants[id]?.name || `User ${id.substring(0, 6)}`
              }));

            return (
              <div style={{ display: 'none' }}>
                {allRemoteParticipants.map(({ id, stream }) => (
                  <audio
                    key={`hear-all-${id}`}
                    ref={(el) => {
                      remoteAudioRefs.current[id] = el;
                      if (el && stream) {
                        el.srcObject = stream;
                        el.muted = isScreenSharing; // mute if screen sharing to prevent echo
                        el.play().catch(err => console.log('Audio play failed:', err));
                      }
                    }}
                    autoPlay
                    playsInline
                  />
                ))}
              </div>
            );
          })()}
          </div>

          {/* Control Buttons - Fixed at bottom */}
          <div style={{ 
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            pointerEvents: "none"
          }}>
            {/* Peek handle — fixed at very bottom, shown when footer is hidden */}
            <div
              onClick={() => {
                setFooterVisible(true);
                clearTimeout(footerTimerRef.current);
                footerTimerRef.current = setTimeout(() => setFooterVisible(false), 4000);
              }}
              style={{
                pointerEvents: "auto",
                position: "absolute",
                bottom: footerVisible ? "-48px" : "10px",
                left: "50%",
                transform: footerVisible ? "translateX(-50%) scale(0.85)" : "translateX(-50%) scale(1)",
                opacity: footerVisible ? 0 : 1,
                transition: "bottom 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "80px",
                height: "28px",
                background: "rgba(30, 41, 59, 0.85)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)"
              }}
              title="Show controls"
            >
              <svg width="28" height="10" viewBox="0 0 28 10" fill="none">
                <path
                  d="M4 8 Q14 2 24 8"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>

            {/* The actual control bar */}
            <div
              style={{
                pointerEvents: footerVisible ? "auto" : "none",
                width: "100%",
                display: "flex",
                gap: isMobileState ? "8px" : "12px",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "center",
                padding: isMobileState ? "12px" : "20px",
                background: "rgba(15, 23, 42, 0.95)",
                backdropFilter: "blur(10px)",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                transform: footerVisible ? "translateY(0)" : "translateY(110%)",
                opacity: footerVisible ? 1 : 0,
                transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
                willChange: "transform"
              }}
            >
            {(() => {
              const isMobile = isMobileState;
              const buttonSize = isMobile ? "48px" : "56px";
              const iconSize = isMobile ? 20 : 24;
              const buttonStyle = {
                padding: isMobile ? "12px" : "16px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                minWidth: buttonSize,
                minHeight: buttonSize
              };

              return (
                <>
                  <button 
                    onClick={toggleCamera}
                    title="Toggle Camera (Alt+V)"
                    style={{
                      ...buttonStyle,
                      background: isCameraOn ? "#10b981" : "#ef4444",
                      color: "white"
                    }}
                    onMouseEnter={(e) => !isMobile && (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => !isMobile && (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    {isCameraOn ? <Video size={iconSize} /> : <VideoOff size={iconSize} />}
                  </button>

                  <button 
                    onClick={toggleMic}
                    title="Toggle Microphone (Alt+A)"
                    style={{
                      ...buttonStyle,
                      background: isMicOn ? "#10b981" : "#ef4444",
                      color: "white"
                    }}
                    onMouseEnter={(e) => !isMobile && (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => !isMobile && (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    {isMicOn ? <Mic size={iconSize} /> : <MicOff size={iconSize} />}
                  </button>

                  {/* Hide screen share button on mobile */}
                  {!isMobile && (
                    <button 
                      onClick={toggleScreenShare}
                      title="Share Screen (Alt+S)"
                      style={{
                        ...buttonStyle,
                        background: isScreenSharing ? "#3b82f6" : "#475569",
                        color: "white"
                      }}
                      onMouseEnter={(e) => !isMobile && (e.currentTarget.style.transform = "translateY(-2px)")}
                      onMouseLeave={(e) => !isMobile && (e.currentTarget.style.transform = "translateY(0)")}
                    >
                      {isScreenSharing ? <MonitorOff size={iconSize} /> : <Monitor size={iconSize} />}
                    </button>
                  )}

                  <button 
                    onClick={() => setShowParticipants(!showParticipants)}
                    title="View Participants (Alt+P)"
                    style={{
                      ...buttonStyle,
                      background: showParticipants ? "#3b82f6" : "#475569",
                      color: "white"
                    }}
                    onMouseEnter={(e) => !isMobile && (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => !isMobile && (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    <Users size={iconSize} />
                  </button>

                  <button 
                    onClick={toggleChat}
                    title="Toggle Chat (Alt+C)"
                    style={{
                      ...buttonStyle,
                      background: showChat ? "#3b82f6" : "#475569",
                      color: "white",
                      position: "relative"
                    }}
                    onMouseEnter={(e) => !isMobile && (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => !isMobile && (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    <MessageSquare size={iconSize} />
                    {unreadCount > 0 && (
                      <span style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        background: "#ef4444",
                        color: "white",
                        borderRadius: "50%",
                        width: isMobile ? "20px" : "24px",
                        height: isMobile ? "20px" : "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: isMobile ? "10px" : "12px",
                        fontWeight: "bold"
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={leaveMeeting}
                    title="Leave Assembly (Alt+L)"
                    style={{
                      ...buttonStyle,
                      background: "#dc2626",
                      color: "white"
                    }}
                    onMouseEnter={(e) => {
                      if (!isMobile) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.background = "#b91c1c";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isMobile) {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.background = "#dc2626";
                      }
                    }}
                  >
                    <PhoneOff size={iconSize} />
                  </button>

                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    title="Settings & Info"
                    style={{
                      ...buttonStyle,
                      background: showSettings ? "#3b82f6" : "#475569",
                      color: "white"
                    }}
                    onMouseEnter={(e) => !isMobile && (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => !isMobile && (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    <Menu size={iconSize} />
                  </button>
                </>
              );
            })()}
            </div>
            {/* End control bar inner */}
          </div>
          {/* End control bar outer wrapper */}

          {/* Settings Panel */}
          {showSettings && (
            <div style={{
              position: "fixed",
              top: window.innerWidth <= 768 ? "50%" : "80px",
              left: window.innerWidth <= 768 ? "50%" : "auto",
              right: window.innerWidth <= 768 ? "auto" : "20px",
              transform: window.innerWidth <= 768 ? "translate(-50%, -50%)" : "none",
              background: "#1e293b",
              borderRadius: "12px",
              minWidth: window.innerWidth <= 768 ? "90%" : "300px",
              maxWidth: window.innerWidth <= 768 ? "90%" : "400px",
              width: window.innerWidth <= 768 ? "90%" : "auto",
              maxHeight: window.innerWidth <= 768 ? "85vh" : "calc(100vh - 120px)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
            className="settings-panel"
            >
              {/* Sticky Header */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px",
                paddingBottom: "15px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                background: "#1e293b",
                borderTopLeftRadius: "12px",
                borderTopRightRadius: "12px",
                position: "sticky",
                top: 0,
                zIndex: 1
              }}>
                <h3 style={{ margin: 0 }}>
                  Settings & Info
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div style={{
                overflowY: "auto",
                padding: "20px",
                paddingTop: "20px",
                scrollbarWidth: "thin",
                scrollbarColor: "#475569 #1e293b",
                WebkitOverflowScrolling: "touch",
                flex: 1
              }}
              className="settings-content"
              >
              {/* Debug Info Section */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ 
                  margin: "0 0 12px 0", 
                  fontSize: "14px", 
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Debug Information
                </h4>
                <div style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  lineHeight: "1.8"
                }}>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "#94a3b8" }}>Socket:</span>
                    <span style={{ 
                      fontWeight: "600",
                      color: debugInfo.socketConnected ? "#10b981" : "#ef4444"
                    }}>
                      {debugInfo.socketConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "#94a3b8" }}>Session Time:</span>
                    <span style={{ fontWeight: "600", color: "#3b82f6" }}>{formatTimer(sessionTimer)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>Room Code:</span>
                    <span style={{ fontWeight: "600", fontFamily: "monospace" }}>{code}</span>
                  </div>
                </div>
              </div>

              {/* Chat Settings Section */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ 
                  margin: "0 0 12px 0", 
                  fontSize: "14px", 
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Chat Settings
                </h4>
                <button
                  onClick={resetChatPosition}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "rgba(59, 130, 246, 0.1)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: "8px",
                    color: "#3b82f6",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                    position: "relative",
                    overflow: "hidden",
                    height: "44px"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
                    e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
                  }}
                >
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    height: "24px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transform: showChatReset ? "translateY(-100%)" : "translateY(0)",
                      transition: "transform 0.3s ease-in-out",
                      height: "24px"
                    }}>
                      <MessageSquare size={16} />
                      Reset Chat Position
                    </div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      transform: showChatReset ? "translateY(-100%)" : "translateY(0)",
                      transition: "transform 0.3s ease-in-out",
                      height: "24px",
                      color: "#10b981",
                      fontWeight: "600"
                    }}>
                      <Check size={16} /> Chat is in its default position
                    </div>
                  </div>
                </button>
              </div>

              {/* Audio Settings Section */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ 
                  margin: "0 0 12px 0", 
                  fontSize: "14px", 
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Audio Settings
                </h4>
                <div style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "12px",
                  borderRadius: "8px"
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    gap: "12px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                      {hearAll ? <Volume2 size={18} color="#10b981" style={{ flexShrink: 0 }} /> : <VolumeX size={18} color="#94a3b8" style={{ flexShrink: 0 }} />}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                          Hear All Participants
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {hearAll ? "Hearing audio from all slides" : "Only hearing current slide"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setHearAll(!hearAll)}
                      style={{
                        width: "64px",
                        flexShrink: 0,
                        padding: "8px 0",
                        background: hearAll ? "#10b981" : "#475569",
                        border: "none",
                        borderRadius: "6px",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                    >
                      {hearAll ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Management Section (Host Only) */}
              {isHost && (
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ 
                    margin: "0 0 12px 0", 
                    fontSize: "14px", 
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Assembly Security (Host Only)
                  </h4>
                  <div style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    padding: "12px",
                    borderRadius: "8px"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      marginBottom: isLocked || showPasswordInput ? "12px" : "0"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isLocked ? <Lock size={18} color="#ef4444" /> : <LockOpen size={18} color="#10b981" />}
                        <div>
                          <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                            {isLocked ? "Assembly Locked" : "Assembly Unlocked"}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                            {isLocked ? "Password required to join" : "Anyone with code can join"}
                          </div>
                        </div>
                      </div>
                      {!showPasswordInput && (
                        <button
                          onClick={() => {
                            if (isLocked) {
                              handleRemovePassword();
                            } else {
                              setShowPasswordInput(true);
                            }
                          }}
                          style={{
                            padding: "8px 16px",
                            background: isLocked ? "#ef4444" : "#10b981",
                            border: "none",
                            borderRadius: "6px",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "600",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                        >
                          {isLocked ? "Unlock" : "Lock"}
                        </button>
                      )}
                    </div>
                    
                    {/* Show password reveal when locked */}
                    {isLocked && revealedPassword && !showPasswordInput && (
                      <div style={{
                        background: "rgba(59, 130, 246, 0.1)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: "6px",
                        padding: "10px",
                        marginBottom: "12px"
                      }}>
                        <div style={{ 
                          fontSize: "11px", 
                          color: "#94a3b8", 
                          marginBottom: "6px",
                          fontWeight: "500"
                        }}>
                          Current Password:
                        </div>
                        <div style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "8px",
                          justifyContent: "space-between"
                        }}>
                          <div style={{
                            fontFamily: "monospace",
                            fontSize: "16px",
                            color: "white",
                            fontWeight: "600",
                            letterSpacing: showRevealedPassword ? "0.5px" : "3px",
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}>
                            {showRevealedPassword ? revealedPassword : "•••••••"}
                          </div>
                          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                            <button
                              onClick={() => setShowRevealedPassword(!showRevealedPassword)}
                              style={{
                                background: "rgba(255, 255, 255, 0.1)",
                                border: "none",
                                borderRadius: "4px",
                                color: "#94a3b8",
                                cursor: "pointer",
                                padding: "0 10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px",
                                fontSize: "11px",
                                fontWeight: "600",
                                transition: "all 0.2s",
                                width: "64px",
                                height: "30px",
                                flexShrink: 0
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                            >
                              {showRevealedPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                              {showRevealedPassword ? "Hide" : "Show"}
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(revealedPassword);
                                showNotification("Password copied to clipboard", "success");
                              }}
                              style={{
                                background: "rgba(59, 130, 246, 0.2)",
                                border: "none",
                                borderRadius: "4px",
                                color: "#3b82f6",
                                cursor: "pointer",
                                padding: "0 10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px",
                                fontSize: "11px",
                                fontWeight: "600",
                                transition: "all 0.2s",
                                width: "64px",
                                height: "30px",
                                flexShrink: 0
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(59, 130, 246, 0.3)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)"}
                            >
                              <Copy size={13} />
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {showPasswordInput && (
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ position: "relative" }}>
                          <input
                            type={showMeetingPassword ? "text" : "password"}
                            placeholder="Enter password"
                            value={meetingPassword}
                            maxLength={9}
                            onChange={(e) => {
                              setMeetingPassword(e.target.value.slice(0, 9));
                              setPasswordError("");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSetPassword();
                              }
                            }}
                            style={{
                              width: "100%",
                              padding: "10px",
                              paddingRight: "40px",
                              background: "rgba(255, 255, 255, 0.1)",
                              border: passwordError ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.2)",
                              borderRadius: "6px",
                              color: "white",
                              fontSize: "14px",
                              marginBottom: "4px"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowMeetingPassword(!showMeetingPassword)}
                            style={{
                              position: "absolute",
                              right: "10px",
                              top: "10px",
                              background: "transparent",
                              border: "none",
                              color: "#94a3b8",
                              cursor: "pointer",
                              padding: "0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            {showMeetingPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {passwordError && (
                          <div style={{ color: "#ef4444", fontSize: "12px", marginBottom: "8px" }}>
                            {passwordError}
                          </div>
                        )}
                        <div style={{
                          textAlign: "right",
                          fontSize: "11px",
                          color: meetingPassword.length === 9 ? "#ef4444" : "#64748b",
                          marginBottom: "8px"
                        }}>
                          {meetingPassword.length}/9
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={handleSetPassword}
                            style={{
                              flex: 1,
                              padding: "8px",
                              background: "#10b981",
                              border: "none",
                              borderRadius: "6px",
                              color: "white",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}
                          >
                            Set Password
                          </button>
                          <button
                            onClick={() => {
                              setShowPasswordInput(false);
                              setMeetingPassword("");
                              setPasswordError("");
                              setShowMeetingPassword(false);
                            }}
                            style={{
                              flex: 1,
                              padding: "8px",
                              background: "rgba(255, 255, 255, 0.1)",
                              border: "none",
                              borderRadius: "6px",
                              color: "white",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Host Controls Section (Host Only) */}
              {isHost && Object.keys(remoteStreams).filter(id => !id.endsWith('-screen')).length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ 
                    margin: "0 0 12px 0", 
                    fontSize: "14px", 
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Host Controls
                  </h4>
                  <div style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    padding: "12px",
                    borderRadius: "8px",
                    maxHeight: "300px",
                    overflowY: "auto"
                  }}>
                    {Object.entries(remoteStreams)
                      .filter(([userId]) => !userId.endsWith('-screen'))
                      .map(([userId]) => {
                        const participant = participants[userId];
                        const displayName = participant?.name || `User ${userId.substring(0, 6)}`;
                        
                        return (
                          <div key={userId} style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px",
                            marginBottom: "8px",
                            background: "rgba(255, 255, 255, 0.05)",
                            borderRadius: "6px"
                          }}>
                            <span style={{ fontSize: "14px" }}>{displayName}</span>
                            {showRemoveConfirm === userId ? (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  onClick={() => handleRemoveParticipant(userId)}
                                  style={{
                                    padding: "6px 12px",
                                    background: "#ef4444",
                                    border: "none",
                                    borderRadius: "4px",
                                    color: "white",
                                    cursor: "pointer",
                                    fontSize: "11px",
                                    fontWeight: "600"
                                  }}
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setShowRemoveConfirm(null)}
                                  style={{
                                    padding: "6px 12px",
                                    background: "rgba(255, 255, 255, 0.1)",
                                    border: "none",
                                    borderRadius: "4px",
                                    color: "white",
                                    cursor: "pointer",
                                    fontSize: "11px",
                                    fontWeight: "600"
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowRemoveConfirm(userId)}
                                style={{
                                  padding: "6px 12px",
                                  background: "#ef4444",
                                  border: "none",
                                  borderRadius: "4px",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Network Settings Section - hidden, uncomment {false && to restore */}
              {false && <div style={{ marginBottom: "20px" }}>
                <h4 style={{ 
                  margin: "0 0 12px 0", 
                  fontSize: "14px", 
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Network Settings
                </h4>
                <div style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "13px"
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: "8px"
                  }}>
                    <div>
                      <div style={{ fontWeight: "600", marginBottom: "4px" }}>Force TURN Relay</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.4" }}>
                        Force all media through TURN server (for testing mobile networks)
                      </div>
                    </div>
                    <label style={{ 
                      position: "relative", 
                      display: "inline-block", 
                      width: "44px", 
                      height: "24px",
                      marginLeft: "12px",
                      flexShrink: 0
                    }}>
                      <input
                        type="checkbox"
                        checked={localStorage.getItem('forceRelay') === 'true'}
                        onChange={(e) => {
                          localStorage.setItem('forceRelay', e.target.checked.toString());
                          showNotification(
                            e.target.checked 
                              ? "Force relay enabled - Rejoin assembly to apply" 
                              : "Force relay disabled - Rejoin assembly to apply",
                            "info"
                          );
                        }}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: "absolute",
                        cursor: "pointer",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: localStorage.getItem('forceRelay') === 'true' ? "#3b82f6" : "#475569",
                        transition: "0.3s",
                        borderRadius: "24px"
                      }}>
                        <span style={{
                          position: "absolute",
                          content: "",
                          height: "18px",
                          width: "18px",
                          left: localStorage.getItem('forceRelay') === 'true' ? "23px" : "3px",
                          bottom: "3px",
                          backgroundColor: "white",
                          transition: "0.3s",
                          borderRadius: "50%"
                        }} />
                      </span>
                    </label>
                  </div>
                  <div style={{
                    fontSize: "11px",
                    color: "#fbbf24",
                    background: "rgba(251, 191, 36, 0.1)",
                    padding: "8px",
                    borderRadius: "6px",
                    marginTop: "8px"
                  }}>
                    ⚠️ Requires rejoining the assembly to take effect. Check console for ICE candidate types.
                  </div>
                </div>
              </div>}

              {/* Keyboard Shortcuts Section - Hidden on mobile/tablet */}
              {window.innerWidth > 768 && (
              <div>
                <h4 style={{ 
                  margin: "0 0 12px 0", 
                  fontSize: "14px", 
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <Keyboard size={16} />
                  Keyboard Shortcuts
                </h4>
                <div style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "13px"
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: "10px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
                  }}>
                    <span style={{ color: "#94a3b8" }}>Toggle Camera</span>
                    <kbd style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontFamily: "monospace"
                    }}>Alt + V</kbd>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: "10px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
                  }}>
                    <span style={{ color: "#94a3b8" }}>Toggle Microphone</span>
                    <kbd style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontFamily: "monospace"
                    }}>Alt + A</kbd>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: "10px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
                  }}>
                    <span style={{ color: "#94a3b8" }}>Toggle Screen Share</span>
                    <kbd style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontFamily: "monospace"
                    }}>Alt + S</kbd>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: "10px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
                  }}>
                    <span style={{ color: "#94a3b8" }}>Toggle Participants</span>
                    <kbd style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontFamily: "monospace"
                    }}>Alt + P</kbd>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: "10px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
                  }}>
                    <span style={{ color: "#94a3b8" }}>Toggle Chat</span>
                    <kbd style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontFamily: "monospace"
                    }}>Alt + C</kbd>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: "10px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
                  }}>
                    <span style={{ color: "#94a3b8" }}>Leave Assembly</span>
                    <kbd style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontFamily: "monospace"
                    }}>Alt + L</kbd>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: "10px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
                  }}>
                    <span style={{ color: "#94a3b8" }}>Previous Slide</span>
                    <kbd style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontFamily: "monospace"
                    }}>← Left Arrow</kbd>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center"
                  }}>
                    <span style={{ color: "#94a3b8" }}>Next Slide</span>
                    <kbd style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontFamily: "monospace"
                    }}>→ Right Arrow</kbd>
                  </div>
                </div>
              </div>
              )}

              {/* Troubleshooting Section */}
              {(() => {
                const issues = [
                  {
                    Icon: VolumeX,
                    color: "#ef4444",
                    title: "Can't hear audio from screen share",
                    fixes: [
                      "Make sure the presenter enabled 'Share audio' when starting screen share",
                      "Enable 'Hear All Participants' in Audio Settings above",
                      "Check your device volume and make sure it is not muted",
                      "Right-click the browser tab and check it is not muted",
                      "Make sure you are on the same slide as the screen share",
                      "Try rejoining the assembly",
                    ]
                  },
                  {
                    Icon: Volume2,
                    color: "#f59e0b",
                    title: "Can't hear everyone in the call",
                    fixes: [
                      "Enable 'Hear All Participants' toggle in Audio Settings above — you may only be hearing the current slide",
                      "Check your device volume is turned up",
                      "Ask participants to unmute themselves",
                      "Check if your browser tab is muted (right-click tab → Unmute)",
                      "Rejoin the assembly to reset audio connections",
                    ]
                  },
                  {
                    Icon: MessageCircleOff,
                    color: "#8b5cf6",
                    title: "Chat window not visible after opening",
                    fixes: [
                      "Click 'Reset Chat Position' in Chat Settings above — the chat may have moved off-screen",
                      "The chat window may be hidden behind other elements — try resetting its position",
                      "On mobile, the chat opens as a full panel — tap the chat icon again",
                    ]
                  },
                  {
                    Icon: MessageSquare,
                    color: "#6366f1",
                    title: "Chat is half cut off or out of bounds",
                    fixes: [
                      "Drag the chat window from the top bar to reposition it on screen",
                      "Drag from the bottom-right corner to resize the chat window",
                      "Click 'Reset Chat Position' in Chat Settings above to snap it back to default",
                    ]
                  },
                  {
                    Icon: Users,
                    color: "#10b981",
                    title: "Can't see anyone in the conference",
                    fixes: [
                      "Double-check the assembly code is correct — ask the host to resend it",
                      "Refresh the page and rejoin with the same code",
                      "Wait a few seconds — peer connections can take time to establish",
                      "Ask other participants if they can see each other (may be a host issue)",
                      "Try creating a new assembly and sharing the new code",
                      "Check your internet connection is stable",
                    ]
                  },
                  {
                    Icon: VideoOff,
                    color: "#ef4444",
                    title: "Camera not working or showing black screen",
                    fixes: [
                      "Check if another app (Zoom, Teams) is already using your camera — close it",
                      "Click the lock icon in the browser address bar and allow camera access",
                      "Refresh the page and grant camera permission again when prompted",
                      "Make sure your camera is not disabled in your OS device settings",
                      "Try a different browser — Chrome has the best WebRTC support",
                      "Restart your browser completely and rejoin",
                    ]
                  },
                  {
                    Icon: MicOff,
                    color: "#f97316",
                    title: "Microphone not working / others can't hear you",
                    fixes: [
                      "Click the lock icon in the browser address bar and allow microphone access",
                      "Check the mic button in the bottom control bar — make sure it is unmuted",
                      "Go to your OS sound settings and confirm the correct mic is set as default",
                      "Check for a physical mute button on your headset or microphone",
                      "Close other apps that may be capturing the microphone",
                      "Watch for the speaking indicator — if it lights up, your mic is working",
                      "Rejoin the assembly to reinitialize the audio stream",
                    ]
                  },
                  {
                    Icon: Headphones,
                    color: "#f59e0b",
                    title: "Echo or audio feedback",
                    fixes: [
                      "Use headphones — speakers cause audio to loop back into your mic",
                      "Lower your speaker volume",
                      "Mute yourself when you are not speaking",
                      "Check if you have multiple tabs of the same meeting open and close duplicates",
                      "Ask other participants to mute when not speaking",
                    ]
                  },
                  {
                    Icon: Wifi,
                    color: "#3b82f6",
                    title: "Video is choppy, freezing, or low quality",
                    fixes: [
                      "Check your internet connection — run a speed test",
                      "Move closer to your Wi-Fi router or switch to a wired connection",
                      "Close other bandwidth-heavy apps and browser tabs",
                      "Ask participants to turn off cameras to reduce bandwidth usage",
                      "Avoid screen sharing simultaneously with video on slow connections",
                      "Rejoin — WebRTC will renegotiate a better quality connection",
                    ]
                  },
                  {
                    Icon: MonitorX,
                    color: "#64748b",
                    title: "Screen share not starting or showing blank",
                    fixes: [
                      "Allow screen sharing permission when the browser prompts you",
                      "On macOS: System Preferences → Security & Privacy → Screen Recording → allow your browser",
                      "Select the correct window, tab, or screen when the picker appears",
                      "Try sharing a specific browser tab instead of the entire screen",
                      "Refresh the page and try again",
                      "Safari has limited screen share support — use Chrome or Firefox instead",
                    ]
                  },
                  {
                    Icon: UserX,
                    color: "#94a3b8",
                    title: "Disconnected or removed from the meeting",
                    fixes: [
                      "Check your internet connection",
                      "You may have been removed by the host",
                      "The session may have ended because the host left",
                      "Your session token may have expired — log out and log back in",
                      "Rejoin using the same meeting code",
                    ]
                  },
                  {
                    Icon: Lock,
                    color: "#ef4444",
                    title: "Can't join — assembly is locked or wrong password",
                    fixes: [
                      "Ask the host for the correct password",
                      "Passwords are case-sensitive — type it exactly as given",
                      "Ask the host to temporarily unlock the assembly",
                      "Confirm you have the correct meeting code",
                    ]
                  },
                  {
                    Icon: Smartphone,
                    color: "#06b6d4",
                    title: "Issues on mobile device",
                    fixes: [
                      "Use Chrome on Android or Safari on iOS for best compatibility",
                      "Allow camera and microphone in your mobile browser settings",
                      "Screen sharing is not supported on iOS browsers — use a desktop",
                      "If audio cuts out, lock and unlock your screen to restore it",
                      "Avoid switching apps mid-call — it pauses your media streams",
                      "Keep your screen on to prevent the browser from suspending",
                    ]
                  },
                  {
                    Icon: Zap,
                    color: "#f59e0b",
                    title: "High latency or delay in audio / video",
                    fixes: [
                      "Switch to 5GHz Wi-Fi or a wired ethernet connection",
                      "Close background apps consuming CPU or bandwidth",
                      "Reduce active video streams — ask some participants to turn off cameras",
                      "Disable your VPN if you are using one — it adds significant latency",
                      "Rejoin — the server will attempt to find a better routing path",
                    ]
                  },
                  {
                    Icon: RefreshCw,
                    color: "#10b981",
                    title: "Page is unresponsive or UI is frozen",
                    fixes: [
                      "Hard refresh: Ctrl+Shift+R on Windows / Cmd+Shift+R on Mac",
                      "Check if your CPU is maxed out — close other heavy tabs",
                      "Clear browser cache and cookies, then rejoin",
                      "Try a different browser",
                      "Disable browser extensions such as ad blockers or privacy tools that may interfere",
                    ]
                  },
                ];

                return (
                  <div style={{ marginTop: "8px" }}>
                    <h4 style={{
                      margin: "0 0 12px 0",
                      fontSize: "14px",
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <AlertTriangle size={14} color="#f59e0b" />
                      Troubleshooting
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      {issues.map((issue, i) => {
                        const isOpen = openTroubleshootIndex === i;
                        return (
                          <div key={i} style={{
                            background: isOpen ? "rgba(59,130,246,0.06)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${isOpen ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.07)"}`,
                            borderRadius: "10px",
                            overflow: "hidden",
                            transition: "all 0.2s"
                          }}>
                            <button
                              onClick={() => setOpenTroubleshootIndex(isOpen ? null : i)}
                              style={{
                                width: "100%",
                                padding: "12px 14px",
                                background: "transparent",
                                border: "none",
                                color: "white",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "12px",
                                textAlign: "left"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                                <div style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "8px",
                                  background: `${issue.color}18`,
                                  border: `1px solid ${issue.color}30`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  <issue.Icon size={15} color={issue.color} />
                                </div>
                                <span style={{ fontSize: "13px", fontWeight: "600", lineHeight: "1.4", color: isOpen ? "#e2e8f0" : "#cbd5e1" }}>
                                  {issue.title}
                                </span>
                              </div>
                              <ChevronDown
                                size={15}
                                color="#475569"
                                style={{
                                  flexShrink: 0,
                                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                  transition: "transform 0.2s"
                                }}
                              />
                            </button>
                            {isOpen && (
                              <div style={{
                                padding: "0 14px 14px 14px",
                                borderTop: "1px solid rgba(255,255,255,0.06)"
                              }}>
                                <p style={{
                                  margin: "12px 0 10px 0",
                                  fontSize: "11px",
                                  color: "#475569",
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.6px"
                                }}>
                                  Possible fixes
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {issue.fixes.map((fix, j) => (
                                    <div key={j} style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: "10px",
                                      fontSize: "13px",
                                      color: "#94a3b8",
                                      lineHeight: "1.55"
                                    }}>
                                      <span style={{
                                        width: "20px",
                                        height: "20px",
                                        borderRadius: "6px",
                                        background: `${issue.color}18`,
                                        border: `1px solid ${issue.color}25`,
                                        color: issue.color,
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        marginTop: "1px"
                                      }}>{j + 1}</span>
                                      <span>{fix}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              </div>
              {/* End Scrollable Content */}
            </div>
          )}
          </div>
          {/* End Main Content Wrapper */}
        </>
      )}
    </div>

    {/* Profile Settings Modal */}
    <Settings
      isOpen={showProfileSettings}
      onClose={() => setShowProfileSettings(false)}
      user={currentUser}
      onUpdate={handleProfileUpdate}
      title="Profile"
      headerIcon="profile"
    />
    </>
  );
}
