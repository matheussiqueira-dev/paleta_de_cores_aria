"use strict";

(() => {
  const STORAGE_KEYS = {
    palette: "aria.palette.v2",
    themeMode: "aria.themeMode",
    savedPalettes: "aria.savedPalettes.v1",
  };

  const THEME_MODES = ["light", "dark", "system"];

  const TOKEN_META = [
    { key: "primary", name: "Primária", hint: "Ações principais" },
    { key: "secondary", name: "Secundária", hint: "Ênfase secundária" },
    { key: "accent", name: "Acento", hint: "Destaques pontuais" },
    { key: "background", name: "Fundo", hint: "Base da página" },
    { key: "surface", name: "Superfície", hint: "Cards e painéis" },
    { key: "text", name: "Texto", hint: "Leitura principal" },
    { key: "muted", name: "Texto secundário", hint: "Apoio visual" },
    { key: "border", name: "Borda", hint: "Separadores" },
  ];

  const DEFAULT_PALETTE = Object.freeze({
    primary: "#2F6FED",
    secondary: "#13B89E",
    accent: "#F26D3D",
    background: "#F3F7FF",
    surface: "#FFFFFF",
    text: "#172033",
    muted: "#5A657C",
    border: "#D9E3F5",
  });

  const PRESETS = Object.freeze({
    default: { ...DEFAULT_PALETTE },
    ocean: {
      primary: "#246BFD",
      secondary: "#12A4C8",
      accent: "#F26B4A",
      background: "#EEF6FF",
      surface: "#FFFFFF",
      text: "#13233B",
      muted: "#4B617C",
      border: "#CFE0F4",
    },
    sunset: {
      primary: "#D25A2E",
      secondary: "#008C9E",
      accent: "#F2A541",
      background: "#FFF5EC",
      surface: "#FFFFFF",
      text: "#2A1B1A",
      muted: "#735B59",
      border: "#ECD8C7",
    },
    forest: {
      primary: "#2F7A4B",
      secondary: "#1E5D66",
      accent: "#D07C2A",
      background: "#F1F8F0",
      surface: "#FFFFFF",
      text: "#15261C",
      muted: "#4A6255",
      border: "#CFE0CF",
    },
  });

  const state = {
    palette: { ...DEFAULT_PALETTE },
    paletteName: "Paleta em edição",
    themeMode: "system",
    contrast: {
      foreground: DEFAULT_PALETTE.text,
      background: DEFAULT_PALETTE.background,
    },
    contrastLinkedToPalette: true,
    activePreset: "default",
    history: {
      stack: [],
      index: -1,
    },
    savedPalettes: [],
    selectedSavedPaletteId: null,
  };

  const swatchCards = {};
  let mediaQueryList = null;
  let toastTimer = null;

  const elements = {
    root: document.documentElement,
    favicon: document.getElementById("favicon"),
    themeMeta: document.getElementById("theme-color-meta"),
    themeButtons: Array.from(document.querySelectorAll(".theme-toggle__option[data-theme-mode]")),
    presetButtons: Array.from(document.querySelectorAll(".chip[data-preset]")),
    paletteForm: document.getElementById("palette-form"),
    colorInputs: Array.from(document.querySelectorAll("input[data-token]")),
    hexInputs: Array.from(document.querySelectorAll("input[data-token-text]")),
    swatchGrid: document.getElementById("swatch-grid"),
    tokenOutput: document.getElementById("token-output"),
    paletteNameInput: document.getElementById("palette-name"),
    savePaletteButton: document.getElementById("save-palette"),
    updateSavedPaletteButton: document.getElementById("update-saved-palette"),
    clearSavedPalettesButton: document.getElementById("clear-saved-palettes"),
    savedSummary: document.getElementById("saved-summary"),
    savedPalettesList: document.getElementById("saved-palettes-list"),
    contrastForeground: document.getElementById("contrast-foreground"),
    contrastForegroundText: document.getElementById("contrast-foreground-text"),
    contrastBackground: document.getElementById("contrast-background"),
    contrastBackgroundText: document.getElementById("contrast-background-text"),
    contrastRatio: document.getElementById("contrast-ratio-value"),
    wcagAANormal: document.getElementById("wcag-aa-normal"),
    wcagAAANormal: document.getElementById("wcag-aaa-normal"),
    wcagAALarge: document.getElementById("wcag-aa-large"),
    wcagAAALarge: document.getElementById("wcag-aaa-large"),
    contrastPreview: document.getElementById("contrast-preview"),
    toast: document.getElementById("toast"),
    shareButton: document.getElementById("share-link"),
    generateButton: document.getElementById("generate-harmony"),
    resetButton: document.getElementById("reset-palette"),
    copyCssButton: document.getElementById("copy-css"),
    undoButton: document.getElementById("undo-palette"),
    redoButton: document.getElementById("redo-palette"),
    copyJsonButton: document.getElementById("copy-json"),
    downloadJsonButton: document.getElementById("download-json"),
    importJsonButton: document.getElementById("import-json"),
    importJsonFile: document.getElementById("import-json-file"),
    swapContrastButton: document.getElementById("swap-contrast"),
    usePaletteContrastButton: document.getElementById("use-palette-contrast"),
    mobileMenuToggle: document.getElementById("mobile-menu-toggle"),
    mobileMenuPanel: document.getElementById("mobile-menu-panel"),
    mobileMenuLinks: Array.from(document.querySelectorAll("#mobile-menu-panel a")),
    navLinks: Array.from(document.querySelectorAll(".main-nav a, #mobile-menu-panel a")),
  };

  init();

  function init() {
    hydrateStateFromStorage();
    hydrateStateFromQuery();
    hydrateSavedPalettesFromStorage();

    initializeHistory(state.palette);
    buildSwatchCards();
    bindEvents();

    applyTheme(state.themeMode, false);
    applyPalette(state.palette, { persist: false, syncInputs: true, pushHistory: false });
    syncContrastInputs();
    updateContrast();
    setActivePresetChip(state.activePreset);
    updateHistoryButtons();
    syncPaletteNameInput();
    renderSavedPalettes();
    updateSavedPaletteControls();
    bindSectionTracking();
  }

  function bindEvents() {
    elements.themeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.themeMode;
        applyTheme(mode, true);
      });
    });

    elements.presetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const preset = button.dataset.preset;
        if (!preset || !PRESETS[preset]) {
          return;
        }
        state.activePreset = preset;
        state.contrastLinkedToPalette = true;
        state.paletteName = `Preset ${button.textContent?.trim() || preset}`;
        state.selectedSavedPaletteId = null;
        syncPaletteNameInput();
        applyPalette(PRESETS[preset]);
        showToast(`Preset "${button.textContent?.trim() || preset}" aplicado.`);
        setActivePresetChip(preset);
        renderSavedPalettes();
        updateSavedPaletteControls();
      });
    });

    elements.colorInputs.forEach((input) => {
      input.addEventListener("input", () => {
        const token = input.dataset.token;
        if (!token) {
          return;
        }
        updateToken(token, input.value);
      });
    });

    elements.hexInputs.forEach((input) => {
      input.addEventListener("input", () => {
        const normalized = normalizeHex(input.value, null);
        input.classList.toggle("is-invalid", !normalized);
      });

      input.addEventListener("blur", () => {
        commitHexInput(input);
      });

      input.addEventListener("change", () => {
        commitHexInput(input);
      });
    });

    if (elements.generateButton) {
      elements.generateButton.addEventListener("click", () => {
        const generated = createHarmonyFromPrimary(state.palette.primary);
        state.activePreset = "";
        state.contrastLinkedToPalette = true;
        state.selectedSavedPaletteId = null;
        state.paletteName = "Harmonia automática";
        syncPaletteNameInput();
        applyPalette(generated);
        setActivePresetChip("");
        showToast("Nova harmonia gerada com base na cor primária.");
        renderSavedPalettes();
        updateSavedPaletteControls();
      });
    }

    if (elements.resetButton) {
      elements.resetButton.addEventListener("click", () => {
        state.activePreset = "default";
        state.contrastLinkedToPalette = true;
        state.selectedSavedPaletteId = null;
        state.paletteName = "Paleta em edição";
        syncPaletteNameInput();
        applyPalette(DEFAULT_PALETTE);
        setActivePresetChip("default");
        showToast("Paleta restaurada para o padrão.");
        renderSavedPalettes();
        updateSavedPaletteControls();
      });
    }

    if (elements.undoButton) {
      elements.undoButton.addEventListener("click", () => {
        undoPalette();
      });
    }

    if (elements.redoButton) {
      elements.redoButton.addEventListener("click", () => {
        redoPalette();
      });
    }

    if (elements.copyCssButton) {
      elements.copyCssButton.addEventListener("click", () => {
        copyText(getCssTokenBlock(state.palette), "Variáveis CSS copiadas.");
      });
    }

    if (elements.copyJsonButton) {
      elements.copyJsonButton.addEventListener("click", () => {
        copyText(getJsonTokenBlock(state.palette), "JSON de tokens copiado.");
      });
    }

    if (elements.downloadJsonButton) {
      elements.downloadJsonButton.addEventListener("click", () => {
        const json = getJsonTokenBlock(state.palette);
        const blob = new Blob([json], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "paleta-aria-tokens.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast("Arquivo JSON pronto para download.");
      });
    }

    if (elements.importJsonButton && elements.importJsonFile) {
      elements.importJsonButton.addEventListener("click", () => {
        elements.importJsonFile.click();
      });

      elements.importJsonFile.addEventListener("change", async (event) => {
        const input = event.target;
        const file = input && input.files ? input.files[0] : null;
        if (!file) {
          return;
        }
        try {
          const text = await file.text();
          importPaletteFromJson(text);
        } catch (error) {
          showToast("Falha ao ler o arquivo JSON.");
        } finally {
          input.value = "";
        }
      });
    }

    if (elements.shareButton) {
      elements.shareButton.addEventListener("click", () => {
        const url = buildShareUrl();
        copyText(url, "Link compartilhável copiado.");
      });
    }

    if (elements.paletteNameInput) {
      elements.paletteNameInput.addEventListener("input", () => {
        state.paletteName = sanitizePaletteName(elements.paletteNameInput.value);
      });
    }

    if (elements.savePaletteButton) {
      elements.savePaletteButton.addEventListener("click", () => {
        saveCurrentPaletteToLibrary();
      });
    }

    if (elements.updateSavedPaletteButton) {
      elements.updateSavedPaletteButton.addEventListener("click", () => {
        updateSelectedSavedPalette();
      });
    }

    if (elements.clearSavedPalettesButton) {
      elements.clearSavedPalettesButton.addEventListener("click", () => {
        clearSavedPalettes();
      });
    }

    bindContrastControls();
    observeSystemTheme();
    bindKeyboardShortcuts();
    bindMobileMenu();
  }

  function bindContrastControls() {
    if (!elements.contrastForeground || !elements.contrastBackground) {
      return;
    }

    elements.contrastForeground.addEventListener("input", () => {
      state.contrast.foreground = normalizeHex(elements.contrastForeground.value, state.contrast.foreground);
      state.contrastLinkedToPalette = false;
      syncContrastInputs();
      updateContrast();
    });

    elements.contrastBackground.addEventListener("input", () => {
      state.contrast.background = normalizeHex(elements.contrastBackground.value, state.contrast.background);
      state.contrastLinkedToPalette = false;
      syncContrastInputs();
      updateContrast();
    });

    elements.contrastForegroundText?.addEventListener("blur", () => {
      commitContrastHexInput("foreground", elements.contrastForegroundText);
    });
    elements.contrastForegroundText?.addEventListener("change", () => {
      commitContrastHexInput("foreground", elements.contrastForegroundText);
    });

    elements.contrastBackgroundText?.addEventListener("blur", () => {
      commitContrastHexInput("background", elements.contrastBackgroundText);
    });
    elements.contrastBackgroundText?.addEventListener("change", () => {
      commitContrastHexInput("background", elements.contrastBackgroundText);
    });

    if (elements.swapContrastButton) {
      elements.swapContrastButton.addEventListener("click", () => {
        const currentForeground = state.contrast.foreground;
        state.contrast.foreground = state.contrast.background;
        state.contrast.background = currentForeground;
        state.contrastLinkedToPalette = false;
        syncContrastInputs();
        updateContrast();
      });
    }

    if (elements.usePaletteContrastButton) {
      elements.usePaletteContrastButton.addEventListener("click", () => {
        state.contrast.foreground = state.palette.text;
        state.contrast.background = state.palette.background;
        state.contrastLinkedToPalette = true;
        syncContrastInputs();
        updateContrast();
        showToast("Checker sincronizado com os tokens de texto e fundo.");
      });
    }
  }

  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();
      const isUndo = key === "z" && !event.shiftKey;
      const isRedo = key === "y" || (key === "z" && event.shiftKey);

      if (isUndo) {
        event.preventDefault();
        undoPalette();
      } else if (isRedo) {
        event.preventDefault();
        redoPalette();
      }
    });
  }

  function bindMobileMenu() {
    if (!elements.mobileMenuToggle || !elements.mobileMenuPanel) {
      return;
    }

    elements.mobileMenuToggle.addEventListener("click", () => {
      setMobileMenuOpen(!isMobileMenuOpen());
    });

    elements.mobileMenuLinks.forEach((link) => {
      link.addEventListener("click", () => {
        setMobileMenuOpen(false);
      });
    });

    document.addEventListener("click", (event) => {
      if (!isMobileMenuOpen()) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        elements.mobileMenuPanel.contains(target) ||
        elements.mobileMenuToggle.contains(target) ||
        !elements.mobileMenuPanel ||
        !elements.mobileMenuToggle
      ) {
        return;
      }
      setMobileMenuOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isMobileMenuOpen()) {
        setMobileMenuOpen(false);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 860 && isMobileMenuOpen()) {
        setMobileMenuOpen(false);
      }
    });
  }

  function isMobileMenuOpen() {
    return Boolean(
      elements.mobileMenuToggle &&
        elements.mobileMenuToggle.getAttribute("aria-expanded") === "true" &&
        elements.mobileMenuPanel &&
        !elements.mobileMenuPanel.hasAttribute("hidden")
    );
  }

  function setMobileMenuOpen(open) {
    if (!elements.mobileMenuToggle || !elements.mobileMenuPanel) {
      return;
    }
    const nextOpen = Boolean(open);
    elements.mobileMenuToggle.setAttribute("aria-expanded", String(nextOpen));
    elements.mobileMenuToggle.classList.toggle("is-open", nextOpen);
    if (nextOpen) {
      elements.mobileMenuPanel.removeAttribute("hidden");
    } else {
      elements.mobileMenuPanel.setAttribute("hidden", "");
    }
  }

  function bindSectionTracking() {
    const sectionHashes = Array.from(
      new Set(
        elements.navLinks
          .map((link) => link.getAttribute("href"))
          .filter((href) => typeof href === "string" && href.startsWith("#") && href.length > 1)
      )
    );

    const sections = sectionHashes
      .map((hash) => document.querySelector(hash))
      .filter((section) => section instanceof HTMLElement);

    if (sections.length === 0) {
      return;
    }

    const setActive = (hash) => {
      elements.navLinks.forEach((link) => {
        const isCurrent = link.getAttribute("href") === hash;
        link.classList.toggle("is-current", isCurrent);
        if (isCurrent) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    elements.navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const hash = link.getAttribute("href");
        if (typeof hash === "string" && hash.startsWith("#") && hash.length > 1) {
          setActive(hash);
        }
      });
    });

    if (typeof IntersectionObserver !== "function") {
      setActive(sectionHashes[0]);
      return;
    }

    const visibilityByHash = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const hash = `#${entry.target.id}`;
          visibilityByHash.set(hash, entry.intersectionRatio);
        });
        const ordered = Array.from(visibilityByHash.entries()).sort((a, b) => b[1] - a[1]);
        if (ordered.length > 0 && ordered[0][1] > 0.2) {
          setActive(ordered[0][0]);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.4, 0.65],
      }
    );

    sections.forEach((section) => {
      observer.observe(section);
      visibilityByHash.set(`#${section.id}`, 0);
    });
    setActive(sectionHashes[0]);
  }

  function commitHexInput(input) {
    if (!input) {
      return;
    }

    const token = input.dataset.tokenText;
    if (!token || !state.palette[token]) {
      return;
    }

    const normalized = normalizeHex(input.value, state.palette[token]);
    const isValid = normalizeHex(input.value, null) !== null;
    if (!isValid) {
      showToast("Valor hexadecimal inválido. O valor anterior foi mantido.");
    }
    updateToken(token, normalized, true);
  }

  function commitContrastHexInput(type, input) {
    if (!input) {
      return;
    }

    const fallback = type === "foreground" ? state.contrast.foreground : state.contrast.background;
    const normalized = normalizeHex(input.value, fallback);
    const valid = normalizeHex(input.value, null) !== null;
    if (!valid) {
      showToast("Valor hexadecimal inválido no checker de contraste.");
    } else {
      state.contrastLinkedToPalette = false;
    }

    if (type === "foreground") {
      state.contrast.foreground = normalized;
    } else {
      state.contrast.background = normalized;
    }
    syncContrastInputs();
    updateContrast();
  }

  function updateToken(token, nextValue, skipToast) {
    if (!Object.prototype.hasOwnProperty.call(state.palette, token)) {
      return;
    }
    const normalized = normalizeHex(nextValue, state.palette[token]);
    state.activePreset = "";
    setActivePresetChip("");
    applyPalette({ ...state.palette, [token]: normalized });
    if (!skipToast) {
      // Mantém interação discreta sem interromper o fluxo de edição.
    }
  }

  function applyPalette(nextPalette, options = {}) {
    const settings = {
      persist: true,
      syncInputs: true,
      pushHistory: true,
      ...options,
    };

    state.palette = sanitizePalette(nextPalette, state.palette);
    if (settings.pushHistory) {
      pushHistorySnapshot(state.palette);
    }
    TOKEN_META.forEach((tokenMeta) => {
      elements.root.style.setProperty(`--color-${tokenMeta.key}`, state.palette[tokenMeta.key]);
    });

    updateDerivedTokens(state.palette);

    if (settings.syncInputs) {
      syncPaletteInputs();
    }

    if (state.contrastLinkedToPalette) {
      state.contrast.foreground = state.palette.text;
      state.contrast.background = state.palette.background;
      syncContrastInputs();
    }

    renderSwatches();
    updateTokenOutput();
    updateContrast();
    updateBrowserChrome(resolveThemeMode(state.themeMode));

    if (settings.persist) {
      safeStorageSet(STORAGE_KEYS.palette, JSON.stringify(state.palette));
    }
    updateHistoryButtons();
  }

  function syncPaletteInputs() {
    const byTokenColor = new Map();
    elements.colorInputs.forEach((input) => {
      const token = input.dataset.token;
      if (!token) {
        return;
      }
      byTokenColor.set(token, input);
    });

    const byTokenText = new Map();
    elements.hexInputs.forEach((input) => {
      const token = input.dataset.tokenText;
      if (!token) {
        return;
      }
      byTokenText.set(token, input);
    });

    TOKEN_META.forEach((tokenMeta) => {
      const value = state.palette[tokenMeta.key];
      const colorInput = byTokenColor.get(tokenMeta.key);
      const textInput = byTokenText.get(tokenMeta.key);
      if (colorInput) {
        colorInput.value = value;
      }
      if (textInput) {
        textInput.value = value;
        textInput.classList.remove("is-invalid");
      }
    });
  }

  function buildSwatchCards() {
    if (!elements.swatchGrid) {
      return;
    }
    elements.swatchGrid.innerHTML = "";
    TOKEN_META.forEach((tokenMeta) => {
      const card = document.createElement("article");
      card.className = "swatch-card";

      const sample = document.createElement("div");
      sample.className = "swatch-card__sample";

      const description = document.createElement("div");
      const name = document.createElement("p");
      name.className = "swatch-card__name";
      name.textContent = tokenMeta.name;

      const hint = document.createElement("p");
      hint.className = "swatch-card__hint";
      hint.textContent = tokenMeta.hint;
      description.appendChild(name);
      description.appendChild(hint);

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "swatch-copy";
      copyButton.textContent = "Copiar";
      copyButton.setAttribute("aria-label", `Copiar token ${tokenMeta.name}`);
      copyButton.addEventListener("click", () => {
        copyText(state.palette[tokenMeta.key], `${tokenMeta.name} copiada.`);
      });

      sample.appendChild(description);
      sample.appendChild(copyButton);

      const meta = document.createElement("div");
      meta.className = "swatch-card__meta";
      const hex = document.createElement("p");
      hex.className = "swatch-card__hex";
      const ratio = document.createElement("p");
      ratio.className = "swatch-card__ratio";
      meta.appendChild(hex);
      meta.appendChild(ratio);

      card.appendChild(sample);
      card.appendChild(meta);
      elements.swatchGrid.appendChild(card);

      swatchCards[tokenMeta.key] = { sample, hex, ratio };
    });
  }

  function renderSwatches() {
    TOKEN_META.forEach((tokenMeta) => {
      const value = state.palette[tokenMeta.key];
      const refs = swatchCards[tokenMeta.key];
      if (!refs) {
        return;
      }
      refs.sample.style.background = value;
      refs.sample.style.color = pickReadableTextColor(value);
      refs.hex.textContent = value;

      const targetColor =
        tokenMeta.key === "background" || tokenMeta.key === "surface" || tokenMeta.key === "border"
          ? state.palette.text
          : state.palette.background;
      const label =
        tokenMeta.key === "background" || tokenMeta.key === "surface" || tokenMeta.key === "border" ? "Texto" : "Fundo";
      const ratio = contrastRatio(value, targetColor);
      refs.ratio.textContent = `${label} ${ratio.toFixed(2)}:1`;
      refs.ratio.dataset.level = ratio >= 4.5 ? "pass" : ratio >= 3 ? "warn" : "fail";
    });
  }

  function updateTokenOutput() {
    if (!elements.tokenOutput) {
      return;
    }
    elements.tokenOutput.textContent = `${getCssTokenBlock(state.palette)}\n\n${getJsonTokenBlock(state.palette)}`;
  }

  function bindThemeChangeForSystemPreference(listener) {
    if (!window.matchMedia) {
      return;
    }

    mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", listener);
    } else if (typeof mediaQueryList.addListener === "function") {
      mediaQueryList.addListener(listener);
    }
  }

  function observeSystemTheme() {
    bindThemeChangeForSystemPreference(() => {
      if (state.themeMode === "system") {
        applyTheme("system", false);
      }
    });
  }

  function applyTheme(mode, persist) {
    const validMode = THEME_MODES.includes(mode) ? mode : "system";
    state.themeMode = validMode;

    const resolvedTheme = resolveThemeMode(validMode);
    elements.root.setAttribute("data-theme-mode", validMode);
    elements.root.setAttribute("data-theme", resolvedTheme);
    setActiveThemeButton(validMode);
    updateBrowserChrome(resolvedTheme);

    if (persist) {
      safeStorageSet(STORAGE_KEYS.themeMode, validMode);
    }
  }

  function setActiveThemeButton(mode) {
    elements.themeButtons.forEach((button) => {
      const isActive = button.dataset.themeMode === mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function resolveThemeMode(mode) {
    if (mode === "system") {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      return prefersDark ? "dark" : "light";
    }
    return mode === "dark" ? "dark" : "light";
  }

  function updateBrowserChrome(resolvedTheme) {
    if (elements.favicon) {
      elements.favicon.setAttribute("href", resolvedTheme === "dark" ? "favicon-dark.svg" : "favicon-light.svg");
    }
    if (elements.themeMeta) {
      elements.themeMeta.setAttribute("content", resolvedTheme === "dark" ? "#0d1422" : state.palette.background);
    }
  }

  function syncContrastInputs() {
    if (elements.contrastForeground) {
      elements.contrastForeground.value = state.contrast.foreground;
    }
    if (elements.contrastForegroundText) {
      elements.contrastForegroundText.value = state.contrast.foreground;
      elements.contrastForegroundText.classList.remove("is-invalid");
    }
    if (elements.contrastBackground) {
      elements.contrastBackground.value = state.contrast.background;
    }
    if (elements.contrastBackgroundText) {
      elements.contrastBackgroundText.value = state.contrast.background;
      elements.contrastBackgroundText.classList.remove("is-invalid");
    }
  }

  function updateContrast() {
    const ratio = contrastRatio(state.contrast.foreground, state.contrast.background);

    if (elements.contrastRatio) {
      elements.contrastRatio.textContent = `${ratio.toFixed(2)}:1`;
    }
    applyWcagResult(elements.wcagAANormal, ratio >= 4.5);
    applyWcagResult(elements.wcagAAANormal, ratio >= 7);
    applyWcagResult(elements.wcagAALarge, ratio >= 3);
    applyWcagResult(elements.wcagAAALarge, ratio >= 4.5);

    if (elements.contrastPreview) {
      elements.contrastPreview.style.background = state.contrast.background;
      elements.contrastPreview.style.color = state.contrast.foreground;
      elements.contrastPreview.style.borderColor = pickReadableTextColor(state.contrast.background, 0.65);
    }
  }

  function applyWcagResult(element, isPass) {
    if (!element) {
      return;
    }
    element.textContent = isPass ? "Aprovado" : "Reprovado";
    element.dataset.level = isPass ? "pass" : "fail";
  }

  function getCssTokenBlock(palette) {
    const lines = [":root {"];
    TOKEN_META.forEach((tokenMeta) => {
      lines.push(`  --color-${tokenMeta.key}: ${palette[tokenMeta.key]};`);
    });
    lines.push("}");
    return lines.join("\n");
  }

  function getJsonTokenBlock(palette) {
    return JSON.stringify(
      TOKEN_META.reduce((tokens, tokenMeta) => {
        tokens[tokenMeta.key] = palette[tokenMeta.key];
        return tokens;
      }, {}),
      null,
      2
    );
  }

  function createHarmonyFromPrimary(primaryHex) {
    const primary = normalizeHex(primaryHex, DEFAULT_PALETTE.primary);
    const hsl = rgbToHsl(hexToRgb(primary));

    const secondary = hslToHex((hsl.h + 34) % 360, clamp(hsl.s + 8, 22, 92), clamp(hsl.l - 6, 24, 65));
    const accent = hslToHex((hsl.h + 168) % 360, clamp(hsl.s + 16, 35, 96), clamp(hsl.l + 14, 44, 70));
    const background = hslToHex((hsl.h + 10) % 360, clamp(hsl.s - 34, 5, 32), 97);
    const text = hslToHex((hsl.h + 220) % 360, clamp(hsl.s - 26, 16, 45), 16);
    const muted = hslToHex((hsl.h + 216) % 360, clamp(hsl.s - 36, 10, 40), 41);
    const border = hslToHex((hsl.h + 12) % 360, clamp(hsl.s - 18, 10, 44), 86);

    return {
      primary,
      secondary,
      accent,
      background,
      surface: "#FFFFFF",
      text,
      muted,
      border,
    };
  }

  function updateDerivedTokens(palette) {
    const primaryStrong = shiftLightness(palette.primary, -12);
    const secondaryStrong = shiftLightness(palette.secondary, -12);
    const accentStrong = shiftLightness(palette.accent, -12);

    elements.root.style.setProperty("--color-primary-strong", primaryStrong);
    elements.root.style.setProperty("--color-secondary-strong", secondaryStrong);
    elements.root.style.setProperty("--color-accent-strong", accentStrong);

    const heroStart = shiftLightness(palette.primary, -26);
    const heroMid = shiftLightness(palette.primary, -8);
    const heroEnd = shiftLightness(palette.secondary, -8);
    elements.root.style.setProperty(
      "--hero-gradient",
      `linear-gradient(130deg, ${heroStart} 0%, ${heroMid} 48%, ${heroEnd} 100%)`
    );
  }

  function hydrateStateFromStorage() {
    const storedTheme = safeStorageGet(STORAGE_KEYS.themeMode);
    if (storedTheme && THEME_MODES.includes(storedTheme)) {
      state.themeMode = storedTheme;
    } else {
      const themeFromDom = document.documentElement.getAttribute("data-theme-mode");
      state.themeMode = THEME_MODES.includes(themeFromDom) ? themeFromDom : "system";
    }

    const storedPaletteRaw = safeStorageGet(STORAGE_KEYS.palette);
    if (!storedPaletteRaw) {
      return;
    }
    try {
      const parsed = JSON.parse(storedPaletteRaw);
      state.palette = sanitizePalette(parsed, state.palette);
      state.activePreset = "";
    } catch (error) {
      // Ignora dados inválidos e mantém fallback.
    }
  }

  function hydrateStateFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const encodedState = params.get("state");
    if (!encodedState) {
      return;
    }

    try {
      const payload = JSON.parse(fromBase64Url(encodedState));
      if (payload && payload.palette) {
        state.palette = sanitizePalette(payload.palette, state.palette);
        state.activePreset = "";
      }
      if (payload && THEME_MODES.includes(payload.themeMode)) {
        state.themeMode = payload.themeMode;
      }
    } catch (error) {
      showToast("Não foi possível carregar a paleta compartilhada.");
    }
  }

  function buildShareUrl() {
    const payload = {
      palette: state.palette,
      themeMode: state.themeMode,
    };
    const encoded = toBase64Url(JSON.stringify(payload));
    const url = new URL(window.location.href);
    url.searchParams.set("state", encoded);
    return url.toString();
  }

  function setActivePresetChip(name) {
    elements.presetButtons.forEach((button) => {
      const isActive = button.dataset.preset === name;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function importPaletteFromJson(jsonText) {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      showToast("JSON inválido. Revise o arquivo e tente novamente.");
      return;
    }

    const candidate = extractPaletteCandidate(parsed);
    if (!candidate || typeof candidate !== "object") {
      showToast("Formato não suportado. Use um JSON com tokens de cor.");
      return;
    }

    const hasAtLeastOneToken = TOKEN_META.some((tokenMeta) => normalizeHex(candidate[tokenMeta.key], null));
    if (!hasAtLeastOneToken) {
      showToast("Nenhum token reconhecido no JSON importado.");
      return;
    }

    state.activePreset = "";
    state.contrastLinkedToPalette = true;
    state.selectedSavedPaletteId = null;
    state.paletteName = sanitizePaletteName(parsed?.name || parsed?.metadata?.name || "Paleta importada") || "Paleta importada";
    setActivePresetChip("");
    syncPaletteNameInput();
    applyPalette(sanitizePalette(candidate, state.palette));
    renderSavedPalettes();
    updateSavedPaletteControls();
    showToast("Tokens importados com sucesso.");
  }

  function extractPaletteCandidate(payload) {
    if (!payload || typeof payload !== "object") {
      return null;
    }
    if (payload.palette && typeof payload.palette === "object") {
      return payload.palette;
    }
    if (payload.tokens && typeof payload.tokens === "object") {
      return payload.tokens;
    }
    if (payload.colors && typeof payload.colors === "object") {
      return payload.colors;
    }
    return payload;
  }

  function hydrateSavedPalettesFromStorage() {
    const raw = safeStorageGet(STORAGE_KEYS.savedPalettes);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      state.savedPalettes = parsed
        .map((entry) => normalizeSavedPaletteEntry(entry))
        .filter(Boolean)
        .slice(0, 30);
    } catch (error) {
      state.savedPalettes = [];
    }
  }

  function normalizeSavedPaletteEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const id = typeof entry.id === "string" ? entry.id : createLocalId();
    const name = sanitizePaletteName(entry.name);
    const palette = sanitizePalette(entry.palette || entry.tokens || entry.colors, DEFAULT_PALETTE);
    const createdAt = typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString();
    const updatedAt = typeof entry.updatedAt === "string" ? entry.updatedAt : createdAt;

    return {
      id,
      name: name || "Paleta sem nome",
      palette,
      createdAt,
      updatedAt,
    };
  }

  function createLocalId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `palette-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  function persistSavedPalettes() {
    safeStorageSet(STORAGE_KEYS.savedPalettes, JSON.stringify(state.savedPalettes));
  }

  function sanitizePaletteName(name) {
    if (typeof name !== "string") {
      return "";
    }
    return name
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  function syncPaletteNameInput() {
    if (!elements.paletteNameInput) {
      return;
    }
    elements.paletteNameInput.value = state.paletteName;
  }

  function saveCurrentPaletteToLibrary() {
    const name = sanitizePaletteName(elements.paletteNameInput?.value || state.paletteName) || `Paleta ${state.savedPalettes.length + 1}`;
    const now = new Date().toISOString();
    const entry = {
      id: createLocalId(),
      name,
      palette: getPaletteSnapshot(state.palette),
      createdAt: now,
      updatedAt: now,
    };

    state.savedPalettes = [entry, ...state.savedPalettes].slice(0, 30);
    state.selectedSavedPaletteId = entry.id;
    state.paletteName = name;

    persistSavedPalettes();
    syncPaletteNameInput();
    renderSavedPalettes();
    updateSavedPaletteControls();
    showToast("Paleta salva na biblioteca local.");
  }

  function updateSelectedSavedPalette() {
    if (!state.selectedSavedPaletteId) {
      showToast("Selecione uma paleta salva para atualizar.");
      return;
    }

    const target = state.savedPalettes.find((entry) => entry.id === state.selectedSavedPaletteId);
    if (!target) {
      state.selectedSavedPaletteId = null;
      updateSavedPaletteControls();
      renderSavedPalettes();
      showToast("Paleta selecionada não encontrada.");
      return;
    }

    const name = sanitizePaletteName(elements.paletteNameInput?.value || state.paletteName) || target.name;
    target.name = name;
    target.palette = getPaletteSnapshot(state.palette);
    target.updatedAt = new Date().toISOString();
    state.paletteName = name;

    persistSavedPalettes();
    syncPaletteNameInput();
    renderSavedPalettes();
    updateSavedPaletteControls();
    showToast("Paleta salva atualizada.");
  }

  function loadSavedPaletteById(id) {
    const target = state.savedPalettes.find((entry) => entry.id === id);
    if (!target) {
      showToast("Paleta não encontrada na biblioteca.");
      return;
    }

    state.selectedSavedPaletteId = target.id;
    state.activePreset = "";
    state.contrastLinkedToPalette = true;
    state.paletteName = target.name;
    setActivePresetChip("");
    syncPaletteNameInput();
    applyPalette(target.palette);
    renderSavedPalettes();
    updateSavedPaletteControls();
    showToast(`Paleta "${target.name}" aplicada.`);
  }

  function deleteSavedPaletteById(id) {
    const previousCount = state.savedPalettes.length;
    state.savedPalettes = state.savedPalettes.filter((entry) => entry.id !== id);
    if (state.savedPalettes.length === previousCount) {
      return;
    }

    if (state.selectedSavedPaletteId === id) {
      state.selectedSavedPaletteId = null;
    }

    persistSavedPalettes();
    renderSavedPalettes();
    updateSavedPaletteControls();
    showToast("Paleta removida da biblioteca.");
  }

  function clearSavedPalettes() {
    if (state.savedPalettes.length === 0) {
      showToast("A biblioteca já está vazia.");
      return;
    }
    state.savedPalettes = [];
    state.selectedSavedPaletteId = null;
    persistSavedPalettes();
    renderSavedPalettes();
    updateSavedPaletteControls();
    showToast("Biblioteca local limpa.");
  }

  function updateSavedPaletteControls() {
    if (elements.updateSavedPaletteButton) {
      const hasSelection = Boolean(
        state.selectedSavedPaletteId && state.savedPalettes.some((entry) => entry.id === state.selectedSavedPaletteId)
      );
      elements.updateSavedPaletteButton.disabled = !hasSelection;
      elements.updateSavedPaletteButton.setAttribute("aria-disabled", String(!hasSelection));
    }

    if (elements.clearSavedPalettesButton) {
      const hasItems = state.savedPalettes.length > 0;
      elements.clearSavedPalettesButton.disabled = !hasItems;
      elements.clearSavedPalettesButton.setAttribute("aria-disabled", String(!hasItems));
    }
  }

  function renderSavedPalettes() {
    if (!elements.savedPalettesList || !elements.savedSummary) {
      return;
    }

    elements.savedPalettesList.innerHTML = "";
    if (state.savedPalettes.length === 0) {
      const empty = document.createElement("p");
      empty.className = "saved-empty";
      empty.textContent = "Salve variações da sua paleta para comparar ideias e acelerar decisões de design.";
      elements.savedPalettesList.appendChild(empty);
      elements.savedSummary.textContent = "Nenhuma paleta salva ainda.";
      return;
    }

    const formatter = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });

    elements.savedSummary.textContent = `${state.savedPalettes.length} paleta(s) armazenada(s) localmente.`;

    state.savedPalettes.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "saved-card";
      if (entry.id === state.selectedSavedPaletteId) {
        card.classList.add("is-selected");
      }

      const header = document.createElement("header");
      header.className = "saved-card__header";

      const titleWrap = document.createElement("div");
      const title = document.createElement("h3");
      title.className = "saved-card__title";
      title.textContent = entry.name;
      const time = document.createElement("p");
      time.className = "saved-card__time";
      const timestamp = new Date(entry.updatedAt);
      time.textContent = `Atualizada em ${Number.isNaN(timestamp.getTime()) ? entry.updatedAt : formatter.format(timestamp)}`;
      titleWrap.appendChild(title);
      titleWrap.appendChild(time);

      const chips = document.createElement("div");
      chips.className = "saved-card__chips";
      ["primary", "secondary", "accent", "background"].forEach((tokenKey) => {
        const chip = document.createElement("span");
        chip.style.background = entry.palette[tokenKey];
        chip.title = `${tokenKey}: ${entry.palette[tokenKey]}`;
        chips.appendChild(chip);
      });

      header.appendChild(titleWrap);
      header.appendChild(chips);

      const actions = document.createElement("div");
      actions.className = "saved-card__actions";

      const applyButton = document.createElement("button");
      applyButton.type = "button";
      applyButton.className = "button button--ghost";
      applyButton.textContent = "Aplicar";
      applyButton.addEventListener("click", () => {
        loadSavedPaletteById(entry.id);
      });

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "button button--ghost";
      removeButton.textContent = "Excluir";
      removeButton.addEventListener("click", () => {
        deleteSavedPaletteById(entry.id);
      });

      actions.appendChild(applyButton);
      actions.appendChild(removeButton);

      card.appendChild(header);
      card.appendChild(actions);
      elements.savedPalettesList.appendChild(card);
    });
  }

  function initializeHistory(initialPalette) {
    const snapshot = getPaletteSnapshot(initialPalette);
    state.history.stack = [snapshot];
    state.history.index = 0;
  }

  function pushHistorySnapshot(palette) {
    const nextSnapshot = getPaletteSnapshot(palette);
    const current = state.history.stack[state.history.index];
    if (current && arePalettesEqual(current, nextSnapshot)) {
      return;
    }

    if (state.history.index < state.history.stack.length - 1) {
      state.history.stack = state.history.stack.slice(0, state.history.index + 1);
    }

    state.history.stack.push(nextSnapshot);
    state.history.index = state.history.stack.length - 1;

    const maxHistorySize = 80;
    if (state.history.stack.length > maxHistorySize) {
      state.history.stack.shift();
      state.history.index = state.history.stack.length - 1;
    }
  }

  function undoPalette() {
    if (state.history.index <= 0) {
      showToast("Não há ações anteriores para desfazer.");
      return;
    }

    state.history.index -= 1;
    const snapshot = state.history.stack[state.history.index];
    state.activePreset = "";
    setActivePresetChip("");
    applyPalette(snapshot, { pushHistory: false });
    showToast("Ação desfeita.");
  }

  function redoPalette() {
    if (state.history.index >= state.history.stack.length - 1) {
      showToast("Não há ações futuras para refazer.");
      return;
    }

    state.history.index += 1;
    const snapshot = state.history.stack[state.history.index];
    state.activePreset = "";
    setActivePresetChip("");
    applyPalette(snapshot, { pushHistory: false });
    showToast("Ação refeita.");
  }

  function updateHistoryButtons() {
    if (!elements.undoButton || !elements.redoButton) {
      return;
    }

    const canUndo = state.history.index > 0;
    const canRedo = state.history.index < state.history.stack.length - 1;

    elements.undoButton.disabled = !canUndo;
    elements.redoButton.disabled = !canRedo;
    elements.undoButton.setAttribute("aria-disabled", String(!canUndo));
    elements.redoButton.setAttribute("aria-disabled", String(!canRedo));
  }

  function getPaletteSnapshot(palette) {
    const snapshot = {};
    TOKEN_META.forEach((tokenMeta) => {
      snapshot[tokenMeta.key] = palette[tokenMeta.key];
    });
    return snapshot;
  }

  function arePalettesEqual(a, b) {
    return TOKEN_META.every((tokenMeta) => a[tokenMeta.key] === b[tokenMeta.key]);
  }

  function sanitizePalette(candidate, basePalette) {
    const safePalette = { ...(basePalette || DEFAULT_PALETTE) };
    if (!candidate || typeof candidate !== "object") {
      return safePalette;
    }
    TOKEN_META.forEach((tokenMeta) => {
      const nextValue = normalizeHex(candidate[tokenMeta.key], null);
      if (nextValue) {
        safePalette[tokenMeta.key] = nextValue;
      }
    });
    return safePalette;
  }

  function normalizeHex(input, fallback) {
    if (typeof input !== "string") {
      return fallback ?? null;
    }
    let value = input.trim().replace(/^#/, "");
    if (/^[0-9A-Fa-f]{3}$/.test(value)) {
      value = value
        .split("")
        .map((char) => char + char)
        .join("");
    }
    if (!/^[0-9A-Fa-f]{6}$/.test(value)) {
      return fallback ?? null;
    }
    return `#${value.toUpperCase()}`;
  }

  function copyText(text, successMessage) {
    if (!text) {
      return;
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showToast(successMessage);
        })
        .catch(() => {
          fallbackCopy(text, successMessage);
        });
      return;
    }
    fallbackCopy(text, successMessage);
  }

  function fallbackCopy(text, successMessage) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      showToast(successMessage);
    } catch (error) {
      showToast("Não foi possível copiar automaticamente.");
    }
    textarea.remove();
  }

  function showToast(message) {
    if (!elements.toast || !message) {
      return;
    }
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2400);
  }

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Falha silenciosa em contextos sem permissão de storage.
    }
  }

  function toBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function fromBase64Url(encoded) {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "===".slice((normalized.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function hexToRgb(hex) {
    const normalized = normalizeHex(hex, null);
    if (!normalized) {
      return { r: 0, g: 0, b: 0 };
    }
    const value = normalized.slice(1);
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  function rgbToHex(r, g, b) {
    const parts = [r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0"));
    return `#${parts.join("").toUpperCase()}`;
  }

  function rgbToHsl(rgb) {
    const red = rgb.r / 255;
    const green = rgb.g / 255;
    const blue = rgb.b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    const lightness = (max + min) / 2;

    let hue = 0;
    let saturation = 0;

    if (delta !== 0) {
      saturation = delta / (1 - Math.abs(2 * lightness - 1));
      if (max === red) {
        hue = 60 * (((green - blue) / delta) % 6);
      } else if (max === green) {
        hue = 60 * ((blue - red) / delta + 2);
      } else {
        hue = 60 * ((red - green) / delta + 4);
      }
    }

    if (hue < 0) {
      hue += 360;
    }

    return {
      h: Math.round(hue),
      s: Math.round(saturation * 100),
      l: Math.round(lightness * 100),
    };
  }

  function hslToHex(h, s, l) {
    const hue = ((h % 360) + 360) % 360;
    const saturation = clamp(s, 0, 100) / 100;
    const lightness = clamp(l, 0, 100) / 100;

    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lightness - chroma / 2;

    let redPrime = 0;
    let greenPrime = 0;
    let bluePrime = 0;

    if (hue < 60) {
      redPrime = chroma;
      greenPrime = x;
    } else if (hue < 120) {
      redPrime = x;
      greenPrime = chroma;
    } else if (hue < 180) {
      greenPrime = chroma;
      bluePrime = x;
    } else if (hue < 240) {
      greenPrime = x;
      bluePrime = chroma;
    } else if (hue < 300) {
      redPrime = x;
      bluePrime = chroma;
    } else {
      redPrime = chroma;
      bluePrime = x;
    }

    return rgbToHex((redPrime + m) * 255, (greenPrime + m) * 255, (bluePrime + m) * 255);
  }

  function shiftLightness(hex, delta) {
    const hsl = rgbToHsl(hexToRgb(hex));
    return hslToHex(hsl.h, hsl.s, clamp(hsl.l + delta, 0, 100));
  }

  function contrastRatio(colorA, colorB) {
    const lumA = relativeLuminance(hexToRgb(colorA));
    const lumB = relativeLuminance(hexToRgb(colorB));
    const lighter = Math.max(lumA, lumB);
    const darker = Math.min(lumA, lumB);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function relativeLuminance(rgb) {
    const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function pickReadableTextColor(backgroundHex, opacity) {
    const dark = "#101623";
    const light = "#F8FBFF";
    const best = contrastRatio(dark, backgroundHex) >= contrastRatio(light, backgroundHex) ? dark : light;
    if (typeof opacity === "number" && opacity < 1) {
      const rgb = hexToRgb(best);
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }
    return best;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
