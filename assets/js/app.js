"use strict";

(() => {
  const STORAGE_KEYS = {
    palette: "aria.palette.v2",
    themeMode: "aria.themeMode",
    visionMode: "aria.visionMode",
    savedPalettes: "aria.savedPalettes.v1",
    savedPaletteFilter: "aria.savedPalettes.filter.v1",
    apiConfig: "aria.api.config.v1",
    apiSession: "aria.api.session.v1",
    apiCloudQuery: "aria.api.cloudQuery.v1",
  };

  const THEME_MODES = ["light", "dark", "system"];
  const VISION_MODES = ["none", "protanopia", "deuteranopia", "tritanopia", "achromatopsia"];

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

  const AUDIT_CHECKS = Object.freeze([
    {
      id: "text_on_background",
      label: "Texto principal sobre fundo",
      foreground: "text",
      background: "background",
      threshold: 4.5,
      weight: 30,
    },
    {
      id: "text_on_surface",
      label: "Texto principal sobre superfície",
      foreground: "text",
      background: "surface",
      threshold: 4.5,
      weight: 30,
    },
    {
      id: "muted_on_background",
      label: "Texto secundário sobre fundo",
      foreground: "muted",
      background: "background",
      threshold: 4.5,
      weight: 15,
    },
    {
      id: "primary_on_background",
      label: "Primária sobre fundo",
      foreground: "primary",
      background: "background",
      threshold: 3,
      weight: 8,
    },
    {
      id: "secondary_on_background",
      label: "Secundária sobre fundo",
      foreground: "secondary",
      background: "background",
      threshold: 3,
      weight: 8,
    },
    {
      id: "accent_on_background",
      label: "Acento sobre fundo",
      foreground: "accent",
      background: "background",
      threshold: 3,
      weight: 8,
    },
    {
      id: "border_on_background",
      label: "Borda sobre fundo",
      foreground: "border",
      background: "background",
      threshold: 1.5,
      weight: 1,
    },
  ]);

  const state = {
    palette: { ...DEFAULT_PALETTE },
    paletteName: "Paleta em edição",
    themeMode: "system",
    visionMode: "none",
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
    savedPaletteFilter: "all",
    selectedSavedPaletteId: null,
    api: {
      baseUrl: "",
      accessToken: "",
      refreshToken: "",
      user: null,
      cloudPalettes: [],
      cloudTotal: 0,
      cloudHasMore: false,
      loadingCloudPalettes: false,
      cloudQuery: {
        search: "",
        visibility: "all",
        sortBy: "updatedAt",
        sortDir: "desc",
      },
      cloudAnalytics: null,
    },
  };

  const colorInputByToken = new Map();
  const hexInputByToken = new Map();
  const swatchCards = {};
  let mediaQueryList = null;
  let toastTimer = null;
  let palettePersistTimer = null;
  let cloudSyncTimer = null;
  let cloudSyncVersion = 0;

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
    savedFilterAllButton: document.getElementById("saved-filter-all"),
    savedFilterFavoritesButton: document.getElementById("saved-filter-favorites"),
    savedFavoritesCount: document.getElementById("saved-favorites-count"),
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
    autoFixContrastButton: document.getElementById("auto-fix-contrast"),
    mobileMenuToggle: document.getElementById("mobile-menu-toggle"),
    mobileMenuPanel: document.getElementById("mobile-menu-panel"),
    mobileMenuLinks: Array.from(document.querySelectorAll("#mobile-menu-panel a")),
    navLinks: Array.from(document.querySelectorAll(".main-nav a, #mobile-menu-panel a")),
    apiBaseUrlInput: document.getElementById("api-base-url"),
    apiSaveConfigButton: document.getElementById("api-save-config"),
    apiNameInput: document.getElementById("api-auth-name"),
    apiEmailInput: document.getElementById("api-auth-email"),
    apiPasswordInput: document.getElementById("api-auth-password"),
    apiRegisterButton: document.getElementById("api-register"),
    apiLoginButton: document.getElementById("api-login"),
    apiLogoutButton: document.getElementById("api-logout"),
    apiSessionStatus: document.getElementById("api-session-status"),
    apiPublishPublicCheckbox: document.getElementById("api-publish-public"),
    apiPublishPaletteButton: document.getElementById("api-publish-palette"),
    apiSyncPalettesButton: document.getElementById("api-sync-palettes"),
    apiCloudSearchInput: document.getElementById("api-cloud-search"),
    apiCloudVisibilitySelect: document.getElementById("api-cloud-visibility"),
    apiCloudSortSelect: document.getElementById("api-cloud-sort"),
    apiCloudSortDirSelect: document.getElementById("api-cloud-sort-dir"),
    apiCloudResetFiltersButton: document.getElementById("api-cloud-reset-filters"),
    apiCloudSummary: document.getElementById("api-cloud-summary"),
    apiCloudPalettesList: document.getElementById("api-cloud-palettes-list"),
    apiCloudQualitySummary: document.getElementById("api-cloud-quality-summary"),
    apiCloudQualityDistribution: document.getElementById("api-cloud-quality-distribution"),
    apiCloudRiskList: document.getElementById("api-cloud-risk-list"),
    uxQualityLabel: document.getElementById("ux-quality-label"),
    uxContrastScore: document.getElementById("ux-contrast-score"),
    uxLibraryCount: document.getElementById("ux-library-count"),
    uxCloudCount: document.getElementById("ux-cloud-count"),
    uxStageLabel: document.getElementById("ux-stage-label"),
    uxQualityNote: document.getElementById("ux-quality-note"),
    auditScore: document.getElementById("audit-score"),
    auditGrade: document.getElementById("audit-grade"),
    auditSummary: document.getElementById("audit-summary"),
    auditList: document.getElementById("audit-list"),
    copyAuditButton: document.getElementById("copy-audit-report"),
    visionModeSelect: document.getElementById("vision-mode-select"),
    visionModeStatus: document.getElementById("vision-mode-status"),
    journeySteps: Array.from(document.querySelectorAll(".journey-step")),
    revealPanels: Array.from(document.querySelectorAll(".panel")),
  };

  init();

  function init() {
    state.api.baseUrl = getDefaultApiBaseUrl();
    cachePaletteInputRefs();
    hydrateStateFromStorage();
    hydrateVisionModeFromStorage();
    hydrateStateFromQuery();
    hydrateSavedPalettesFromStorage();
    hydrateSavedPaletteFilter();
    hydrateApiStateFromStorage();
    hydrateApiCloudQueryFromStorage();

    initializeHistory(state.palette);
    buildSwatchCards();
    bindEvents();

    applyTheme(state.themeMode, false);
    applyVisionMode(state.visionMode, false);
    applyPalette(state.palette, { persist: false, syncInputs: true, pushHistory: false });
    syncContrastInputs();
    updateContrast();
    setActivePresetChip(state.activePreset);
    updateHistoryButtons();
    syncPaletteNameInput();
    renderSavedPalettes();
    updateSavedPaletteControls();
    syncApiInputs();
    syncApiCloudFilterInputs();
    renderCloudPalettes();
    renderCloudAnalytics();
    updateApiSessionStatus();
    updateApiControls();
    configureInputAccessibility();
    updateExperienceInsights();
    bindSectionTracking();
    setupRevealAnimations();
    bootstrapApiSession();
  }

  function cachePaletteInputRefs() {
    colorInputByToken.clear();
    hexInputByToken.clear();

    elements.colorInputs.forEach((input) => {
      const token = input.dataset.token;
      if (token) {
        colorInputByToken.set(token, input);
      }
    });

    elements.hexInputs.forEach((input) => {
      const token = input.dataset.tokenText;
      if (token) {
        hexInputByToken.set(token, input);
      }
    });
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

    if (elements.savedFilterAllButton) {
      elements.savedFilterAllButton.addEventListener("click", () => {
        setSavedPaletteFilter("all");
      });
    }

    if (elements.savedFilterFavoritesButton) {
      elements.savedFilterFavoritesButton.addEventListener("click", () => {
        setSavedPaletteFilter("favorites");
      });
    }

    if (elements.copyAuditButton) {
      elements.copyAuditButton.addEventListener("click", () => {
        const auditReport = buildPaletteAuditReport(state.palette);
        copyText(JSON.stringify(auditReport, null, 2), "Relatório de auditoria copiado.");
      });
    }

    if (elements.visionModeSelect) {
      elements.visionModeSelect.addEventListener("change", () => {
        applyVisionMode(elements.visionModeSelect.value, true);
      });
    }

    window.addEventListener("beforeunload", () => {
      flushPalettePersist();
    });

    bindContrastControls();
    observeSystemTheme();
    bindKeyboardShortcuts();
    bindMobileMenu();
    bindCloudEvents();
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

    if (elements.autoFixContrastButton) {
      elements.autoFixContrastButton.addEventListener("click", () => {
        autoFixPaletteContrast();
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

  function bindCloudEvents() {
    if (elements.apiSaveConfigButton && elements.apiBaseUrlInput) {
      elements.apiSaveConfigButton.addEventListener("click", () => {
        const normalized = normalizeApiBaseUrl(elements.apiBaseUrlInput.value);
        if (!normalized) {
          showToast("Informe uma URL válida para a API.");
          elements.apiBaseUrlInput.classList.add("is-invalid");
          return;
        }
        elements.apiBaseUrlInput.classList.remove("is-invalid");
        state.api.baseUrl = normalized;
        persistApiConfig();
        syncApiInputs();
        showToast("Endpoint da API salvo.");
      });
    }

    if (elements.apiRegisterButton) {
      elements.apiRegisterButton.addEventListener("click", async () => {
        await registerApiUser();
      });
    }

    if (elements.apiLoginButton) {
      elements.apiLoginButton.addEventListener("click", async () => {
        await loginApiUser();
      });
    }

    if (elements.apiLogoutButton) {
      elements.apiLogoutButton.addEventListener("click", async () => {
        await logoutApiUser();
      });
    }

    if (elements.apiPublishPaletteButton) {
      elements.apiPublishPaletteButton.addEventListener("click", async () => {
        await publishCurrentPaletteToCloud();
      });
    }

    if (elements.apiSyncPalettesButton) {
      elements.apiSyncPalettesButton.addEventListener("click", async () => {
        await syncCloudPalettes();
      });
    }

    elements.apiCloudSearchInput?.addEventListener("input", () => {
      updateCloudQueryFromInputs();
      scheduleCloudSync(260);
    });

    [elements.apiCloudVisibilitySelect, elements.apiCloudSortSelect, elements.apiCloudSortDirSelect].forEach((input) => {
      input?.addEventListener("change", async () => {
        updateCloudQueryFromInputs();
        await syncCloudPalettes();
      });
    });

    if (elements.apiCloudResetFiltersButton) {
      elements.apiCloudResetFiltersButton.addEventListener("click", async () => {
        resetCloudQuery();
        await syncCloudPalettes();
      });
    }

    elements.apiBaseUrlInput?.addEventListener("input", () => {
      elements.apiBaseUrlInput.classList.remove("is-invalid");
    });

    [elements.apiEmailInput, elements.apiPasswordInput, elements.apiNameInput].forEach((input) => {
      input?.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          await loginApiUser();
        }
      });
    });
  }

  async function bootstrapApiSession() {
    if (!state.api.refreshToken && !state.api.accessToken) {
      return;
    }

    try {
      await fetchApiProfile();
      await syncCloudPalettes();
    } catch (error) {
      const refreshed = await tryRefreshApiSession();
      if (refreshed) {
        await syncCloudPalettes();
      } else {
        clearApiSession();
        renderCloudPalettes();
        renderCloudAnalytics();
      }
    }
  }

  async function registerApiUser() {
    const credentials = getApiCredentials({ requireName: true });
    if (!credentials) {
      return;
    }

    try {
      const authPayload = await apiRequest(
        "/api/v1/auth/register",
        {
          method: "POST",
          body: credentials,
        },
        { auth: false }
      );
      applyAuthPayload(authPayload);
      updateApiSessionStatus();
      updateApiControls();
      showToast("Conta criada e sessão iniciada.");
      await syncCloudPalettes();
    } catch (error) {
      showToast(getApiErrorMessage(error, "Falha ao cadastrar na API."));
    }
  }

  async function loginApiUser() {
    const credentials = getApiCredentials({ requireName: false });
    if (!credentials) {
      return;
    }

    try {
      const authPayload = await apiRequest(
        "/api/v1/auth/login",
        {
          method: "POST",
          body: {
            email: credentials.email,
            password: credentials.password,
          },
        },
        { auth: false }
      );
      applyAuthPayload(authPayload);
      updateApiSessionStatus();
      updateApiControls();
      showToast("Login concluído.");
      await syncCloudPalettes();
    } catch (error) {
      showToast(getApiErrorMessage(error, "Falha ao autenticar na API."));
    }
  }

  async function logoutApiUser() {
    try {
      if (state.api.refreshToken) {
        await apiRequest(
          "/api/v1/auth/logout",
          {
            method: "POST",
            body: {
              refreshToken: state.api.refreshToken,
            },
          },
          { auth: false }
        );
      }
    } catch (error) {
      // Logout local deve prosseguir mesmo com falha remota.
    } finally {
      clearApiSession();
      updateApiSessionStatus();
      updateApiControls();
      renderCloudPalettes();
      renderCloudAnalytics();
      showToast("Sessão encerrada.");
    }
  }

  async function fetchApiProfile() {
    const profile = await apiRequest(
      "/api/v1/auth/me",
      {
        method: "GET",
      },
      { auth: true }
    );
    state.api.user = profile;
    persistApiSession();
    updateApiSessionStatus();
    updateApiControls();
    return profile;
  }

  async function publishCurrentPaletteToCloud() {
    if (!isApiAuthenticated()) {
      showToast("Faça login para publicar na nuvem.");
      return;
    }

    try {
      const created = await apiRequest(
        "/api/v1/palettes",
        {
          method: "POST",
          headers: {
            "idempotency-key": createIdempotencyKey("palette-create"),
          },
          body: {
            name: sanitizePaletteName(elements.paletteNameInput?.value || state.paletteName) || "Paleta sem nome",
            description: "Publicada pelo editor Paleta ARIA.",
            tags: ["paleta-aria", "web"],
            tokens: getPaletteSnapshot(state.palette),
          },
        },
        { auth: true }
      );

      if (elements.apiPublishPublicCheckbox?.checked) {
        const shared = await apiRequest(
          `/api/v1/palettes/${created.id}/share`,
          {
            method: "POST",
          },
          { auth: true }
        );
        if (shared?.shareId) {
          const shareUrl = `${state.api.baseUrl}/api/v1/palettes/public/${shared.shareId}`;
          copyText(shareUrl, "Link público da paleta copiado.");
        }
      }

      showToast("Paleta publicada na nuvem.");
      await syncCloudPalettes();
    } catch (error) {
      showToast(getApiErrorMessage(error, "Falha ao publicar paleta na nuvem."));
    }
  }

  function scheduleCloudSync(delayMs = 220) {
    if (cloudSyncTimer) {
      window.clearTimeout(cloudSyncTimer);
      cloudSyncTimer = null;
    }

    cloudSyncTimer = window.setTimeout(async () => {
      cloudSyncTimer = null;
      await syncCloudPalettes({ silent: true });
    }, Math.max(0, Number(delayMs) || 0));
  }

  async function syncCloudPalettes(options = {}) {
    if (!elements.apiCloudPalettesList || !elements.apiCloudSummary) {
      return;
    }
    const silent = Boolean(options.silent);
    const requestVersion = ++cloudSyncVersion;

    if (!isApiAuthenticated()) {
      state.api.cloudPalettes = [];
      state.api.cloudTotal = 0;
      state.api.cloudHasMore = false;
      state.api.cloudAnalytics = null;
      renderCloudPalettes();
      renderCloudAnalytics();
      updateApiControls();
      return;
    }

    state.api.loadingCloudPalettes = true;
    updateApiControls();
    renderCloudPalettes();

    try {
      const params = new URLSearchParams({
        limit: "30",
        offset: "0",
        visibility: state.api.cloudQuery.visibility,
        sortBy: state.api.cloudQuery.sortBy,
        sortDir: state.api.cloudQuery.sortDir,
      });
      if (state.api.cloudQuery.search) {
        params.set("search", state.api.cloudQuery.search);
      }

      const response = await apiRequest(
        `/api/v1/palettes?${params.toString()}`,
        {
          method: "GET",
        },
        { auth: true }
      );
      if (requestVersion !== cloudSyncVersion) {
        return;
      }
      state.api.cloudPalettes = Array.isArray(response?.items) ? response.items : [];
      state.api.cloudTotal = normalizePositiveInteger(response?.total, state.api.cloudPalettes.length);
      state.api.cloudHasMore = Boolean(response?.hasMore);
      await syncCloudAnalytics({ silent: true });
      renderCloudPalettes();
    } catch (error) {
      if (!silent) {
        showToast(getApiErrorMessage(error, "Falha ao sincronizar paletas da nuvem."));
      }
    } finally {
      if (requestVersion !== cloudSyncVersion) {
        return;
      }
      state.api.loadingCloudPalettes = false;
      updateApiControls();
      renderCloudPalettes();
      renderCloudAnalytics();
    }
  }

  async function syncCloudAnalytics(options = {}) {
    if (!isApiAuthenticated()) {
      state.api.cloudAnalytics = null;
      return;
    }
    const silent = Boolean(options.silent);

    try {
      const response = await apiRequest(
        "/api/v1/palettes/analytics/summary",
        {
          method: "GET",
        },
        { auth: true }
      );
      state.api.cloudAnalytics = response || null;
    } catch (error) {
      state.api.cloudAnalytics = null;
      if (!silent) {
        showToast(getApiErrorMessage(error, "Falha ao atualizar analytics da nuvem."));
      }
    }
  }

  function renderCloudPalettes() {
    if (!elements.apiCloudPalettesList || !elements.apiCloudSummary) {
      return;
    }

    elements.apiCloudPalettesList.innerHTML = "";

    if (!isApiAuthenticated()) {
      elements.apiCloudSummary.textContent = "Faça login para visualizar paletas da nuvem.";
      const empty = document.createElement("p");
      empty.className = "cloud-empty";
      empty.textContent = "Conecte no backend para sincronizar suas paletas.";
      elements.apiCloudPalettesList.appendChild(empty);
      return;
    }

    if (state.api.loadingCloudPalettes) {
      elements.apiCloudSummary.textContent = "Sincronizando paletas em nuvem...";
      const loading = document.createElement("p");
      loading.className = "cloud-empty";
      loading.textContent = "Buscando dados da API.";
      elements.apiCloudPalettesList.appendChild(loading);
      return;
    }

    if (state.api.cloudPalettes.length === 0) {
      elements.apiCloudSummary.textContent = hasActiveCloudFilters()
        ? "Nenhuma paleta encontrada para os filtros atuais."
        : "Nenhuma paleta registrada na nuvem.";
      const empty = document.createElement("p");
      empty.className = "cloud-empty";
      empty.textContent = hasActiveCloudFilters()
        ? "Ajuste os filtros para ampliar os resultados."
        : "Publique a paleta atual para começar a sincronização.";
      elements.apiCloudPalettesList.appendChild(empty);
      return;
    }

    const visibleCount = state.api.cloudPalettes.length;
    const totalCount = Math.max(state.api.cloudTotal, visibleCount);
    const suffix = state.api.cloudHasMore ? " Exibindo a primeira página de resultados." : "";
    elements.apiCloudSummary.textContent = `${visibleCount} de ${totalCount} paleta(s) carregada(s) da API.${suffix}`;
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });

    state.api.cloudPalettes.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "cloud-item";

      const header = document.createElement("header");
      header.className = "cloud-item__head";

      const titleWrap = document.createElement("div");
      const title = document.createElement("h4");
      title.className = "cloud-item__title";
      title.textContent = sanitizePaletteName(entry.name) || "Paleta sem nome";
      const updatedAt = new Date(entry.updatedAt || entry.createdAt || Date.now());
      const meta = document.createElement("p");
      meta.className = "cloud-item__meta";
      meta.textContent = `${entry.isPublic ? "Pública" : "Privada"} • Atualizada em ${
        Number.isNaN(updatedAt.getTime()) ? String(entry.updatedAt || "") : formatter.format(updatedAt)
      }`;
      titleWrap.appendChild(title);
      titleWrap.appendChild(meta);

      const chips = document.createElement("div");
      chips.className = "cloud-item__chips";
      ["primary", "secondary", "accent", "background"].forEach((tokenKey) => {
        const chip = document.createElement("span");
        chip.style.background = entry.tokens?.[tokenKey] || DEFAULT_PALETTE[tokenKey];
        chip.title = `${tokenKey}: ${entry.tokens?.[tokenKey] || "-"}`;
        chips.appendChild(chip);
      });

      header.appendChild(titleWrap);
      header.appendChild(chips);

      const actions = document.createElement("div");
      actions.className = "cloud-item__actions";

      const applyButton = document.createElement("button");
      applyButton.type = "button";
      applyButton.className = "button button--ghost";
      applyButton.textContent = "Aplicar";
      applyButton.addEventListener("click", () => {
        applyCloudPalette(entry);
      });

      const saveLocalButton = document.createElement("button");
      saveLocalButton.type = "button";
      saveLocalButton.className = "button button--ghost";
      saveLocalButton.textContent = "Salvar local";
      saveLocalButton.addEventListener("click", () => {
        saveCloudPaletteToLocal(entry);
      });

      actions.appendChild(applyButton);
      actions.appendChild(saveLocalButton);

      const visibilityButton = document.createElement("button");
      visibilityButton.type = "button";
      visibilityButton.className = "button button--ghost";
      visibilityButton.textContent = entry.isPublic ? "Tornar privada" : "Tornar pública";
      visibilityButton.addEventListener("click", async () => {
        await toggleCloudPaletteVisibility(entry);
      });
      actions.appendChild(visibilityButton);

      if (entry.isPublic && entry.shareId) {
        const copyPublicLinkButton = document.createElement("button");
        copyPublicLinkButton.type = "button";
        copyPublicLinkButton.className = "button button--ghost";
        copyPublicLinkButton.textContent = "Copiar link";
        copyPublicLinkButton.addEventListener("click", () => {
          const publicUrl = `${state.api.baseUrl}/api/v1/palettes/public/${entry.shareId}`;
          copyText(publicUrl, "Link público copiado.");
        });
        actions.appendChild(copyPublicLinkButton);
      }

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "button button--ghost is-destructive";
      removeButton.textContent = "Excluir";
      removeButton.addEventListener("click", async () => {
        await deleteCloudPalette(entry);
      });
      actions.appendChild(removeButton);

      card.appendChild(header);
      card.appendChild(actions);
      elements.apiCloudPalettesList.appendChild(card);
    });
  }

  function renderCloudAnalytics() {
    if (!elements.apiCloudQualitySummary || !elements.apiCloudQualityDistribution || !elements.apiCloudRiskList) {
      return;
    }

    elements.apiCloudQualityDistribution.innerHTML = "";
    elements.apiCloudRiskList.innerHTML = "";

    if (!isApiAuthenticated()) {
      elements.apiCloudQualitySummary.textContent = "Faça login para visualizar métricas de qualidade da biblioteca.";
      return;
    }

    const quality = state.api.cloudAnalytics?.quality;
    if (!quality) {
      elements.apiCloudQualitySummary.textContent = "Analytics indisponível no momento para esta sessão.";
      return;
    }

    elements.apiCloudQualitySummary.textContent = `Score médio de auditoria: ${Number(
      quality.averageAuditScore || 0
    ).toFixed(2)} / 100`;

    const orderedGrades = ["EXCELENTE", "CONSISTENTE", "ATENCAO", "CRITICO"];
    orderedGrades.forEach((grade) => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = grade;
      const value = document.createElement("strong");
      value.textContent = String(normalizePositiveInteger(quality.gradeDistribution?.[grade], 0));
      item.appendChild(label);
      item.appendChild(value);
      elements.apiCloudQualityDistribution.appendChild(item);
    });

    const risks = Array.isArray(quality.topFailingChecks) ? quality.topFailingChecks : [];
    if (risks.length === 0) {
      const safeItem = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = "Sem falhas recorrentes na auditoria";
      const value = document.createElement("strong");
      value.textContent = "OK";
      safeItem.appendChild(label);
      safeItem.appendChild(value);
      elements.apiCloudRiskList.appendChild(safeItem);
      return;
    }

    risks.forEach((risk) => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = sanitizeTextValue(risk.label, 140) || "Checkpoint";
      const value = document.createElement("strong");
      value.textContent = `${normalizePositiveInteger(risk.count, 0)} ocorrencia(s)`;
      item.appendChild(label);
      item.appendChild(value);
      elements.apiCloudRiskList.appendChild(item);
    });
  }

  async function toggleCloudPaletteVisibility(entry) {
    if (!entry?.id || !isApiAuthenticated()) {
      return;
    }

    try {
      if (entry.isPublic) {
        await apiRequest(
          `/api/v1/palettes/${entry.id}/unshare`,
          {
            method: "POST",
          },
          { auth: true }
        );
        showToast("Paleta definida como privada.");
      } else {
        const shared = await apiRequest(
          `/api/v1/palettes/${entry.id}/share`,
          {
            method: "POST",
          },
          { auth: true }
        );
        if (shared?.shareId) {
          const shareUrl = `${state.api.baseUrl}/api/v1/palettes/public/${shared.shareId}`;
          copyText(shareUrl, "Link público da paleta copiado.");
        } else {
          showToast("Paleta publicada como pública.");
        }
      }

      await syncCloudPalettes({ silent: true });
    } catch (error) {
      showToast(getApiErrorMessage(error, "Falha ao atualizar visibilidade da paleta."));
    }
  }

  async function deleteCloudPalette(entry) {
    if (!entry?.id || !isApiAuthenticated()) {
      return;
    }
    const paletteName = sanitizePaletteName(entry.name) || "paleta sem nome";
    const shouldDelete = window.confirm(`Excluir "${paletteName}" da nuvem? Esta ação não pode ser desfeita.`);
    if (!shouldDelete) {
      return;
    }

    try {
      await apiRequest(
        `/api/v1/palettes/${entry.id}`,
        {
          method: "DELETE",
        },
        { auth: true }
      );
      showToast("Paleta removida da nuvem.");
      await syncCloudPalettes({ silent: true });
    } catch (error) {
      showToast(getApiErrorMessage(error, "Falha ao remover paleta da nuvem."));
    }
  }

  function applyCloudPalette(entry) {
    if (!entry || !entry.tokens) {
      showToast("Paleta em nuvem inválida.");
      return;
    }

    const sanitizedName = sanitizePaletteName(entry.name) || "Paleta em nuvem";
    state.activePreset = "";
    state.contrastLinkedToPalette = true;
    state.selectedSavedPaletteId = null;
    state.paletteName = sanitizedName;
    setActivePresetChip("");
    syncPaletteNameInput();
    applyPalette(sanitizePalette(entry.tokens, state.palette));
    renderSavedPalettes();
    updateSavedPaletteControls();
    showToast(`Paleta "${sanitizedName}" aplicada da nuvem.`);
  }

  function saveCloudPaletteToLocal(entry) {
    if (!entry || !entry.tokens) {
      return;
    }
    const now = new Date().toISOString();
    const localEntry = {
      id: createLocalId(),
      name: sanitizePaletteName(entry.name) || `Paleta ${state.savedPalettes.length + 1}`,
      palette: sanitizePalette(entry.tokens, DEFAULT_PALETTE),
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
    };

    state.savedPalettes = [localEntry, ...state.savedPalettes].slice(0, 30);
    state.selectedSavedPaletteId = localEntry.id;
    state.paletteName = localEntry.name;
    persistSavedPalettes();
    syncPaletteNameInput();
    renderSavedPalettes();
    updateSavedPaletteControls();
    showToast("Paleta da nuvem salva na biblioteca local.");
  }

  function getApiCredentials(options = {}) {
    const requireName = Boolean(options.requireName);
    const email = String(elements.apiEmailInput?.value || "")
      .trim()
      .toLowerCase();
    const password = String(elements.apiPasswordInput?.value || "");
    const name = sanitizePaletteName(elements.apiNameInput?.value || "");

    let hasError = false;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      elements.apiEmailInput?.classList.add("is-invalid");
      hasError = true;
    } else {
      elements.apiEmailInput?.classList.remove("is-invalid");
    }

    if (!password || password.length < 8) {
      elements.apiPasswordInput?.classList.add("is-invalid");
      hasError = true;
    } else {
      elements.apiPasswordInput?.classList.remove("is-invalid");
    }

    if (requireName) {
      if (!name || name.length < 2) {
        elements.apiNameInput?.classList.add("is-invalid");
        hasError = true;
      } else {
        elements.apiNameInput?.classList.remove("is-invalid");
      }
    }

    if (hasError) {
      showToast("Revise nome, e-mail e senha para continuar.");
      return null;
    }

    return {
      name,
      email,
      password,
    };
  }

  async function apiRequest(path, options = {}, settings = {}) {
    const baseUrl = normalizeApiBaseUrl(state.api.baseUrl);
    if (!baseUrl) {
      throw new Error("Configure uma URL válida da API.");
    }

    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    if (settings.auth && state.api.accessToken) {
      headers.set("authorization", `Bearer ${state.api.accessToken}`);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401 && settings.auth && !settings.retry && state.api.refreshToken) {
      const refreshed = await tryRefreshApiSession();
      if (refreshed) {
        return apiRequest(path, options, { ...settings, retry: true });
      }
    }

    if (response.status === 204) {
      return null;
    }

    const payload = await readResponsePayload(response);
    if (!response.ok) {
      throw buildApiError(payload, response.status);
    }

    return payload?.data ?? null;
  }

  async function tryRefreshApiSession() {
    if (!state.api.refreshToken) {
      return false;
    }

    try {
      const payload = await apiRequest(
        "/api/v1/auth/refresh",
        {
          method: "POST",
          body: {
            refreshToken: state.api.refreshToken,
          },
        },
        { auth: false, retry: true }
      );
      applyAuthPayload(payload);
      updateApiSessionStatus();
      updateApiControls();
      return true;
    } catch (error) {
      clearApiSession();
      updateApiSessionStatus();
      updateApiControls();
      renderCloudPalettes();
      renderCloudAnalytics();
      return false;
    }
  }

  async function readResponsePayload(response) {
    const contentType = String(response.headers.get("content-type") || "");
    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch (error) {
        return null;
      }
    }

    try {
      const text = await response.text();
      return text ? { raw: text } : null;
    } catch (error) {
      return null;
    }
  }

  function buildApiError(payload, status) {
    const error = new Error(payload?.error?.message || "Falha na comunicação com a API.");
    error.status = status;
    error.code = payload?.error?.code || "API_ERROR";
    return error;
  }

  function getApiErrorMessage(error, fallbackMessage) {
    if (error && typeof error.message === "string" && error.message.trim().length > 0) {
      return error.message.trim();
    }
    return fallbackMessage;
  }

  function applyAuthPayload(payload) {
    state.api.user = payload?.user || null;
    state.api.accessToken = String(payload?.tokens?.accessToken || "");
    state.api.refreshToken = String(payload?.tokens?.refreshToken || "");
    persistApiSession();
    updateApiSessionStatus();
    updateApiControls();
  }

  function clearApiSession() {
    if (cloudSyncTimer) {
      window.clearTimeout(cloudSyncTimer);
      cloudSyncTimer = null;
    }
    cloudSyncVersion += 1;
    state.api.user = null;
    state.api.accessToken = "";
    state.api.refreshToken = "";
    state.api.cloudPalettes = [];
    state.api.cloudTotal = 0;
    state.api.cloudHasMore = false;
    state.api.cloudAnalytics = null;
    state.api.loadingCloudPalettes = false;
    persistApiSession();
  }

  function hydrateApiStateFromStorage() {
    const configRaw = safeStorageGet(STORAGE_KEYS.apiConfig);
    if (configRaw) {
      try {
        const parsedConfig = JSON.parse(configRaw);
        const normalizedUrl = normalizeApiBaseUrl(parsedConfig?.baseUrl);
        if (normalizedUrl) {
          state.api.baseUrl = normalizedUrl;
        }
      } catch (error) {
        // Ignora config inválida.
      }
    }

    const sessionRaw = safeStorageGet(STORAGE_KEYS.apiSession);
    if (sessionRaw) {
      try {
        const parsedSession = JSON.parse(sessionRaw);
        state.api.accessToken = String(parsedSession?.accessToken || "");
        state.api.refreshToken = String(parsedSession?.refreshToken || "");
        state.api.user = parsedSession?.user && typeof parsedSession.user === "object" ? parsedSession.user : null;
      } catch (error) {
        clearApiSession();
      }
    }
  }

  function persistApiConfig() {
    safeStorageSet(
      STORAGE_KEYS.apiConfig,
      JSON.stringify({
        baseUrl: state.api.baseUrl,
      })
    );
  }

  function persistApiSession() {
    safeStorageSet(
      STORAGE_KEYS.apiSession,
      JSON.stringify({
        accessToken: state.api.accessToken,
        refreshToken: state.api.refreshToken,
        user: state.api.user,
      })
    );
  }

  function hydrateApiCloudQueryFromStorage() {
    const queryRaw = safeStorageGet(STORAGE_KEYS.apiCloudQuery);
    if (!queryRaw) {
      return;
    }

    try {
      const parsed = JSON.parse(queryRaw);
      const search = sanitizeTextValue(parsed?.search, 120);
      const visibility = normalizeCloudVisibility(parsed?.visibility);
      const sortBy = normalizeCloudSortBy(parsed?.sortBy);
      const sortDir = normalizeCloudSortDir(parsed?.sortDir);

      state.api.cloudQuery = {
        search,
        visibility,
        sortBy,
        sortDir,
      };
    } catch (error) {
      // Ignora estado inválido.
    }
  }

  function persistApiCloudQuery() {
    safeStorageSet(STORAGE_KEYS.apiCloudQuery, JSON.stringify(state.api.cloudQuery));
  }

  function syncApiInputs() {
    if (!elements.apiBaseUrlInput) {
      return;
    }
    elements.apiBaseUrlInput.value = state.api.baseUrl;
  }

  function syncApiCloudFilterInputs() {
    if (elements.apiCloudSearchInput) {
      elements.apiCloudSearchInput.value = state.api.cloudQuery.search;
    }
    if (elements.apiCloudVisibilitySelect) {
      elements.apiCloudVisibilitySelect.value = state.api.cloudQuery.visibility;
    }
    if (elements.apiCloudSortSelect) {
      elements.apiCloudSortSelect.value = state.api.cloudQuery.sortBy;
    }
    if (elements.apiCloudSortDirSelect) {
      elements.apiCloudSortDirSelect.value = state.api.cloudQuery.sortDir;
    }
  }

  function updateCloudQueryFromInputs() {
    state.api.cloudQuery.search = sanitizeTextValue(elements.apiCloudSearchInput?.value || "", 120);
    state.api.cloudQuery.visibility = normalizeCloudVisibility(elements.apiCloudVisibilitySelect?.value);
    state.api.cloudQuery.sortBy = normalizeCloudSortBy(elements.apiCloudSortSelect?.value);
    state.api.cloudQuery.sortDir = normalizeCloudSortDir(elements.apiCloudSortDirSelect?.value);
    persistApiCloudQuery();
  }

  function resetCloudQuery() {
    state.api.cloudQuery = {
      search: "",
      visibility: "all",
      sortBy: "updatedAt",
      sortDir: "desc",
    };
    persistApiCloudQuery();
    syncApiCloudFilterInputs();
  }

  function updateApiSessionStatus() {
    if (!elements.apiSessionStatus) {
      return;
    }

    const isConnected = Boolean(state.api.user && state.api.accessToken);
    elements.apiSessionStatus.classList.toggle("is-connected", isConnected);
    if (isConnected) {
      const name = sanitizePaletteName(state.api.user?.name || "");
      const email = String(state.api.user?.email || "").trim();
      const role = String(state.api.user?.role || "user").toUpperCase();
      elements.apiSessionStatus.textContent = `Conectado como ${name || email} (${role})`;
      return;
    }
    elements.apiSessionStatus.textContent = "Sessão desconectada.";
  }

  function updateApiControls() {
    const isConnected = isApiAuthenticated();
    const isLoading = state.api.loadingCloudPalettes;
    const lockCloudFilters = !isConnected || isLoading;

    if (elements.apiPublishPaletteButton) {
      elements.apiPublishPaletteButton.disabled = !isConnected || isLoading;
      elements.apiPublishPaletteButton.setAttribute("aria-disabled", String(elements.apiPublishPaletteButton.disabled));
    }
    if (elements.apiSyncPalettesButton) {
      elements.apiSyncPalettesButton.disabled = !isConnected || isLoading;
      elements.apiSyncPalettesButton.setAttribute("aria-disabled", String(elements.apiSyncPalettesButton.disabled));
    }
    if (elements.apiLogoutButton) {
      elements.apiLogoutButton.disabled = !isConnected;
      elements.apiLogoutButton.setAttribute("aria-disabled", String(elements.apiLogoutButton.disabled));
    }
    if (elements.apiCloudSearchInput) {
      elements.apiCloudSearchInput.disabled = lockCloudFilters;
    }
    if (elements.apiCloudVisibilitySelect) {
      elements.apiCloudVisibilitySelect.disabled = lockCloudFilters;
    }
    if (elements.apiCloudSortSelect) {
      elements.apiCloudSortSelect.disabled = lockCloudFilters;
    }
    if (elements.apiCloudSortDirSelect) {
      elements.apiCloudSortDirSelect.disabled = lockCloudFilters;
    }
    if (elements.apiCloudResetFiltersButton) {
      elements.apiCloudResetFiltersButton.disabled = lockCloudFilters;
    }
  }

  function isApiAuthenticated() {
    return Boolean(state.api.user && state.api.accessToken);
  }

  function normalizeApiBaseUrl(value) {
    const fallback = getDefaultApiBaseUrl();
    const candidate = String(value || "").trim() || fallback;

    try {
      const url = new URL(candidate);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
      }
      return url.toString().replace(/\/+$/, "");
    } catch (error) {
      return null;
    }
  }

  function getDefaultApiBaseUrl() {
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return `${window.location.protocol}//${hostname}:3333`;
      }
      return window.location.origin;
    }
    return "http://localhost:3333";
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

  function setupRevealAnimations() {
    const revealTargets = [...elements.revealPanels, ...elements.journeySteps].filter((target) => target instanceof HTMLElement);
    if (revealTargets.length === 0) {
      return;
    }

    revealTargets.forEach((target) => {
      target.classList.add("is-reveal");
    });

    if (typeof IntersectionObserver !== "function") {
      revealTargets.forEach((target) => {
        target.classList.add("is-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.18,
      }
    );

    revealTargets.forEach((target) => observer.observe(target));
  }

  function configureInputAccessibility() {
    const tokenLabelMap = new Map(TOKEN_META.map((tokenMeta) => [tokenMeta.key, tokenMeta.name]));

    elements.hexInputs.forEach((input) => {
      const token = input.dataset.tokenText;
      if (!token) {
        return;
      }
      const tokenName = tokenLabelMap.get(token) || token;
      input.setAttribute("aria-label", `Valor hexadecimal do token ${tokenName}`);
      input.setAttribute("autocomplete", "off");
      input.setAttribute("spellcheck", "false");
      input.setAttribute("pattern", "^#?[0-9A-Fa-f]{3,6}$");
    });

    elements.contrastForegroundText?.setAttribute("aria-label", "Valor hexadecimal da cor de texto no checker");
    elements.contrastForegroundText?.setAttribute("pattern", "^#?[0-9A-Fa-f]{3,6}$");
    elements.contrastBackgroundText?.setAttribute("aria-label", "Valor hexadecimal da cor de fundo no checker");
    elements.contrastBackgroundText?.setAttribute("pattern", "^#?[0-9A-Fa-f]{3,6}$");
    elements.autoFixContrastButton?.setAttribute(
      "aria-label",
      "Corrigir automaticamente contraste da cor de texto para atingir nivel AA"
    );
    elements.visionModeSelect?.setAttribute("aria-label", "Selecionar simulacao de deficiencia de visao");
  }

  function updateExperienceInsights() {
    const liveContrastRatio = contrastRatio(state.contrast.foreground, state.contrast.background);
    const tokenContrastRatio = contrastRatio(state.palette.text, state.palette.background);
    const localCount = state.savedPalettes.length;
    const favoritesCount = state.savedPalettes.filter((entry) => entry.isFavorite).length;
    const cloudCount = Math.max(state.api.cloudTotal, state.api.cloudPalettes.length);
    const authenticated = isApiAuthenticated();
    const auditReport = buildPaletteAuditReport(state.palette);
    const auditScore = auditReport?.audit?.score ?? 0;

    const score = clamp(Math.round(auditScore * 0.72 + (Math.min(liveContrastRatio, 7) / 7) * 20 + Math.min(localCount, 8)), 0, 100);

    let qualityLabel = "Qualidade inicial";
    if (score >= 85) {
      qualityLabel = "Qualidade elevada";
    } else if (score >= 65) {
      qualityLabel = "Qualidade consistente";
    } else if (score >= 45) {
      qualityLabel = "Qualidade em evolução";
    }

    let stageLabel = "Jornada: Exploração inicial";
    if (favoritesCount > 0 && !authenticated) {
      stageLabel = "Jornada: Curadoria local";
    } else if (localCount > 0 && !authenticated) {
      stageLabel = "Jornada: Validação local";
    } else if (authenticated && cloudCount === 0) {
      stageLabel = "Jornada: Publicação em nuvem";
    } else if (authenticated && cloudCount > 0) {
      stageLabel = "Jornada: Operação sincronizada";
    }

    if (elements.uxQualityLabel) {
      elements.uxQualityLabel.textContent = `${qualityLabel} · Score ${score}/100`;
    }
    if (elements.uxContrastScore) {
      elements.uxContrastScore.textContent = `${tokenContrastRatio.toFixed(2)}:1`;
    }
    if (elements.uxLibraryCount) {
      elements.uxLibraryCount.textContent = String(localCount);
    }
    if (elements.uxCloudCount) {
      elements.uxCloudCount.textContent = String(cloudCount);
    }
    if (elements.uxStageLabel) {
      elements.uxStageLabel.textContent = stageLabel;
    }
    if (elements.uxQualityNote) {
      const failingChecks = auditReport?.audit?.failingChecks ?? 0;
      elements.uxQualityNote.textContent =
        failingChecks === 0
          ? "Auditoria local sem pendências críticas. Fluxo pronto para publicar e compartilhar."
          : `Auditoria detectou ${failingChecks} ponto(s) de risco. Priorize contraste entre texto, superfície e fundo.`;
    }
  }

  function renderPaletteAudit() {
    const report = buildPaletteAuditReport(state.palette);
    const audit = report.audit;
    if (!audit) {
      return;
    }

    if (elements.auditScore) {
      elements.auditScore.textContent = `${Math.round(audit.score)}`;
    }
    if (elements.auditGrade) {
      elements.auditGrade.textContent = audit.grade;
      elements.auditGrade.dataset.grade = audit.grade;
    }
    if (elements.auditSummary) {
      elements.auditSummary.textContent =
        audit.failingChecks === 0
          ? "Todos os checkpoints auditados estão dentro do alvo."
          : `${audit.failingChecks} checkpoint(s) requer(em) ajuste para reduzir risco de acessibilidade.`;
    }

    if (!elements.auditList) {
      return;
    }

    elements.auditList.innerHTML = "";
    audit.checks.forEach((item) => {
      const row = document.createElement("li");
      row.className = "audit-item";
      row.dataset.level = item.passed ? "pass" : item.ratio >= item.threshold * 0.9 ? "warn" : "fail";

      const label = document.createElement("p");
      label.className = "audit-item__label";
      label.textContent = item.label;

      const metrics = document.createElement("p");
      metrics.className = "audit-item__metric";
      metrics.textContent = `${item.ratio.toFixed(2)}:1 (alvo ${item.threshold}:1)`;

      row.appendChild(label);
      row.appendChild(metrics);
      elements.auditList.appendChild(row);
    });
  }

  function buildPaletteAuditReport(palette) {
    const checks = AUDIT_CHECKS.map((check) => {
      const ratio = contrastRatio(palette[check.foreground], palette[check.background]);
      const passed = ratio >= check.threshold;
      const score = Math.min(1, ratio / check.threshold) * check.weight;
      return {
        id: check.id,
        label: check.label,
        foregroundToken: check.foreground,
        backgroundToken: check.background,
        foreground: palette[check.foreground],
        background: palette[check.background],
        threshold: check.threshold,
        ratio: Number(ratio.toFixed(2)),
        passed,
        score: Number(score.toFixed(2)),
      };
    });

    const score = Number(checks.reduce((accumulator, item) => accumulator + item.score, 0).toFixed(2));
    const failingChecks = checks.filter((item) => !item.passed).length;

    return {
      palette: {
        name: sanitizePaletteName(state.paletteName) || "Paleta sem nome",
        generatedAt: new Date().toISOString(),
        tokens: getPaletteSnapshot(palette),
      },
      audit: {
        score,
        grade: resolveAuditGrade(score),
        checks,
        totalChecks: checks.length,
        failingChecks,
      },
    };
  }

  function resolveAuditGrade(score) {
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
    renderPaletteAudit();
    updateContrast();
    updateBrowserChrome(resolveThemeMode(state.themeMode));

    if (settings.persist) {
      schedulePalettePersist();
    }
    updateHistoryButtons();
    updateExperienceInsights();
  }

  function syncPaletteInputs() {
    TOKEN_META.forEach((tokenMeta) => {
      const value = state.palette[tokenMeta.key];
      const colorInput = colorInputByToken.get(tokenMeta.key);
      const textInput = hexInputByToken.get(tokenMeta.key);
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

  function applyVisionMode(mode, persist) {
    const normalizedMode = VISION_MODES.includes(mode) ? mode : "none";
    state.visionMode = normalizedMode;

    const filter = resolveVisionFilter(normalizedMode);
    elements.root.style.setProperty("--vision-filter", filter);

    if (elements.visionModeSelect) {
      elements.visionModeSelect.value = normalizedMode;
    }
    if (elements.visionModeStatus) {
      elements.visionModeStatus.textContent =
        normalizedMode === "none" ? "Simulacao desativada." : `Simulacao ativa: ${getVisionModeLabel(normalizedMode)}.`;
    }

    if (persist) {
      safeStorageSet(STORAGE_KEYS.visionMode, normalizedMode);
    }
  }

  function resolveVisionFilter(mode) {
    switch (mode) {
      case "protanopia":
        return "url(#vision-protanopia)";
      case "deuteranopia":
        return "url(#vision-deuteranopia)";
      case "tritanopia":
        return "url(#vision-tritanopia)";
      case "achromatopsia":
        return "url(#vision-achromatopsia)";
      default:
        return "none";
    }
  }

  function getVisionModeLabel(mode) {
    switch (mode) {
      case "protanopia":
        return "Protanopia";
      case "deuteranopia":
        return "Deuteranopia";
      case "tritanopia":
        return "Tritanopia";
      case "achromatopsia":
        return "Acromatopsia";
      default:
        return "Padrao";
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

    updateExperienceInsights();
  }

  function autoFixPaletteContrast() {
    const targetRatio = 4.5;
    const background = state.palette.background;
    const current = state.palette.text;
    const currentRatio = contrastRatio(current, background);

    if (currentRatio >= targetRatio) {
      showToast("Contraste da cor de texto ja atende ao nivel AA.");
      return;
    }

    const improvedText = findClosestAccessibleTextColor(current, background, targetRatio);
    if (!improvedText) {
      showToast("Nao foi possivel corrigir automaticamente mantendo coerencia de cor.");
      return;
    }

    const updatedPalette = {
      ...state.palette,
      text: improvedText,
      muted: normalizeHex(shiftLightness(improvedText, 22), state.palette.muted),
    };

    state.contrastLinkedToPalette = true;
    applyPalette(updatedPalette);
    showToast(`Contraste corrigido automaticamente para ${contrastRatio(improvedText, background).toFixed(2)}:1.`);
  }

  function findClosestAccessibleTextColor(baseColor, backgroundColor, targetRatio) {
    const hsl = rgbToHsl(hexToRgb(baseColor));
    const candidates = [];

    for (let lightness = 0; lightness <= 100; lightness += 1) {
      const candidate = hslToHex(hsl.h, hsl.s, lightness);
      const ratio = contrastRatio(candidate, backgroundColor);
      if (ratio >= targetRatio) {
        candidates.push({
          value: candidate,
          distance: Math.abs(lightness - hsl.l),
          ratio,
        });
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((left, right) => {
      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }
      return right.ratio - left.ratio;
    });

    return candidates[0].value;
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

  function hydrateVisionModeFromStorage() {
    const storedVisionMode = safeStorageGet(STORAGE_KEYS.visionMode);
    if (storedVisionMode && VISION_MODES.includes(storedVisionMode)) {
      state.visionMode = storedVisionMode;
    } else {
      state.visionMode = "none";
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
      if (payload && VISION_MODES.includes(payload.visionMode)) {
        state.visionMode = payload.visionMode;
      }
    } catch (error) {
      showToast("Não foi possível carregar a paleta compartilhada.");
    }
  }

  function buildShareUrl() {
    const payload = {
      palette: state.palette,
      themeMode: state.themeMode,
      visionMode: state.visionMode,
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

  function hydrateSavedPaletteFilter() {
    const raw = safeStorageGet(STORAGE_KEYS.savedPaletteFilter);
    const normalized = raw === "favorites" ? "favorites" : "all";
    state.savedPaletteFilter = normalized;
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
      isFavorite: entry.isFavorite === true,
    };
  }

  function createLocalId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `palette-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  function createIdempotencyKey(scope) {
    const normalizedScope = sanitizeTextValue(scope || "generic", 40).replace(/\s+/g, "-").toLowerCase() || "generic";
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `web-${normalizedScope}-${window.crypto.randomUUID()}`;
    }
    return `web-${normalizedScope}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  function sanitizeTextValue(value, maxLength) {
    if (typeof value !== "string") {
      return "";
    }
    return value
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, Math.max(0, Number(maxLength) || 0));
  }

  function normalizeCloudVisibility(value) {
    const normalized = String(value || "all").trim().toLowerCase();
    return ["all", "public", "private"].includes(normalized) ? normalized : "all";
  }

  function normalizeCloudSortBy(value) {
    const normalized = String(value || "updatedAt").trim();
    return ["updatedAt", "createdAt", "name"].includes(normalized) ? normalized : "updatedAt";
  }

  function normalizeCloudSortDir(value) {
    const normalized = String(value || "desc").trim().toLowerCase();
    return normalized === "asc" ? "asc" : "desc";
  }

  function hasActiveCloudFilters() {
    return state.api.cloudQuery.search.length > 0 || state.api.cloudQuery.visibility !== "all";
  }

  function normalizePositiveInteger(value, fallback) {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return fallback;
    }
    return parsed;
  }

  function persistSavedPalettes() {
    safeStorageSet(STORAGE_KEYS.savedPalettes, JSON.stringify(state.savedPalettes));
  }

  function persistSavedPaletteFilter() {
    safeStorageSet(STORAGE_KEYS.savedPaletteFilter, state.savedPaletteFilter);
  }

  function setSavedPaletteFilter(filter) {
    const normalized = filter === "favorites" ? "favorites" : "all";
    state.savedPaletteFilter = normalized;
    persistSavedPaletteFilter();
    renderSavedPalettes();
    updateSavedPaletteControls();
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
      isFavorite: false,
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

  function toggleSavedPaletteFavorite(id) {
    const target = state.savedPalettes.find((entry) => entry.id === id);
    if (!target) {
      return;
    }

    target.isFavorite = !target.isFavorite;
    target.updatedAt = new Date().toISOString();
    persistSavedPalettes();
    renderSavedPalettes();
    updateSavedPaletteControls();
    showToast(target.isFavorite ? "Paleta adicionada aos favoritos." : "Paleta removida dos favoritos.");
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

    if (elements.savedFilterFavoritesButton) {
      const hasFavorites = state.savedPalettes.some((entry) => entry.isFavorite);
      elements.savedFilterFavoritesButton.disabled = !hasFavorites;
      elements.savedFilterFavoritesButton.setAttribute("aria-disabled", String(!hasFavorites));
      if (!hasFavorites && state.savedPaletteFilter === "favorites") {
        setSavedPaletteFilter("all");
      }
    }
  }

  function renderSavedPalettes() {
    if (!elements.savedPalettesList || !elements.savedSummary) {
      return;
    }

    const totalCount = state.savedPalettes.length;
    const favoritesCount = state.savedPalettes.filter((entry) => entry.isFavorite).length;
    const sortedEntries = [...state.savedPalettes].sort((left, right) => {
      const favoriteDelta = Number(Boolean(right.isFavorite)) - Number(Boolean(left.isFavorite));
      if (favoriteDelta !== 0) {
        return favoriteDelta;
      }
      const leftUpdatedAt = Date.parse(left.updatedAt || "");
      const rightUpdatedAt = Date.parse(right.updatedAt || "");
      const safeLeft = Number.isFinite(leftUpdatedAt) ? leftUpdatedAt : 0;
      const safeRight = Number.isFinite(rightUpdatedAt) ? rightUpdatedAt : 0;
      return safeRight - safeLeft;
    });

    const visibleEntries =
      state.savedPaletteFilter === "favorites" ? sortedEntries.filter((entry) => entry.isFavorite) : sortedEntries;

    if (elements.savedFilterAllButton) {
      const active = state.savedPaletteFilter === "all";
      elements.savedFilterAllButton.classList.toggle("is-active", active);
      elements.savedFilterAllButton.setAttribute("aria-pressed", String(active));
    }
    if (elements.savedFilterFavoritesButton) {
      const active = state.savedPaletteFilter === "favorites";
      elements.savedFilterFavoritesButton.classList.toggle("is-active", active);
      elements.savedFilterFavoritesButton.setAttribute("aria-pressed", String(active));
    }
    if (elements.savedFavoritesCount) {
      elements.savedFavoritesCount.textContent = `${favoritesCount} favorita(s)`;
    }

    elements.savedPalettesList.innerHTML = "";
    if (visibleEntries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "saved-empty";
      empty.textContent =
        state.savedPaletteFilter === "favorites"
          ? "Nenhuma paleta favorita ainda. Marque as melhores versões para acesso rápido."
          : "Salve variações da sua paleta para comparar ideias e acelerar decisões de design.";
      elements.savedPalettesList.appendChild(empty);
      elements.savedSummary.textContent =
        state.savedPaletteFilter === "favorites" ? "Filtro ativo: apenas favoritas." : "Nenhuma paleta salva ainda.";
      return;
    }

    const formatter = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });

    elements.savedSummary.textContent =
      state.savedPaletteFilter === "favorites"
        ? `${visibleEntries.length} favorita(s) exibida(s) de ${totalCount} paleta(s).`
        : `${totalCount} paleta(s) armazenada(s) localmente.`;

    visibleEntries.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "saved-card";
      if (entry.id === state.selectedSavedPaletteId) {
        card.classList.add("is-selected");
      }
      if (entry.isFavorite) {
        card.classList.add("is-favorite");
      }

      const header = document.createElement("header");
      header.className = "saved-card__header";

      const titleWrap = document.createElement("div");
      const title = document.createElement("h3");
      title.className = "saved-card__title";
      title.textContent = entry.isFavorite ? `★ ${entry.name}` : entry.name;
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

      const favoriteButton = document.createElement("button");
      favoriteButton.type = "button";
      favoriteButton.className = "button button--ghost";
      favoriteButton.textContent = entry.isFavorite ? "Desfavoritar" : "Favoritar";
      favoriteButton.addEventListener("click", () => {
        toggleSavedPaletteFavorite(entry.id);
      });

      actions.appendChild(applyButton);
      actions.appendChild(favoriteButton);
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

  function schedulePalettePersist() {
    window.clearTimeout(palettePersistTimer);
    palettePersistTimer = window.setTimeout(() => {
      safeStorageSet(STORAGE_KEYS.palette, JSON.stringify(state.palette));
      palettePersistTimer = null;
    }, 120);
  }

  function flushPalettePersist() {
    if (palettePersistTimer !== null) {
      window.clearTimeout(palettePersistTimer);
      palettePersistTimer = null;
      safeStorageSet(STORAGE_KEYS.palette, JSON.stringify(state.palette));
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
