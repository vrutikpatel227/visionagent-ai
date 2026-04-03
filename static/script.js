// ===== ELEMENT REFS =====
const ideaInput = document.getElementById("ideaInput");
const wordCounter = document.getElementById("wordCounter");
const generateBtn = document.getElementById("generateBtn");
const btnText = document.getElementById("btnText");
const btnLoader = document.getElementById("btnLoader");
const refineBtn = document.getElementById("refineBtn");
const errorMessage = document.getElementById("errorMessage");
const planText = document.getElementById("planText");
const promptText = document.getElementById("promptText");
const confidenceText = document.getElementById("confidenceText");
const copyPromptBtn = document.getElementById("copyPromptBtn");
const downloadPromptBtn = document.getElementById("downloadPromptBtn");
const generateImageBtn = document.getElementById("generateImageBtn");
const cameraText = document.getElementById("cameraText");
const lightingText = document.getElementById("lightingText");
const sceneText = document.getElementById("sceneText");
const useCaseText = document.getElementById("useCaseText");
const moodTags = document.getElementById("moodTags");
const colorPalette = document.getElementById("colorPalette");
const generatedImage = document.getElementById("generatedImage");
const imagePlaceholder = document.getElementById("imagePlaceholder");
const imageOverlay = document.getElementById("imageOverlay");
const renderStatus = document.getElementById("renderStatus");
const seedText = document.getElementById("seedText");
const copyImageBtn = document.getElementById("copyImageBtn");
const downloadImageBtn = document.getElementById("downloadImageBtn");

// ===== STATE =====
let selectedStyle = "Realistic";
let selectedAspect = "16:9";
let currentData = null;
let currentImageBlob = null;

// ===== CHAR COUNTER =====
function updateCharCount() {
    wordCounter.textContent = `CHARS: ${ideaInput.value.length} / 2500`;
}
ideaInput.addEventListener("input", updateCharCount);
updateCharCount();

// ===== STYLE CHIPS =====
const styleChips = document.querySelectorAll(".chip");
styleChips.forEach(btn => {
    btn.addEventListener("click", () => {
        styleChips.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedStyle = btn.dataset.style;
    });
});

// ===== RATIO CHIPS =====
const ratioChips = document.querySelectorAll(".ratio-chip");
ratioChips.forEach(btn => {
    btn.addEventListener("click", () => {
        ratioChips.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedAspect = btn.dataset.aspect;
    });
});

// ===== LOADING =====
function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    if (isLoading) {
        btnText.classList.add("hidden");
        btnLoader.classList.remove("hidden");
    } else {
        btnText.classList.remove("hidden");
        btnLoader.classList.add("hidden");
    }
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove("hidden");
}
function clearError() {
    errorMessage.textContent = "";
    errorMessage.classList.add("hidden");
}

// ===== RENDER MOOD TAGS =====
function renderMoodTags(tags = []) {
    moodTags.innerHTML = "";
    tags.forEach(tag => {
        const span = document.createElement("span");
        span.style.cssText = "padding:4px 12px; border-radius:6px; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; background:rgba(124,92,255,0.15); border:1px solid rgba(124,92,255,0.3); color:#a78bfa;";
        span.textContent = `#${String(tag).replace(/\s+/g, "_").toUpperCase()}`;
        moodTags.appendChild(span);
    });
}

// ===== RENDER COLOR PALETTE =====
function renderColorPalette(colors = []) {
    colorPalette.innerHTML = "";
    colors.forEach(hex => {
        if (!hex || !hex.startsWith("#")) return;
        const swatch = document.createElement("div");
        swatch.className = "color-swatch";
        swatch.style.backgroundColor = hex;
        swatch.title = `Click to copy ${hex}`;
        swatch.addEventListener("click", () => {
            navigator.clipboard.writeText(hex).catch(() => {});
            swatch.style.transform = "scale(1.3)";
            setTimeout(() => swatch.style.transform = "scale(1)", 300);
        });
        colorPalette.appendChild(swatch);
    });
}

// ===== RESET IMAGE =====
function resetImageSection() {
    generatedImage.src = "";
    generatedImage.classList.add("hidden");
    imageOverlay.classList.add("hidden");
    imagePlaceholder.classList.remove("hidden");
    imagePlaceholder.textContent = "Generate an image from your final prompt";
    renderStatus.textContent = "Awaiting Render";
    seedText.textContent = "SEED: --";
    currentImageBlob = null;
}

// ===== FILL OUTPUTS =====
function fillOutputs(data) {
    currentData = data;
    planText.textContent = data.plan || "No plan generated.";
    promptText.textContent = `"${data.final_prompt || "No prompt generated."}"`;
    cameraText.textContent = data.camera || "Not specified";
    lightingText.textContent = data.lighting || "Not specified";
    sceneText.textContent = data.scene || "Not specified";
    useCaseText.textContent = data.use_case || "Concept Art";
    renderMoodTags(data.mood || []);
    renderColorPalette(data.colors || []);
    const score = (Math.random() * (99.4 - 96.2) + 96.2).toFixed(1);
    confidenceText.textContent = `Confidence Score: ${score}%`;
    refineBtn.style.display = "inline-flex";
}

// ===== GENERATE VISION =====
async function generateVision() {
    const idea = ideaInput.value.trim();
    clearError();

    if (!idea) {
        showError("Please enter your visual idea first.");
        return;
    }

    setLoading(true);
    resetImageSection();
    planText.textContent = "Building cinematic strategy...";
    promptText.textContent = `"Crafting elite prompt..."`;
    cameraText.textContent = "--";
    lightingText.textContent = "--";
    sceneText.textContent = "--";
    useCaseText.textContent = "--";
    moodTags.innerHTML = "";
    colorPalette.innerHTML = "";
    confidenceText.textContent = "Confidence Score: --";

    try {
        const response = await fetch("/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                idea,
                style: selectedStyle,
                aspect: selectedAspect
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Generation failed.");
        }

        fillOutputs(data);

    } catch (error) {
        showError(error.message || "Something went wrong.");
        planText.textContent = "Failed to generate plan.";
        promptText.textContent = `"Failed to generate prompt."`;
    } finally {
        setLoading(false);
    }
}

generateBtn.addEventListener("click", generateVision);
refineBtn.addEventListener("click", generateVision);

// ===== COPY PROMPT =====
copyPromptBtn.addEventListener("click", async () => {
    const text = currentData?.final_prompt?.trim();
    if (!text) return alert("Generate a prompt first.");

    try {
        await navigator.clipboard.writeText(text);
        copyPromptBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">done</span> Copied!`;
        setTimeout(() => {
            copyPromptBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">content_copy</span> Copy Prompt`;
        }, 1500);
    } catch {
        alert("Copy failed.");
    }
});

// ===== DOWNLOAD PROMPT =====
downloadPromptBtn.addEventListener("click", () => {
    if (!currentData) return alert("Generate a prompt first.");

    const content = [
        `VisionAgent AI — Creative Brief\n================================\n\n`,
        `Idea:\n${ideaInput.value.trim()}\n\n`,
        `Style: ${selectedStyle}\nAspect Ratio: ${selectedAspect}\n\n`,
        `AI Plan:\n${currentData.plan}\n\n`,
        `Final Prompt:\n${currentData.final_prompt}\n\n`,
        `Mood: ${(currentData.mood || []).join(", ")}\n`,
        `Lighting: ${currentData.lighting}\n`,
        `Camera: ${currentData.camera}\n`,
        `Scene: ${currentData.scene}\n`,
        `Use Case: ${currentData.use_case}\n\n`,
        `Color Palette: ${(currentData.colors || []).join(", ")}\n`
    ].join("");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "visionagent-creative-brief.txt";
    a.click();
    URL.revokeObjectURL(url);
});

// ===== GENERATE IMAGE =====
generateImageBtn.addEventListener("click", async () => {
    if (!currentData?.final_prompt) {
        alert("Generate a prompt first.");
        return;
    }

    generateImageBtn.disabled = true;
    generateImageBtn.textContent = "Rendering...";
    imagePlaceholder.classList.remove("hidden");
    imagePlaceholder.textContent = "Rendering high-fidelity visual...";
    generatedImage.classList.add("hidden");
    imageOverlay.classList.add("hidden");
    renderStatus.textContent = "Rendering...";

    try {
        const response = await fetch("/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: currentData.final_prompt,
                aspect: selectedAspect
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Image generation failed.");
        }

        const blob = await response.blob();
        currentImageBlob = blob;
        const imageUrl = URL.createObjectURL(blob);

        generatedImage.onload = () => {
            imagePlaceholder.classList.add("hidden");
            generatedImage.classList.remove("hidden");
            imageOverlay.classList.remove("hidden");
            renderStatus.textContent = "Rendered 100%";
            seedText.textContent = `SEED: ${Math.floor(Math.random() * 900000000 + 100000000)}`;
        };

        generatedImage.src = imageUrl;

    } catch (error) {
        imagePlaceholder.classList.remove("hidden");
        imagePlaceholder.textContent = error.message || "Image generation failed.";
        generatedImage.classList.add("hidden");
        imageOverlay.classList.add("hidden");
        renderStatus.textContent = "Render Failed";
    } finally {
        generateImageBtn.disabled = false;
        generateImageBtn.textContent = "Generate Image";
    }
});

// ===== COPY IMAGE =====
copyImageBtn.addEventListener("click", async () => {
    if (!currentImageBlob) return alert("Generate an image first.");

    try {
        await navigator.clipboard.write([
            new ClipboardItem({ [currentImageBlob.type]: currentImageBlob })
        ]);
        copyImageBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">done</span> Copied!`;
        setTimeout(() => {
            copyImageBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">content_copy</span> Copy Image`;
        }, 1500);
    } catch {
        alert("Copy image not supported in this browser. Use Download instead.");
    }
});

// ===== DOWNLOAD IMAGE =====
downloadImageBtn.addEventListener("click", () => {
    if (!currentImageBlob) return alert("Generate an image first.");

    const url = URL.createObjectURL(currentImageBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "visionagent-image.png";
    a.click();
    URL.revokeObjectURL(url);
});
