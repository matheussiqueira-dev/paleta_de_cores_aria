"use strict";

const AUDIT_CHECKS = Object.freeze([
  {
    id: "text_on_background",
    label: "Texto principal sobre fundo",
    foregroundKey: "text",
    backgroundKey: "background",
    threshold: 4.5,
    weight: 30,
    recommendation: "Aumente o contraste entre texto e fundo para leitura confortável em textos longos.",
  },
  {
    id: "text_on_surface",
    label: "Texto principal sobre superfície",
    foregroundKey: "text",
    backgroundKey: "surface",
    threshold: 4.5,
    weight: 30,
    recommendation: "Garanta que cards e painéis mantenham contraste mínimo AA para texto regular.",
  },
  {
    id: "muted_on_background",
    label: "Texto secundário sobre fundo",
    foregroundKey: "muted",
    backgroundKey: "background",
    threshold: 4.5,
    weight: 15,
    recommendation: "Reforce a legibilidade do texto secundário para evitar perda de informação contextual.",
  },
  {
    id: "primary_on_background",
    label: "Primária sobre fundo",
    foregroundKey: "primary",
    backgroundKey: "background",
    threshold: 3,
    weight: 8,
    recommendation: "Ajuste a cor primária para destacar botões e CTAs com clareza visual.",
  },
  {
    id: "secondary_on_background",
    label: "Secundária sobre fundo",
    foregroundKey: "secondary",
    backgroundKey: "background",
    threshold: 3,
    weight: 8,
    recommendation: "Eleve a distinção da cor secundária para manter hierarquia entre ações.",
  },
  {
    id: "accent_on_background",
    label: "Acento sobre fundo",
    foregroundKey: "accent",
    backgroundKey: "background",
    threshold: 3,
    weight: 8,
    recommendation: "A cor de acento deve ser perceptível sem competir com elementos prioritários.",
  },
  {
    id: "border_on_background",
    label: "Borda sobre fundo",
    foregroundKey: "border",
    backgroundKey: "background",
    threshold: 1.5,
    weight: 1,
    recommendation: "Aumente o contraste das bordas para melhorar separação visual entre blocos.",
  },
]);

function buildPaletteAudit(tokens) {
  const checks = AUDIT_CHECKS.map((check) => {
    const foreground = String(tokens?.[check.foregroundKey] || "");
    const background = String(tokens?.[check.backgroundKey] || "");
    const ratio = contrastRatio(foreground, background);
    const passed = ratio >= check.threshold;
    const score = Math.min(1, ratio / check.threshold) * check.weight;

    return {
      id: check.id,
      label: check.label,
      foregroundToken: check.foregroundKey,
      backgroundToken: check.backgroundKey,
      foreground,
      background,
      threshold: check.threshold,
      ratio: Number(ratio.toFixed(2)),
      passed,
      score: Number(score.toFixed(2)),
      recommendation: passed ? null : check.recommendation,
    };
  });

  const totalScore = Number(checks.reduce((accumulator, item) => accumulator + item.score, 0).toFixed(2));
  const failingChecks = checks.filter((item) => !item.passed);

  return {
    score: totalScore,
    grade: resolveGrade(totalScore),
    checks,
    totalChecks: checks.length,
    failingChecks: failingChecks.length,
    recommendations: failingChecks.slice(0, 4).map((item) => item.recommendation).filter(Boolean),
  };
}

function resolveGrade(score) {
  if (score >= 90) {
    return "EXCELENTE";
  }
  if (score >= 75) {
    return "CONSISTENTE";
  }
  if (score >= 55) {
    return "ATENCAO";
  }
  return "CRITICO";
}

function contrastRatio(colorA, colorB) {
  const luminanceA = relativeLuminance(hexToRgb(colorA));
  const luminanceB = relativeLuminance(hexToRgb(colorB));
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(rgb) {
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function hexToRgb(hex) {
  const value = String(hex || "").trim().replace(/^#/, "");
  const safe = /^[0-9A-Fa-f]{6}$/.test(value) ? value : "000000";
  return {
    r: Number.parseInt(safe.slice(0, 2), 16),
    g: Number.parseInt(safe.slice(2, 4), 16),
    b: Number.parseInt(safe.slice(4, 6), 16),
  };
}

module.exports = {
  buildPaletteAudit,
};
