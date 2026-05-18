// src/components/TwemojiText.jsx
import React, { useEffect, useRef } from "react";
import twemoji from "twemoji";

const TwemojiText = ({ children, style = {} }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    twemoji.parse(ref.current, {
      folder: "svg",
      ext: ".svg",
      base: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/",
    });
  }, [children]);

  return (
    <span
      ref={ref}
      style={{
        lineHeight: "inherit",
        ...style,
        // Garante que os <img> de emoji fiquem alinhados
      }}
      dangerouslySetInnerHTML={{ __html: children }}
    />
  );
};

export default TwemojiText;
