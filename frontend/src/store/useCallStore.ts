// src/store/useCallStore.ts
import { create } from "zustand";
import { useChatStore } from "./useChatStore";
import { useAuthStore } from "./useAuthStore";
import { callAudio } from "@/utils/callAudio";

export type CallType = "audio" | "video";
export type CallStatus = "idle" | "calling" | "incoming" | "connected" | "ended";

export interface CallPartner {
  id: string;
  name: string;
  avatar?: string;
  conversationId?: string;
}

interface CallState {
  callStatus: CallStatus;
  callType: CallType;
  partner: CallPartner | null;
  isCaller: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  duration: number; // số giây đã kết nối
  error: string | null;

  startCall: (targetUser: CallPartner, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  initSocketListeners: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

let peerConnection: RTCPeerConnection | null = null;
let durationInterval: NodeJS.Timeout | null = null;
let listenersInitialized = false;

async function getMediaStream(callType: CallType): Promise<MediaStream> {
  if (typeof navigator !== "undefined" && navigator?.mediaDevices?.getUserMedia) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
    } catch (err) {
      console.warn("getUserMedia failed or permission denied, trying audio only fallback:", err);
      if (callType === "video") {
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (e2) {
          console.warn("Audio only fallback failed:", e2);
        }
      }
    }
  }

  // Fallback an toàn cho môi trường không có thiết bị webcam/mic vật lý (tránh crash)
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const dst = osc.connect(ctx.createMediaStreamDestination()) as unknown as { stream: MediaStream };
      osc.start();
      const stream = dst.stream;
      if (callType === "video") {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const canvasCtx = canvas.getContext("2d");
        if (canvasCtx) {
          canvasCtx.fillStyle = "rgb(30, 41, 59)";
          canvasCtx.fillRect(0, 0, 640, 480);
        }
        const videoStream =
          typeof (canvas as unknown as { captureStream?: (fps: number) => MediaStream }).captureStream === "function"
            ? (canvas as unknown as { captureStream: (fps: number) => MediaStream }).captureStream(10)
            : new MediaStream();
        videoStream.getVideoTracks().forEach((track) => stream.addTrack(track));
      }
      return stream;
    }
  } catch {
    // Không thể tạo synthetic stream
  }

  return new MediaStream();
}

function stopMediaTracks(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // Bỏ qua lỗi dừng track
    }
  });
}

export const useCallStore = create<CallState>((set, get) => ({
  callStatus: "idle",
  callType: "audio",
  partner: null,
  isCaller: false,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoEnabled: true,
  duration: 0,
  error: null,

  initSocketListeners: () => {
    if (typeof window === "undefined" || listenersInitialized) return;
    const socket = useChatStore.getState().socket;
    if (!socket) return;

    listenersInitialized = true;

    // Cuộc gọi đến
    socket.on("call:incoming", (data: { callerId: string; callerName: string; callerAvatar?: string; callType: CallType; conversationId?: string }) => {
      const currentStatus = get().callStatus;
      if (currentStatus !== "idle") {
        // Đang bận cuộc gọi khác
        socket.emit("call:reject", { targetUserId: data.callerId, reason: "busy", callType: data.callType, conversationId: data.conversationId });
        return;
      }

      callAudio.startIncomingRingtone();
      set({
        callStatus: "incoming",
        callType: data.callType || "audio",
        isCaller: false,
        partner: {
          id: data.callerId,
          name: data.callerName || "Người dùng",
          avatar: data.callerAvatar,
          conversationId: data.conversationId,
        },
        error: null,
      });
    });

    // Cuộc gọi được chấp nhận (phía người gọi)
    socket.on("call:accepted", async () => {
      callAudio.stop();
      set({ callStatus: "connected", duration: 0 });

      // Bắt đầu đếm thời gian
      if (durationInterval) clearInterval(durationInterval);
      durationInterval = setInterval(() => {
        set((state) => ({ duration: state.duration + 1 }));
      }, 1000);

      // Tạo WebRTC Offer
      const pc = peerConnection;
      const partner = get().partner;
      if (pc && partner) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc:signal", {
            targetUserId: partner.id,
            signal: { type: "offer", sdp: offer.sdp },
          });
        } catch (err) {
          console.error("Lỗi tạo WebRTC Offer:", err);
        }
      }
    });

    // Cuộc gọi bị từ chối
    socket.on("call:rejected", (data: { reason?: string }) => {
      callAudio.stop();
      callAudio.playEndCallTone();
      set({
        callStatus: "ended",
        error: data.reason === "busy" ? "Người dùng đang bận một cuộc gọi khác" : "Cuộc gọi đã bị từ chối",
      });
      setTimeout(() => {
        get().endCall();
      }, 2000);
    });

    // Cuộc gọi kết thúc
    socket.on("call:ended", () => {
      callAudio.stop();
      callAudio.playEndCallTone();
      set({ callStatus: "ended" });
      setTimeout(() => {
        get().endCall();
      }, 1500);
    });

    // Tín hiệu WebRTC (Offer, Answer, Candidate)
    socket.on("webrtc:signal", async (data: { senderId: string; signal: { type?: string; sdp?: string; candidate?: RTCIceCandidateInit } }) => {
      const pc = peerConnection;
      if (!pc) return;

      const { signal } = data;

      try {
        if (signal.type === "offer" && signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: signal.sdp }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("webrtc:signal", {
            targetUserId: data.senderId,
            signal: { type: "answer", sdp: answer.sdp },
          });
        } else if (signal.type === "answer" && signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: signal.sdp }));
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error("Lỗi xử lý WebRTC Signal:", err);
      }
    });
  },

  startCall: async (targetUser: CallPartner, type: CallType) => {
    const socket = useChatStore.getState().socket;
    if (!socket || !socket.connected) {
      alert("Kết nối máy chủ đang gián đoạn. Vui lòng thử lại sau giây lát!");
      return;
    }

    get().initSocketListeners();

    // Dừng chuông cũ nếu có
    callAudio.stop();
    callAudio.startOutgoingRingtone();

    set({
      callStatus: "calling",
      callType: type,
      partner: targetUser,
      isCaller: true,
      error: null,
      duration: 0,
      isMuted: false,
      isVideoEnabled: type === "video",
    });

    const localStream = await getMediaStream(type);
    set({ localStream });

    // Khởi tạo PeerConnection
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnection = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:signal", {
          targetUserId: targetUser.id,
          signal: { candidate: event.candidate.toJSON() },
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        set({ remoteStream: event.streams[0] });
      }
    };

    // Gửi tín hiệu gọi đi
    const me = useAuthStore.getState().user;
    socket.emit("call:initiate", {
      targetUserId: targetUser.id,
      callType: type,
      callerName: me?.name || "Người dùng",
      callerAvatar: me?.avatar,
      conversationId: targetUser.conversationId,
    });
  },

  acceptCall: async () => {
    callAudio.stop();
    const socket = useChatStore.getState().socket;
    const partner = get().partner;
    const callType = get().callType;

    if (!socket || !partner) return;

    set({
      callStatus: "connected",
      duration: 0,
      isMuted: false,
      isVideoEnabled: callType === "video",
    });

    if (durationInterval) clearInterval(durationInterval);
    durationInterval = setInterval(() => {
      set((state) => ({ duration: state.duration + 1 }));
    }, 1000);

    const localStream = await getMediaStream(callType);
    set({ localStream });

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnection = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:signal", {
          targetUserId: partner.id,
          signal: { candidate: event.candidate.toJSON() },
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        set({ remoteStream: event.streams[0] });
      }
    };

    socket.emit("call:accept", { callerId: partner.id });
  },

  rejectCall: () => {
    callAudio.stop();
    const socket = useChatStore.getState().socket;
    const partner = get().partner;

    if (socket && partner) {
      socket.emit("call:reject", {
        targetUserId: partner.id,
        reason: "declined",
        callType: get().callType,
        conversationId: partner.conversationId,
      });
    }

    get().endCall();
  },

  endCall: () => {
    callAudio.stop();
    const currentDuration = get().duration;
    const currentStatus = get().callStatus;
    const currentCallType = get().callType;

    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }

    const socket = useChatStore.getState().socket;
    const partner = get().partner;

    if (socket && partner && currentStatus !== "idle" && currentStatus !== "ended") {
      if (currentStatus === "calling") {
        // Người gọi hủy cuộc gọi trước khi đối phương bắt máy
        socket.emit("call:reject", {
          targetUserId: partner.id,
          reason: "cancelled",
          callType: currentCallType,
          conversationId: partner.conversationId,
        });
      } else {
        // Cuộc gọi đã kết nối hoặc đang kết thúc
        socket.emit("call:end", {
          targetUserId: partner.id,
          duration: currentDuration,
          callType: currentCallType,
          conversationId: partner.conversationId,
        });
      }
    }

    stopMediaTracks(get().localStream);
    stopMediaTracks(get().remoteStream);

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    set({
      callStatus: "idle",
      partner: null,
      isCaller: false,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoEnabled: true,
      duration: 0,
      error: null,
    });
  },

  toggleMute: () => {
    const stream = get().localStream;
    const nextMuted = !get().isMuted;
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
    set({ isMuted: nextMuted });
  },

  toggleVideo: () => {
    const stream = get().localStream;
    const nextVideoEnabled = !get().isVideoEnabled;
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = nextVideoEnabled;
      });
    }
    set({ isVideoEnabled: nextVideoEnabled });
  },
}));
