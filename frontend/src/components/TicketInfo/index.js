import React, { useState, useContext } from "react";
import { i18n } from "../../translate/i18n";
import {
  Avatar,
  CardHeader,
  Grid,
  Dialog,
  DialogContent,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { AuthContext } from "../../context/Auth/AuthContext";
import ContactAvatar, { NoProfileSvg } from "../ContactAvatar";

const useStyles = makeStyles((theme) => ({
  imageModal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalContent: {
    outline: "none",
    maxWidth: "90vw",
    maxHeight: "90vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(2),
  },
  expandedImage: {
    width: "100%",
    height: "auto",
    maxWidth: "400px",
    maxHeight: "400px",
    objectFit: "contain",
    borderRadius: theme.spacing(1),
  },
  clickableAvatar: {
    cursor: "pointer",
    "&:hover": {
      opacity: 0.8,
    },
  },
}));

const TicketInfo = ({ contact, ticket, onClick }) => {
  const classes = useStyles();
  const [amount, setAmount] = useState("");
  const { user } = useContext(AuthContext);
  const [imageModalOpen, setImageModalOpen] = useState(false); // Estado para o modal da imagem

  // Função para abrir modal da imagem
  const handleImageClick = (e) => {
    e.stopPropagation(); // Prevenir que o clique no avatar execute outros handlers
    if (contact?.urlPicture) {
      setImageModalOpen(true);
    }
  };

  // Função para fechar modal da imagem
  const handleImageModalClose = () => {
    setImageModalOpen(false);
  };

  const renderCardReader = () => {
    return (
      <CardHeader
        onClick={onClick}
        style={{ cursor: "pointer" }}
        titleTypographyProps={{ noWrap: true }}
        subheaderTypographyProps={{ noWrap: true }}
        avatar={
          <ContactAvatar
            contact={contact}
            size={40}
            className={classes.clickableAvatar}
            onClick={handleImageClick}
          />
        }
        title={`${
          contact?.name && contact.name.length > 12
            ? `${contact.name.substring(0, 12)}...`
            : contact?.name || "(sem contato)"
        } #${ticket?.id}`}
        subheader={[
          ticket?.user &&
            `${i18n.t("messagesList.header.assignedTo")} ${ticket?.user?.name}`,
          contact?.contactWallets && contact.contactWallets.length > 0
            ? `• ${i18n.t("wallets.wallet")}: ${contact.contactWallets[0].wallet?.name || "N/A"}`
            : null,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    );
  };

  const handleChange = (event) => {
    const value = event.target.value;
    setAmount(value);
  };

  return (
    <React.Fragment>
      <Grid container alignItems="center" spacing={10}>
        <Grid item xs={6}>
          {renderCardReader()}
        </Grid>
      </Grid>

      <Dialog
        open={imageModalOpen}
        onClose={handleImageModalClose}
        className={classes.imageModal}
        maxWidth="md"
        fullWidth
      >
        <DialogContent className={classes.imageModalContent}>
          {contact?.urlPicture &&
          !contact.urlPicture.includes("nopicture") &&
          contact.urlPicture !== "" ? (
            <img
              src={`${contact.urlPicture}?t=${
                contact.updatedAt
                  ? new Date(contact.updatedAt).getTime()
                  : Date.now()
              }`}
              alt={contact?.name || "Foto do contato"}
              className={classes.expandedImage}
              onError={(e) => {
                console.error("Erro ao carregar imagem:", contact.urlPicture);
                handleImageModalClose();
              }}
            />
          ) : (
            <Avatar
              style={{
                width: 350,
                height: 350,
                backgroundColor: "#DFE5E7",
              }}
            >
              <NoProfileSvg size={350} />
            </Avatar>
          )}
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
};

export default TicketInfo;
