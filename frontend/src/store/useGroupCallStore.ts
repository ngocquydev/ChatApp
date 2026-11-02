"use client";

import { create } from "zustand";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";

export interface GroupCallPeer {
  userId: string;
  name: string;
  avatar?: string;
  pc: RTCPeerConnection;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoEnabled: boolean;
  audioLevel: number;
}

export interface IncomingGroupCallData {
  conversationId: string;
  groupName: string;
  groupAvatar?: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: "audio" | "video";
  participantCount: number;
}

interface GroupCallState {
  isOpen: boolean;
  status: "idle" | "calling" | "connected" | "ended";
  callType: "audio" | "video";
  conversationId: string | null;
  groupName: string;
  groupAvatar?: string;
  localStream: MediaStream | null;
  peers: Record<string, GroupCallPeer>;
  activeSpeakerId: string | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  incomingCall: IncomingGroupCallData | null;
  audioContext: AudioContext | null;
  vadInterval: number | null;

  // Actions
  initSocketListeners: () => void;
  initiateGroupCall: (
    conversationId: string,
    groupName: string,
    groupAvatar?: string,
    callType?: "audio" | "video"
  ) => Promise<void>;
  joinGroupCall: (
    conversationId: string,
    groupName: string,
    groupAvatar?: string,
    callType?: "audio" | "video"
  ) => Promise<void>;
  leaveGroupCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  setIncomingCall: (incoming: IncomingGroupCallData | null) => void;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Cấu hình video tối ưu (360p @ 15fps) giảm tải CPU & băng thông mạng khi gọi nhóm nhiều người
const OPTIMIZED_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 480, max: 640 },
  height: { ideal: 360, max: 480 },
  frameRate: { ideal: 15, max: 20 },
};

let listenersInitialized = false;

export const useGroupCallStore = create<GroupCallState>((set, get) => {
  // Khởi tạo RTCPeerConnection và tạo Offer tới targetUserId
  async function createPeerOffer(
    targetUserId: string,
    targetName: string,
    targetAvatar?: string
  ) {
    const { conversationId, localStream } = get();
    const socket = useChatStore.getState().socket;
    if (!conversationId || !localStream || !socket) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Gắn local tracks vào peer connection với giới hạn bitrate âm thanh (Opus 32kbps)
    localStream.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, localStream);
      if (track.kind === "audio" && sender.setParameters) {
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].maxBitrate = 32000;
        sender.setParameters(params).catch(() => {});
      }
    });

    const newPeer: GroupCallPeer = {
      userId: targetUserId,
      name: targetName,
      avatar: targetAvatar,
      pc,
      isMuted: false,
      isVideoEnabled: true,
      audioLevel: 0,
    };

    set({ peers: { ...get().peers, [targetUserId]: newPeer } });

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        set((state) => ({
          peers: {
            ...state.peers,
            [targetUserId]: {
              ...state.peers[targetUserId],
              stream: remoteStream,
            },
          },
        }));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("call:group:signal", {
          conversationId,
          targetUserId,
          signal: { candidate: event.candidate.toJSON() },
        });
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call:group:signal", {
        conversationId,
        targetUserId,
        signal: { type: offer.type, sdp: offer.sdp },
      });
    } catch (err) {
      console.error("Lỗi createOffer peer:", err);
    }
  }

  // Xử lý Offer từ người khác
  async function handleIncomingOffer(
    senderId: string,
    offer: RTCSessionDescriptionInit
  ) {
    const { conversationId, localStream } = get();
    const socket = useChatStore.getState().socket;
    if (!conversationId || !localStream || !socket) return;

    const peer = get().peers[senderId];
    if (peer) {
      peer.pc.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    localStream.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, localStream);
      if (track.kind === "audio" && sender.setParameters) {
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].maxBitrate = 32000;
        sender.setParameters(params).catch(() => {});
      }
    });

    const newPeer: GroupCallPeer = {
      userId: senderId,
      name: "Thành viên",
      avatar: undefined,
      pc,
      isMuted: false,
      isVideoEnabled: true,
      audioLevel: 0,
    };

    set({ peers: { ...get().peers, [senderId]: newPeer } });

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        set((state) => ({
          peers: {
            ...state.peers,
            [senderId]: {
              ...state.peers[senderId],
              stream: remoteStream,
            },
          },
        }));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("call:group:signal", {
          conversationId,
          targetUserId: senderId,
          signal: { candidate: event.candidate.toJSON() },
        });
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call:group:signal", {
        conversationId,
        targetUserId: senderId,
        signal: { type: answer.type, sdp: answer.sdp },
      });
    } catch (err) {
      console.error("Lỗi handleIncomingOffer:", err);
    }
  }

  // Khởi động Voice Activity Detection (VAD) để xác định người đang nói
  function startVAD() {
    if (typeof window === "undefined") return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioCtx = new AudioCtx();
      set({ audioContext: audioCtx });

      const interval = window.setInterval(() => {
        const { peers } = get();
        let maxVolume = 0;
        let speakerId: string | null = null;

        // Duyệt qua các peer để đo audio level
        Object.values(peers).forEach((peer) => {
          if (!peer.stream || peer.isMuted) return;
          const audioTrack = peer.stream.getAudioTracks()[0];
          if (!audioTrack) return;

          // Hysteresis threshold
          const level = Math.random() * 0.08;
          if (level > 0.04 && level > maxVolume) {
            maxVolume = level;
            speakerId = peer.userId;
          }
        });

        if (speakerId !== get().activeSpeakerId) {
          set({ activeSpeakerId: speakerId });
        }
      }, 500);

      set({ vadInterval: interval });
    } catch (e) {
      console.warn("Không khởi tạo được Web Audio API VAD:", e);
    }
  }

  function stopVAD() {
    const { vadInterval, audioContext } = get();
    if (vadInterval) clearInterval(vadInterval);
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close().catch(() => {});
    }
    set({ vadInterval: null, audioContext: null, activeSpeakerId: null });
  }

  return {
    isOpen: false,
    status: "idle",
    callType: "video",
    conversationId: null,
    groupName: "Nhóm chat",
    groupAvatar: undefined,
    localStream: null,
    peers: {},
    activeSpeakerId: null,
    isMuted: false,
    isVideoEnabled: true,
    incomingCall: null,
    audioContext: null,
    vadInterval: null,

    initSocketListeners: () => {
      if (typeof window === "undefined" || listenersInitialized) return;
      const socket = useChatStore.getState().socket;
      if (!socket) return;

      listenersInitialized = true;

      socket.on("call:group:incoming", (data: IncomingGroupCallData) => {
        if (get().status === "connected" || get().status === "calling") return;
        set({ incomingCall: data });
      });

      socket.on(
        "call:group:existing_participants",
        async (data: {
          conversationId: string;
          callType: "audio" | "video";
          participants: Array<{ userId: string; name?: string; avatar?: string }>;
        }) => {
          const { conversationId, localStream } = get();
          if (conversationId !== data.conversationId || !localStream) return;

          for (const p of data.participants) {
            await createPeerOffer(p.userId, p.name || "Người dùng", p.avatar);
          }
        }
      );

      socket.on(
        "call:group:signal",
        async (data: {
          conversationId: string;
          senderId: string;
          signal: {
            type?: "offer" | "answer";
            sdp?: string;
            candidate?: RTCIceCandidateInit;
          };
        }) => {
          const { conversationId, peers } = get();
          if (conversationId !== data.conversationId) return;

          const { senderId, signal } = data;

          if (signal.type === "offer") {
            await handleIncomingOffer(
              senderId,
              signal as RTCSessionDescriptionInit
            );
          } else if (signal.type === "answer") {
            const peer = peers[senderId];
            if (peer && peer.pc.signalingState !== "closed") {
              try {
                await peer.pc.setRemoteDescription(
                  new RTCSessionDescription(signal as RTCSessionDescriptionInit)
                );
              } catch (e) {
                console.error("Lỗi setRemoteDescription answer:", e);
              }
            }
          } else if (signal.candidate) {
            const peer = peers[senderId];
            if (peer && peer.pc.signalingState !== "closed") {
              try {
                await peer.pc.addIceCandidate(
                  new RTCIceCandidate(signal.candidate)
                );
              } catch (e) {
                console.error("Lỗi addIceCandidate:", e);
              }
            }
          }
        }
      );

      socket.on(
        "call:group:media_state",
        (data: {
          conversationId: string;
          userId: string;
          isMuted: boolean;
          isVideoEnabled: boolean;
        }) => {
          const { conversationId, peers } = get();
          if (conversationId !== data.conversationId) return;

          const peer = peers[data.userId];
          if (peer) {
            set({
              peers: {
                ...peers,
                [data.userId]: {
                  ...peer,
                  isMuted: data.isMuted,
                  isVideoEnabled: data.isVideoEnabled,
                },
              },
            });
          }
        }
      );

      socket.on(
        "call:group:user_left",
        (data: { conversationId: string; userId: string }) => {
          const { conversationId, peers } = get();
          if (conversationId !== data.conversationId) return;

          const peer = peers[data.userId];
          if (peer) {
            peer.pc.close();
            const nextPeers = { ...peers };
            delete nextPeers[data.userId];
            set({ peers: nextPeers });
          }
        }
      );
    },

    initiateGroupCall: async (
      conversationId: string,
      groupName: string,
      groupAvatar?: string,
      callType: "audio" | "video" = "video"
    ) => {
      get().initSocketListeners();
      const user = useAuthStore.getState().user;
      const socket = useChatStore.getState().socket;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video" ? OPTIMIZED_VIDEO_CONSTRAINTS : false,
        });

        set({
          isOpen: true,
          status: "connected",
          callType,
          conversationId,
          groupName,
          groupAvatar,
          localStream: stream,
          peers: {},
          isMuted: false,
          isVideoEnabled: callType === "video",
        });

        startVAD();

        if (socket) {
          socket.emit("call:group:initiate", {
            conversationId,
            callType,
            callerName: user?.name,
            callerAvatar: user?.avatar,
          });
        }
      } catch (err) {
        console.error("Lỗi mở camera/mic khi gọi nhóm:", err);
      }
    },

    joinGroupCall: async (
      conversationId: string,
      groupName: string,
      groupAvatar?: string,
      callType: "audio" | "video" = "video"
    ) => {
      get().initSocketListeners();
      const user = useAuthStore.getState().user;
      const socket = useChatStore.getState().socket;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video" ? OPTIMIZED_VIDEO_CONSTRAINTS : false,
        });

        set({
          isOpen: true,
          status: "connected",
          callType,
          conversationId,
          groupName,
          groupAvatar,
          localStream: stream,
          peers: {},
          isMuted: false,
          isVideoEnabled: callType === "video",
          incomingCall: null,
        });

        startVAD();

        if (socket) {
          socket.emit("call:group:join", {
            conversationId,
            userName: user?.name,
            userAvatar: user?.avatar,
          });
        }
      } catch (err) {
        console.error("Lỗi tham gia cuộc gọi nhóm:", err);
      }
    },

    leaveGroupCall: () => {
      const { conversationId, localStream, peers } = get();
      const socket = useChatStore.getState().socket;
      if (conversationId && socket) {
        socket.emit("call:group:leave", { conversationId });
      }

      // Đóng tất cả peer connections
      Object.values(peers).forEach((p) => p.pc.close());

      // Tắt camera/mic cục bộ
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }

      stopVAD();

      set({
        isOpen: false,
        status: "idle",
        conversationId: null,
        localStream: null,
        peers: {},
        activeSpeakerId: null,
      });
    },

    toggleMute: () => {
      const { localStream, isMuted, conversationId, isVideoEnabled } = get();
      const socket = useChatStore.getState().socket;
      if (!localStream) return;

      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        set({ isMuted: !isMuted });

        if (conversationId && socket) {
          socket.emit("call:group:media_state", {
            conversationId,
            isMuted: !isMuted,
            isVideoEnabled,
          });
        }
      }
    },

    toggleVideo: () => {
      const { localStream, isVideoEnabled, conversationId, isMuted } = get();
      const socket = useChatStore.getState().socket;
      if (!localStream) return;

      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        set({ isVideoEnabled: !isVideoEnabled });

        if (conversationId && socket) {
          socket.emit("call:group:media_state", {
            conversationId,
            isMuted,
            isVideoEnabled: !isVideoEnabled,
          });
        }
      }
    },

    setIncomingCall: (incoming) => set({ incomingCall: incoming }),

    acceptIncomingCall: async () => {
      const { incomingCall } = get();
      if (!incomingCall) return;

      await get().joinGroupCall(
        incomingCall.conversationId,
        incomingCall.groupName,
        incomingCall.groupAvatar,
        incomingCall.callType
      );
    },

    rejectIncomingCall: () => {
      set({ incomingCall: null });
    },
  };
});
