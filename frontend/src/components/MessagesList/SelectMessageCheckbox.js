// import React, { useContext } from "react";
// import toastError  from "../../errors/toastError";
// import { Checkbox } from "@mui/material";
// import { ForwardMessageContext } from "../../context/ForwarMessage/ForwardMessageContext";

// const SelectMessageCheckbox = ({ message }) => {
//     const [isChecked, setIsChecked] = React.useState(false);
//     const { showSelectMessageCheckbox,
//       setSelectedMessages,
//       selectedMessages,
//    } = useContext(ForwardMessageContext);

//     const handleSelectMessage = (e, message) => {
//         const list = selectedMessages;
//         if (e.target.checked) {
//           // if (list.length >= 4) {
//           //   toastError("Não é possível selecionar mais de 4 mensagens para encaminhar.");
//           //   return;
//           // }
//           setIsChecked(true);
//           list.push(message);
//         } else {
//           const index = list.findIndex((m) => m.id === message.id);
//           list.splice(index, 1);
//           setIsChecked(true);
//         }
//         setSelectedMessages(list);
//       }

//     if (showSelectMessageCheckbox) {
//         return <Checkbox color="primary" checked={isChecked} onChange={(e) => handleSelectMessage(e, message)}  />;
//     } else {
//         return null;
//     }
// }

// export default SelectMessageCheckbox;

import React, { useContext } from "react";
import { Checkbox } from "@mui/material";
import { ForwardMessageContext } from "../../context/ForwarMessage/ForwardMessageContext";

const SelectMessageCheckbox = ({ message }) => {
  const [isChecked, setIsChecked] = React.useState(false);
  const { showSelectMessageCheckbox, setSelectedMessages, selectedMessages } =
    useContext(ForwardMessageContext);

  const handleSelectMessage = (e, message) => {
    const checked = e.target.checked;
    const list = [...selectedMessages]; // ← cria cópia, não muta o original

    if (checked) {
      setIsChecked(true);
      list.push(message);
    } else {
      const index = list.findIndex((m) => m.id === message.id);
      list.splice(index, 1);
      setIsChecked(false); // ← estava "true", esse era o bug
    }
    setSelectedMessages(list);
  };

  if (!showSelectMessageCheckbox) return null;

  return (
    <Checkbox
      color="primary"
      checked={isChecked}
      onChange={(e) => handleSelectMessage(e, message)}
    />
  );
};

export default SelectMessageCheckbox;
