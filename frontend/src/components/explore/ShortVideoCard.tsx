"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import NextLink from "next/link";
import { Avatar, Box, Button, ButtonBase, CircularProgress, IconButton, Slider, Stack, Typography } from "@mui/material";
import { Heart, MessageCircle, Pause, Play, Share2, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { mediaUrl, type PostView } from "@/services/postsApi";
import { v } from "@/theme/tokens";
import { SHORT_VIDEO_COPY as COPY } from "./shortVideoExploreUi";

interface ShortVideoCardProps {
  post: PostView;
  videoUrl: string;
  index: number;
  active: boolean;
  muted: boolean;
  shareable: boolean;
  heartPending: boolean;
  scrollRootRef: RefObject<HTMLDivElement | null>;
  onActive: (id: string) => void;
  onMuteChange: () => void;
  onReact: (post: PostView) => void;
  onComments: (post: PostView) => void;
  onShare: (post: PostView) => void;
}

function displayTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00";
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

export default function ShortVideoCard({ post, videoUrl, index, active, muted, shareable, heartPending, scrollRootRef, onActive, onMuteChange, onReact, onComments, onShare }: ShortVideoCardProps) {
  const { tr, language, t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrubbingRef = useRef(false);
  const presentedTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [paused, setPaused] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const seekMax = Number.isFinite(duration) && duration > 0 ? duration : 1;
  const sensitiveHidden = Boolean(post.isSensitive && !revealed);
  const count = (value: number) => new Intl.NumberFormat(language, { notation: "compact", maximumFractionDigits: 1 }).format(value);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !scrollRootRef.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.65) onActive(post._id);
      else video.pause();
    }, { root: scrollRootRef.current, threshold: [0, 0.65, 1] });
    observer.observe(video);
    return () => observer.disconnect();
  }, [onActive, post._id, scrollRootRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active && !sensitiveHidden && !failed) void video.play().catch(() => setPaused(true));
    else video.pause();
  }, [active, sensitiveHidden, failed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active || paused || sensitiveHidden || failed) return;
    let frame = 0;
    let lastUpdate = 0;
    const syncProgress = (now: number, mediaTime: number) => {
      if (pausedTimeRef.current !== null) return;
      presentedTimeRef.current = mediaTime;
      if (now - lastUpdate >= 33 && !scrubbingRef.current) {
        setPosition(mediaTime);
        lastUpdate = now;
      }
    };

    if (typeof video.requestVideoFrameCallback === "function") {
      const onFrame: VideoFrameRequestCallback = (now, metadata) => {
        syncProgress(now, metadata.mediaTime);
        frame = video.requestVideoFrameCallback(onFrame);
      };
      frame = video.requestVideoFrameCallback(onFrame);
      return () => video.cancelVideoFrameCallback(frame);
    }

    const onAnimationFrame = (now: number) => {
      syncProgress(now, video.currentTime);
      frame = requestAnimationFrame(onAnimationFrame);
    };
    frame = requestAnimationFrame(onAnimationFrame);
    return () => cancelAnimationFrame(frame);
  }, [active, paused, sensitiveHidden, failed]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video || sensitiveHidden) return;
    if (video.paused) {
      pausedTimeRef.current = null;
      if (video.ended) {
        video.currentTime = 0;
        presentedTimeRef.current = 0;
        setPosition(0);
      }
      void video.play().catch(() => setPaused(true));
    } else {
      pausedTimeRef.current = video.currentTime;
      presentedTimeRef.current = video.currentTime;
      video.pause();
    }
  };

  return (
    <Box component="article" data-light="" aria-label={tr({ vi: `Video của ${post.author.name}`, en: `Video by ${post.author.name}`, "zh-CN": `${post.author.name}的视频`, "zh-TW": `${post.author.name}的影片`, ko: `${post.author.name}님의 동영상`, th: `วิดีโอโดย ${post.author.name}` })} sx={{ position: "relative", width: "100%", height: "100%", flexShrink: 0, overflow: "hidden", scrollSnapAlign: "start", bgcolor: v.tone("2d251f") }}>
      <Box component="video" ref={videoRef} src={mediaUrl(videoUrl)} playsInline muted={muted} preload={index < 2 ? "metadata" : "none"} onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); presentedTimeRef.current = event.currentTarget.currentTime; setPosition(event.currentTarget.currentTime); }} onSeeked={(event) => { presentedTimeRef.current = event.currentTarget.currentTime; if (!scrubbingRef.current) setPosition(event.currentTarget.currentTime); }} onPlay={() => { pausedTimeRef.current = null; setPaused(false); }} onPause={(event) => { if (!event.currentTarget.paused) return; const positionAtPause = event.currentTarget.ended ? event.currentTarget.duration : pausedTimeRef.current ?? event.currentTarget.currentTime; pausedTimeRef.current = positionAtPause; presentedTimeRef.current = positionAtPause; setPaused(true); if (!scrubbingRef.current) setPosition(positionAtPause); }} onEnded={(event) => { pausedTimeRef.current = event.currentTarget.duration; presentedTimeRef.current = event.currentTarget.duration; setPosition(event.currentTarget.duration); setPaused(true); }} onWaiting={() => setBuffering(true)} onCanPlay={() => setBuffering(false)} onError={() => setFailed(true)} sx={{ display: "block", width: "100%", maxWidth: 620, height: "100%", mx: "auto", objectFit: "contain", filter: sensitiveHidden ? "blur(24px)" : "none" }} />

      <ButtonBase disableRipple onClick={togglePlayback} aria-label={paused ? tr(COPY.play) : tr(COPY.pause)} sx={{ position: "absolute", inset: 0, zIndex: 1, cursor: "pointer" }}>
        {paused && !sensitiveHidden && !failed && <Box sx={{ display: "grid", placeItems: "center", width: 68, height: 68, borderRadius: "50%", bgcolor: "color-mix(in srgb, var(--mui-palette-common-black) 55%, transparent)", color: v.white }}><Play size={30} fill="currentColor" aria-hidden /></Box>}
      </ButtonBase>

      <Box aria-hidden sx={{ position: "absolute", zIndex: 1, inset: "auto 0 0", height: "44%", pointerEvents: "none", background: "linear-gradient(transparent, color-mix(in srgb, var(--mui-palette-common-black) 88%, transparent))" }} />

      {!sensitiveHidden && !failed && buffering && active && !paused && <CircularProgress size={28} sx={{ position: "absolute", zIndex: 2, top: "46%", left: "calc(50% - 14px)", color: v.white }} />}

      {sensitiveHidden && <ButtonBase onClick={() => setRevealed(true)} aria-label={tr(COPY.reveal)} sx={{ position: "absolute", zIndex: 5, inset: 0, display: "grid", placeItems: "center", bgcolor: "color-mix(in srgb, var(--mui-palette-common-black) 40%, transparent)", color: v.white }}><Stack spacing={1} sx={{ alignItems: "center" }}><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{tr(COPY.sensitive)}</Typography><Typography variant="body2">{tr(COPY.reveal)}</Typography></Stack></ButtonBase>}

      {failed && <Stack spacing={1.5} sx={{ position: "absolute", zIndex: 5, inset: 0, alignItems: "center", justifyContent: "center", color: v.white, bgcolor: v.tone("2d251f") }}><Typography variant="body2">{tr(COPY.videoError)}</Typography><Button size="small" variant="contained" onClick={() => { setFailed(false); videoRef.current?.load(); }}>{t("common.retry")}</Button></Stack>}

      <Box sx={{ position: "absolute", zIndex: 2, left: { xs: 2, sm: 3 }, right: { xs: 78, sm: 120 }, bottom: { xs: 88, sm: 96 }, color: v.white, pointerEvents: "none" }}>
        <ButtonBase component={NextLink} href={`/profile/${post.author._id}`} sx={{ display: "inline-flex", alignItems: "center", gap: 1, color: v.white, textAlign: "left", pointerEvents: "auto", borderRadius: "8px" }}><Avatar src={post.author.avatar} alt={post.author.name} sx={{ width: 36, height: 36 }} /><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{post.author.name}</Typography></ButtonBase>
        {post.content && <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.content}</Typography>}
      </Box>

      <Stack spacing={1.5} sx={{ position: "absolute", zIndex: 3, right: { xs: 1, sm: 3 }, bottom: { xs: 98, sm: 105 }, alignItems: "center", color: v.white }}>
        <Stack spacing={0.25} sx={{ alignItems: "center" }}><IconButton aria-label={tr(post.myReaction === "love" ? COPY.removeHeart : COPY.heart)} aria-pressed={post.myReaction === "love"} disabled={heartPending} onClick={() => onReact(post)} sx={{ color: post.myReaction === "love" ? v.tone("f43f5e") : v.white, p: 0.75 }}><Heart size={30} fill={post.myReaction === "love" ? "currentColor" : "none"} aria-hidden /></IconButton><Typography variant="caption" sx={{ color: v.white, fontWeight: 700 }}>{count(post.reactionsCount?.love ?? 0)}</Typography></Stack>
        <Stack spacing={0.25} sx={{ alignItems: "center" }}><IconButton aria-label={tr(COPY.comments)} onClick={() => onComments(post)} sx={{ color: v.white, p: 0.75 }}><MessageCircle size={30} fill="currentColor" aria-hidden /></IconButton><Typography variant="caption" sx={{ color: v.white, fontWeight: 700 }}>{count(post.commentCount)}</Typography></Stack>
        <Stack spacing={0.25} sx={{ alignItems: "center" }}><IconButton aria-label={tr(COPY.share)} disabled={!shareable} onClick={() => onShare(post)} sx={{ color: v.white, p: 0.75 }}><Share2 size={30} fill="currentColor" aria-hidden /></IconButton><Typography variant="caption" sx={{ color: v.white, fontWeight: 700 }}>{count(post.shareCount)}</Typography></Stack>
      </Stack>

      <Box sx={{ position: "absolute", zIndex: 3, left: { xs: 1.5, sm: 2 }, right: { xs: 1.5, sm: 2 }, bottom: "calc(8px + env(safe-area-inset-bottom))", color: v.white }}>
        <Slider size="small" min={0} max={seekMax} step={0.01} value={Math.min(position, seekMax)} disabled={duration <= 0 || !Number.isFinite(duration)} onChange={(_, value) => { if (typeof value === "number") { scrubbingRef.current = true; setPosition(value); } }} onChangeCommitted={(_, value) => { if (videoRef.current && typeof value === "number") { videoRef.current.currentTime = value; setPosition(value); } scrubbingRef.current = false; }} aria-label={tr(COPY.seek)} sx={{ color: v.tone("f43f5e"), p: 0, height: 4, "& .MuiSlider-thumb": { width: 10, height: 10 }, "& .MuiSlider-rail": { color: v.white } }} />
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 0.5 }}><IconButton disableRipple aria-label={paused ? tr(COPY.play) : tr(COPY.pause)} onClick={togglePlayback} sx={{ color: v.white, p: 0.5 }}>{paused ? <Play size={21} fill="currentColor" aria-hidden /> : <Pause size={21} fill="currentColor" aria-hidden />}</IconButton><Typography variant="body2" sx={{ color: v.white, fontVariantNumeric: "tabular-nums" }}>{displayTime(position)} / {displayTime(duration)}</Typography><Box sx={{ flex: 1 }} /><IconButton aria-label={muted ? tr(COPY.unmute) : tr(COPY.mute)} onClick={onMuteChange} sx={{ color: v.white, p: 0.5 }}>{muted ? <VolumeX size={21} aria-hidden /> : <Volume2 size={21} aria-hidden />}</IconButton></Stack>
      </Box>
    </Box>
  );
}
