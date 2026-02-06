"use strict";

const HEX_COLOR_REGEX = /^#([0-9A-F]{6})$/i;

function normalizeHexColor(input) {
  if (typeof input !== "string") {
    return null;
  }

  let value = input.trim();
  if (!value.startsWith("#")) {
    value = `#${value}`;
  }

  const shortMatch = value.match(/^#([0-9A-F]{3})$/i);
  if (shortMatch) {
    const expanded = shortMatch[1]
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
    value = `#${expanded}`;
  }

  if (!HEX_COLOR_REGEX.test(value)) {
    return null;
  }

  return value.toUpperCase();
}

module.exports = {
  normalizeHexColor,
  HEX_COLOR_REGEX,
};
