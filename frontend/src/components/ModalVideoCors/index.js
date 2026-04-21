import React, { useState, useEffect, useRef, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  videoThumb: {
    width: "100%",
    height: "auto",
    maxHeight: 300,
    borderRadius: 8,
    cursor: "pointer",
    display: "block",
    position: "relative",
    backgroundColor: "#000",
    objectFit: "cover",
  },
  thumbWrapper: {
    position: "relative",
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    cursor: "pointer",
    backgroundColor: "#000",
    "&:hover $playOverlay": {
      opacity: 1,
    },
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    opacity: 0.85,
    transition: "opacity 0.2s ease",
    borderRadius: 8,
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    backgroundColor: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid rgba(255,255,255,0.8)",
    transition: "transform 0.15s ease, background 0.15s ease",
    "&:hover": {
      transform: "scale(1.1)",
      backgroundColor: "rgba(0,0,0,0.85)",
    },
  },

  // === OVERLAY FULLSCREEN ===
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.96)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  toolbar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 12px",
    gap: 4,
    zIndex: 100000,
  },
  toolBtn: {
    background: "transparent",
    border: "none",
    color: "#fff",
    borderRadius: "50%",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 20,
    transition: "background 0.15s",
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.15)",
    },
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    margin: "0 4px",
  },

  // === VIDEO PLAYER ===
  videoWrapper: {
    position: "relative",
    width: "90vw",
    maxWidth: 900,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  videoEl: {
    width: "100%",
    maxHeight: "80vh",
    borderRadius: 8,
    backgroundColor: "#000",
    outline: "none",
    boxShadow: "0 8px 40px rgba(0,0,0,0.8)",
  },

  // === CONTROLS BAR ===
  controls: {
    width: "100%",
    marginTop: 12,
    padding: "0 4px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  progressBar: {
    width: "100%",
    height: 4,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    cursor: "pointer",
    position: "relative",
    "&:hover": {
      height: 6,
    },
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#25d366",
    pointerEvents: "none",
    transition: "width 0.1s linear",
  },
  progressBuffered: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    pointerEvents: "none",
  },
  controlsRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  ctrlBtn: {
    background: "transparent",
    border: "none",
    color: "#fff",
    borderRadius: "50%",
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.15s",
    flexShrink: 0,
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.15)",
    },
  },
  timeLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "monospace",
    minWidth: 90,
  },
  spacer: { flex: 1 },
  volumeWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  volumeSlider: {
    width: 70,
    accentColor: "#25d366",
    cursor: "pointer",
  },
  speedBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#fff",
    borderRadius: 4,
    padding: "2px 7px",
    fontSize: 12,
    cursor: "pointer",
    transition: "background 0.15s",
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.15)",
    },
  },
}));

const formatTime = (secs) => {
  if (isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

const ModalVideoCors = ({ videoUrl, message }) => {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1); // 1x default
  const [fullscreen, setFullscreen] = useState(false);
  const videoRef = useRef(null);
  const wrapperRef = useRef(null);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") handleClose();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "ArrowRight") seek(5);
      if (e.key === "ArrowLeft") seek(-5);
      if (e.key === "ArrowUp") changeVolume(Math.min(1, volume + 0.1));
      if (e.key === "ArrowDown") changeVolume(Math.max(0, volume - 0.1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, playing, volume]);

  const handleOpen = (e) => {
    e.stopPropagation();
    setOpen(true);
    setPlaying(true);
  };

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setOpen(false);
    setPlaying(false);
    setCurrentTime(0);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const seek = (delta) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(duration, videoRef.current.currentTime + delta),
    );
  };

  const changeVolume = (v) => {
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    if (v > 0) setMuted(false);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !muted;
    setMuted(newMuted);
    videoRef.current.muted = newMuted;
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (videoRef.current) videoRef.current.playbackRate = SPEEDS[next];
  };

  const handleProgressClick = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * duration;
  };

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = videoUrl.split("/").pop()?.split("?")[0] || "video.mp4";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // fallback direto
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = "video.mp4";
      link.click();
    }
  };

  if (!videoUrl) return null;

  return (
    <>
      {/* Thumbnail clicável na lista de mensagens */}
      <div className={classes.thumbWrapper} onClick={handleOpen}>
        <video
          src={videoUrl}
          className={classes.videoThumb}
          preload="metadata"
          muted
          playsInline
        />
        <div className={classes.playOverlay}>
          <div className={classes.playButton}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>
      </div>

      {/* Modal fullscreen */}
      {open && (
        <div className={classes.overlay} onClick={handleClose}>
          {/* Toolbar */}
          <div className={classes.toolbar} onClick={(e) => e.stopPropagation()}>
            {/* Download */}
            <button
              className={classes.toolBtn}
              onClick={handleDownload}
              title="Baixar"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>

            <div className={classes.divider} />

            {/* Fechar */}
            <button
              className={classes.toolBtn}
              onClick={handleClose}
              title="Fechar"
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Player */}
          <div
            ref={wrapperRef}
            className={classes.videoWrapper}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              className={classes.videoEl}
              autoPlay
              playsInline
              onClick={togglePlay}
              onTimeUpdate={() => {
                if (!videoRef.current) return;
                setCurrentTime(videoRef.current.currentTime);
                // buffered
                const buf = videoRef.current.buffered;
                if (buf.length > 0) setBuffered(buf.end(buf.length - 1));
              }}
              onLoadedMetadata={() => {
                if (!videoRef.current) return;
                setDuration(videoRef.current.duration);
              }}
              onEnded={() => setPlaying(false)}
              style={{ cursor: "pointer" }}
            />

            {/* Controls */}
            <div
              className={classes.controls}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress bar */}
              <div
                className={classes.progressBar}
                onClick={handleProgressClick}
                style={{ position: "relative", height: 4 }}
              >
                {/* buffered */}
                <div
                  className={classes.progressBuffered}
                  style={{
                    width: duration ? `${(buffered / duration) * 100}%` : "0%",
                  }}
                />
                {/* progress */}
                <div
                  className={classes.progressFill}
                  style={{
                    width: duration
                      ? `${(currentTime / duration) * 100}%`
                      : "0%",
                  }}
                />
              </div>

              {/* Buttons row */}
              <div className={classes.controlsRow}>
                {/* Retroceder 10s */}
                <button
                  className={classes.ctrlBtn}
                  onClick={() => seek(-10)}
                  title="-10s"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="currentColor"
                  >
                    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                    <text
                      x="8"
                      y="15"
                      fontSize="6"
                      fill="currentColor"
                      fontFamily="sans-serif"
                    >
                      10
                    </text>
                  </svg>
                </button>

                {/* Play/Pause */}
                <button
                  className={classes.ctrlBtn}
                  onClick={togglePlay}
                  title="Play/Pause"
                >
                  {playing ? (
                    <svg
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      fill="currentColor"
                    >
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      fill="currentColor"
                    >
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  )}
                </button>

                {/* Avançar 10s */}
                <button
                  className={classes.ctrlBtn}
                  onClick={() => seek(10)}
                  title="+10s"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="currentColor"
                  >
                    <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
                    <text
                      x="8"
                      y="15"
                      fontSize="6"
                      fill="currentColor"
                      fontFamily="sans-serif"
                    >
                      10
                    </text>
                  </svg>
                </button>

                {/* Tempo */}
                <span className={classes.timeLabel}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <div className={classes.spacer} />

                {/* Volume */}
                <div className={classes.volumeWrapper}>
                  <button
                    className={classes.ctrlBtn}
                    onClick={toggleMute}
                    title="Mudo"
                  >
                    {muted || volume === 0 ? (
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="currentColor"
                      >
                        <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      </svg>
                    ) : volume < 0.5 ? (
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="currentColor"
                      >
                        <path d="M18.5 12A4.5 4.5 0 0 0 16 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="currentColor"
                      >
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
                    className={classes.volumeSlider}
                  />
                </div>

                {/* Velocidade */}
                <button
                  className={classes.speedBtn}
                  onClick={cycleSpeed}
                  title="Velocidade"
                >
                  {SPEEDS[speedIdx]}x
                </button>

                {/* Fullscreen */}
                <button
                  className={classes.ctrlBtn}
                  onClick={toggleFullscreen}
                  title="Tela cheia"
                >
                  {fullscreen ? (
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="currentColor"
                    >
                      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="currentColor"
                    >
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModalVideoCors;
