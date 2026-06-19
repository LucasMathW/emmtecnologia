import React from "react";
import Avatar from "@material-ui/core/Avatar";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
  avatar: {
    backgroundColor: "#DFE5E7",
    color: "#BEC5C9",
  },
}));

const NoProfileSvg = ({ size = 40 }) => (
  <svg viewBox="0 0 212 212" width={size} height={size} fill="none">
    <circle cx="106" cy="106" r="106" fill="#DFE5E7" />
    <path
      fill="#BEC5C9"
      d="M106.001 99.3c13.779 0 24.95-11.17 24.95-24.95S119.78 49.4 106.001 49.4c-13.78 0-24.95 11.17-24.95 24.95s11.17 24.95 24.95 24.95zm0 12.475c-16.647 0-49.9 8.354-49.9 24.95v12.476h99.8v-12.475c0-16.597-33.253-24.951-49.9-24.951z"
    />
  </svg>
);

const ContactAvatar = ({ contact, size, className, style, onClick }) => {
  const classes = useStyles();

  const hasPicture =
    contact?.urlPicture &&
    !contact.urlPicture.includes("nopicture") &&
    contact.urlPicture !== "";

  const src = hasPicture
    ? `${contact.urlPicture}?t=${
        contact.updatedAt ? new Date(contact.updatedAt).getTime() : Date.now()
      }`
    : undefined;

  return (
    <Avatar
      src={src}
      className={`${!hasPicture ? classes.avatar : ""} ${className || ""}`}
      style={style}
      onClick={onClick}
    >
      {!hasPicture && <NoProfileSvg size={size} />}
    </Avatar>
  );
};

export default ContactAvatar;
