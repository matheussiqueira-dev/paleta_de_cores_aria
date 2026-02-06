"use strict";

function sanitizeText(value, maxLength = 240) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeStringArray(values, maxItems = 12, itemMaxLength = 48) {
  if (!Array.isArray(values)) {
    return [];
  }

  const normalized = values
    .map((value) => sanitizeText(value, itemMaxLength))
    .filter(Boolean)
    .slice(0, maxItems);

  return Array.from(new Set(normalized));
}

module.exports = {
  sanitizeText,
  sanitizeStringArray,
};
