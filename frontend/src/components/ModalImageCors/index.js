import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  messageMedia: {
    objectFit: "cover",
    width: "100%",
    height: "auto",
    maxHeight: 300,
    borderRadius: 8,
    cursor: "zoom-in",
    display: "block",
    position: "relative",
    zIndex: 10,
    marginBottom: 4,
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    display: "flex",
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
  zoomLabel: {
    color: "#fff",
    fontSize: 13,
    minWidth: 44,
    textAlign: "center",
    opacity: 0.8,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    margin: "0 4px",
  },
}));

const ModalImageCors = ({ imageUrl }) => {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const positionRef = useRef({ x: 0, y: 0 });

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
        return Math.min(5, Math.max(0.3, z + delta));
      });
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [open]);

  // Drag — mouse
  useEffect(() => {
    if (!open) return;

    const handleMouseMove = (e) => {
      if (!dragStart.current) return;

      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;

      // Detecta direção dominante após 5px de movimento
      if (!dragDirection.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragDirection.current =
          Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      }

      if (!dragDirection.current) return;

      const newPos = {
        x:
          dragDirection.current === "horizontal"
            ? positionRef.current.x + dx
            : positionRef.current.x, // ← trava X se vertical
        y:
          dragDirection.current === "vertical"
            ? positionRef.current.y + dy
            : positionRef.current.y, // ← trava Y se horizontal
      };

      setPosition(newPos);
    };

    const handleMouseUp = (e) => {
      if (!dragStart.current) return;

      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;

      positionRef.current = {
        x:
          dragDirection.current === "horizontal"
            ? positionRef.current.x + dx
            : positionRef.current.x,
        y:
          dragDirection.current === "vertical"
            ? positionRef.current.y + dy
            : positionRef.current.y,
      };

      dragStart.current = null;
      dragDirection.current = null;
      setDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [open]);

  const dragDirection = useRef(null); // ← novo

  const handleMouseDown = (e) => {
    e.preventDefault();
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragDirection.current = null; // ← reseta direção
    setDragging(true);
  };

  const handleClose = () => {
    setOpen(false);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
    setDragging(false);
  };

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setZoom((z) => Math.min(5, z + 0.25));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setZoom((z) => Math.max(0.3, z - 0.25));
  };

  const handleRotate = (e) => {
    e.stopPropagation();
    setRotation((r) => r + 90);
  };

  const handleReset = (e) => {
    e.stopPropagation();
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = imageUrl.split("/").pop() || "imagem.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Erro ao baixar imagem:", err);
    }
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
          {/* Toolbar no topo */}
          <div className={classes.toolbar} onClick={(e) => e.stopPropagation()}>
            {/* Zoom out */}
            <button
              className={classes.toolBtn}
              onClick={handleZoomOut}
              title="Diminuir zoom"
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>

            {/* Zoom label */}
            <span className={classes.zoomLabel}>{Math.round(zoom * 100)}%</span>

            {/* Zoom in */}
            <button
              className={classes.toolBtn}
              onClick={handleZoomIn}
              title="Aumentar zoom"
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>

            <div className={classes.divider} />

            {/* Resetar */}
            <button
              className={classes.toolBtn}
              onClick={handleReset}
              title="Resetar"
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
              </svg>
            </button>

            {/* Rotacionar */}
            <button
              className={classes.toolBtn}
              onClick={handleRotate}
              title="Rotacionar"
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-.49-4.95" />
              </svg>
            </button>

            {/* Download */}
            <button
              className={classes.toolBtn}
              onClick={handleDownload}
              title="Baixar"
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
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

          {/* Imagem */}
          <img
            src={imageUrl}
            alt="imagem expandida"
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              objectFit: "contain",
              borderRadius: 4,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transition: dragging ? "none" : "transform 0.15s ease",
              cursor: dragging ? "grabbing" : "grab",
              userSelect: "none",
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
    </>
  );
};

export default ModalImageCors;
