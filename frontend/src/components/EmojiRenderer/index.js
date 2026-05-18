// src/components/EmojiRenderer/index.jsx
import React, { useEffect, useRef } from "react";
import twemoji from "twemoji";

const EmojiRenderer = ({ children, style, className }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      twemoji.parse(ref.current, {
        folder: "svg",
        ext: ".svg",
        base: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/",
        className: "twemoji",
      });
    }
  }, [children]);

  return (
    <span ref={ref} style={style} className={className}>
      {children}
    </span>
  );
};

export default EmojiRenderer;
