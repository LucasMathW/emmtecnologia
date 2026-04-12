// import { FormatMask } from './FormatMask';

// const formatSerializedId = (serializedId) => {
//   const formatMask = new FormatMask();
//   const number = serializedId?.replace('@c.us', '');

//   return formatMask.setPhoneFormatMask(number)?.replace('+55', '🇧🇷');
// };

// export default formatSerializedId;

import { FormatMask } from "./FormatMask";

const formatSerializedId = (serializedId) => {
  if (!serializedId) return "-";

  const formatMask = new FormatMask();
  const number = serializedId?.replace("@c.us", "");

  const formatted = formatMask.setPhoneFormatMask(number);
  if (!formatted) return number; // fallback: mostra o número bruto

  return formatted.replace("+55", "🇧🇷");
};

export default formatSerializedId;
