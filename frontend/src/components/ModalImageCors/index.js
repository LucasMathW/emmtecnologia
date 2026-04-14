import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  messageMedia: {
    objectFit: "cover",
    width: 250,
    height: "auto",
    maxHeight: 300, // ← limita altura para não sobrepor botões
    borderRadius: 8,
    cursor: "zoom-in",
    display: "block",
    position: "relative",
    zIndex: 10,
    marginBottom: 18,
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
    cursor: "zoom-out",
  },
  controls: {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 12,
    zIndex: 100000,
  },
  controlBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#fff",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 20,
    cursor: "pointer",
  },
  closeBtn: {
    position: "fixed",
    top: 16,
    right: 20,
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: 32,
    cursor: "pointer",
    zIndex: 100000,
    lineHeight: 1,
  },
}));

const ModalImageCors = ({ imageUrl }) => {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef(null);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  // Zoom com scroll do mouse
  useEffect(() => {
    if (!open) return;
    const handleWheel = (e) => {
      e.preventDefault();
      setZoom((z) => {
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        return Math.min(5, Math.max(0.5, z + delta));
      });
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setZoom(1);
    setRotation(0);
  };

  if (!imageUrl) return null;

  return (
    <>
      <img
        src={imageUrl}
        alt="imagem"
        className={classes.messageMedia}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        onError={(e) => console.error("Erro ao carregar imagem:", imageUrl)}
      />

      {open && (
        <div className={classes.overlay} onClick={handleClose}>
          <button className={classes.closeBtn} onClick={handleClose}>
            ✕
          </button>

          <img
            ref={imgRef}
            src={imageUrl}
            alt="imagem expandida"
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 4,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: "transform 0.15s ease",
              cursor: "default",
            }}
            onClick={(e) => e.stopPropagation()}
          />

          <div
            className={classes.controls}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={classes.controlBtn}
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              title="Diminuir zoom"
            >
              −
            </button>
            <button
              className={classes.controlBtn}
              onClick={() => setZoom(1)}
              title="Zoom original"
            >
              ↺
            </button>
            <button
              className={classes.controlBtn}
              onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
              title="Aumentar zoom"
            >
              +
            </button>
            <button
              className={classes.controlBtn}
              onClick={() => setRotation((r) => r + 90)}
              title="Rotacionar"
            >
              🔄
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ModalImageCors;
