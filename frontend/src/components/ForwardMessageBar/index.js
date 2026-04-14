import React, { useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { IconButton, Typography } from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import SendIcon from "@material-ui/icons/Send";
import { ForwardMessageContext } from "../../context/ForwarMessage/ForwardMessageContext";

const useStyles = makeStyles((theme) => ({
  bar: {
    position: "absolute", // ← era "fixed"
    bottom: 0,
    left: 0,
    right: 0, // ← em vez de width: "100%"
    height: 60,
    backgroundColor: theme.mode === "light" ? "#ffffff" : "#1f2c34",
    borderTop: `1px solid ${theme.mode === "light" ? "#e0e0e0" : "#2a3942"}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
    paddingRight: 16,
    zIndex: 9999,
    boxShadow: "0 -2px 8px rgba(0,0,0,0.12)",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  count: {
    fontSize: 15,
    fontWeight: 500,
    color: theme.mode === "light" ? "#111" : "#fff",
  },
  cancelBtn: {
    color: theme.mode === "light" ? "#555" : "#aaa",
  },
  forwardBtn: {
    backgroundColor: "#25d366",
    color: "#fff",
    borderRadius: "50%",
    padding: 10,
    "&:hover": {
      backgroundColor: "#1ebe5a",
    },
  },
}));

const ForwardMessageBar = ({ onForward }) => {
  const classes = useStyles();
  const {
    showSelectMessageCheckbox,
    setShowSelectMessageCheckbox,
    selectedMessages,
    setSelectedMessages,
  } = useContext(ForwardMessageContext);

  if (!showSelectMessageCheckbox) return null;

  const handleCancel = () => {
    setShowSelectMessageCheckbox(false);
    setSelectedMessages([]);
  };

  return (
    <div className={classes.bar}>
      <div className={classes.left}>
        <IconButton
          className={classes.cancelBtn}
          onClick={handleCancel}
          size="small"
        >
          <CloseIcon />
        </IconButton>
        <Typography className={classes.count}>
          {selectedMessages.length} selecionada
          {selectedMessages.length !== 1 ? "s" : ""}
        </Typography>
      </div>

      <IconButton
        className={classes.forwardBtn}
        onClick={onForward}
        disabled={selectedMessages.length === 0}
        size="small"
      >
        <SendIcon />
      </IconButton>
    </div>
  );
};

export default ForwardMessageBar;
