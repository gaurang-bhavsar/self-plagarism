// Frontend Script for Antigravity Plagiarism Detector

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const dzPrompt = document.getElementById('dz-prompt');
    const dzFileSelected = document.getElementById('dz-file-selected');
    const selectedFileName = document.getElementById('selected-file-name');
    const selectedFileSize = document.getElementById('selected-file-size');
    const btnRemoveFile = document.getElementById('btn-remove-file');
    
    const thresholdSlider = document.getElementById('threshold-slider');
    const thresholdVal = document.getElementById('threshold-val');
    const btnAnalyze = document.getElementById('btn-analyze');
    
    // State Screens
    const resultsWelcome = document.getElementById('results-welcome');
    const resultsLoading = document.getElementById('results-loading');
    const resultsError = document.getElementById('results-error');
    const resultsDashboard = document.getElementById('results-dashboard');
    const errorMsgText = document.getElementById('error-msg-text');
    const btnErrorRetry = document.getElementById('btn-error-retry');
    
    // Result Metrics
    const scoreRing = document.getElementById('score-ring');
    const scorePctText = document.getElementById('score-pct-text');
    const severityText = document.getElementById('severity-text');
    const severityBadgeContainer = document.getElementById('severity-badge-container');
    const severityDesc = document.getElementById('severity-desc');
    const resFilename = document.getElementById('res-filename');
    const resUnit = document.getElementById('res-unit');
    const resTotalUnits = document.getElementById('res-total-units');
    const resPairsCount = document.getElementById('res-pairs-count');
    const resultsNoticeBox = document.getElementById('results-notice-box');
    const resultsNoticeText = document.getElementById('results-notice-text');
    const duplicatesList = document.getElementById('duplicates-list');

    let selectedFile = null;
    
    // Progress Ring Calculation Constants
    const RING_RADIUS = 50;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ~314.159
    scoreRing.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
    scoreRing.style.strokeDashoffset = RING_CIRCUMFERENCE;

    // Initialize Event Listeners
    init();

    function init() {
        // Threshold Slider
        thresholdSlider.addEventListener('input', (e) => {
            thresholdVal.textContent = `${e.target.value}%`;
        });

        // Dropzone Clicking
        dropzone.addEventListener('click', () => {
            if (!selectedFile) {
                fileInput.click();
            }
        });

        // File Input Change
        fileInput.addEventListener('change', (e) => {
            handleFileSelection(e.target.files[0]);
        });

        // Drag and Drop Handlers
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, unhighlight, false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleFileSelection(files[0]);
            }
        });

        // Remove File Button
        btnRemoveFile.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid triggering dropzone click
            clearFile();
        });

        // Analyze Button
        btnAnalyze.addEventListener('click', runAnalysis);

        // Error Dismiss/Retry Button
        btnErrorRetry.addEventListener('click', () => {
            showScreen(resultsWelcome);
        });
    }

    // Drag-and-drop helper styles
    function highlight(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedFile) {
            dropzone.classList.add('dragover');
        }
    }

    function unhighlight(e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
    }

    // File selection logic
    function handleFileSelection(file) {
        if (!file) return;

        const allowedExtensions = /(\.txt|\.docx|\.pdf)$/i;
        if (!allowedExtensions.exec(file.name)) {
            showError("Invalid File Format. Please upload a .txt, .docx, or .pdf file.");
            clearFile();
            return;
        }

        selectedFile = file;
        selectedFileName.textContent = file.name;
        selectedFileSize.textContent = formatBytes(file.size);
        
        dzPrompt.classList.add('hidden');
        dzFileSelected.classList.remove('hidden');
        btnAnalyze.disabled = false;
    }

    // Clear file selection state
    function clearFile() {
        selectedFile = null;
        fileInput.value = '';
        dzFileSelected.classList.add('hidden');
        dzPrompt.classList.remove('hidden');
        btnAnalyze.disabled = true;
    }

    // Helper: format bytes to readable size
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Screen visibility manager
    function showScreen(targetScreen) {
        [resultsWelcome, resultsLoading, resultsError, resultsDashboard].forEach(screen => {
            screen.classList.add('hidden');
        });
        targetScreen.classList.remove('hidden');
    }

    function showError(message) {
        errorMsgText.textContent = message;
        showScreen(resultsError);
    }

    // Run Plagiarism Detection
    function runAnalysis() {
        if (!selectedFile) return;

        showScreen(resultsLoading);
        
        // Build payload
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('threshold', thresholdSlider.value);
        
        const selectedUnit = document.querySelector('input[name="unit"]:checked').value;
        formData.append('unit', selectedUnit);

        // Fetch call
        fetch('/api/detect', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                // Try parsing JSON error, or fall back to status text
                return response.json()
                    .then(errJson => { throw new Error(errJson.error || 'Server error occurred'); })
                    .catch(err => { throw new Error(err.message || 'Network response was not OK'); });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                renderResults(data);
            } else {
                showError(data.error || "Analysis failed.");
            }
        })
        .catch(error => {
            console.error('Error conducting analysis:', error);
            showError(error.message || "Failed to reach the server. Make sure the backend is running.");
        });
    }

    // Render results on page
    function renderResults(data) {
        // 1. Text Info
        resFilename.textContent = data.filename;
        resUnit.textContent = data.unit.charAt(0).toUpperCase() + data.unit.slice(1);
        resTotalUnits.textContent = data.total_segments;
        resPairsCount.textContent = data.flagged_pairs_count;

        // 2. Score Percentage Circle
        const score = data.overall_score;
        scorePctText.textContent = `${score.toFixed(1)}%`;
        setProgress(score);

        // 3. Severity Badge styles
        severityText.textContent = data.severity;
        severityBadgeContainer.className = 'severity-box'; // reset classes
        
        if (data.severity === 'Low') {
            severityBadgeContainer.classList.add('low');
            severityDesc.textContent = "Minimal repeated content detected. Document is clean.";
        } else if (data.severity === 'Medium') {
            severityBadgeContainer.classList.add('medium');
            severityDesc.textContent = "Moderate levels of duplication found. Review highlighted sections.";
        } else {
            severityBadgeContainer.classList.add('high');
            severityDesc.textContent = "Significant repetition detected. Immediate revision recommended.";
        }

        // 4. Notice Box
        if (data.notice) {
            resultsNoticeText.textContent = data.notice;
            resultsNoticeBox.classList.remove('hidden');
        } else {
            resultsNoticeBox.classList.add('hidden');
        }

        // 5. Duplicate matches list
        duplicatesList.innerHTML = '';
        
        if (data.flagged_pairs.length === 0) {
            const noMatchMsg = document.createElement('div');
            noMatchMsg.className = 'placeholder-card';
            noMatchMsg.style.minHeight = '200px';
            noMatchMsg.style.padding = '40px 20px';
            noMatchMsg.innerHTML = `
                <p style="color: var(--text-secondary); text-align: center;">
                    No content duplication exceeds the current ${data.threshold}% threshold.
                </p>
            `;
            duplicatesList.appendChild(noMatchMsg);
        } else {
            data.flagged_pairs.forEach((pair, idx) => {
                const item = document.createElement('div');
                item.className = 'duplicate-pair-item';
                
                // Color formatting for mini pills
                const scoreVal = pair.combined_score;
                let pillClass = 'low';
                if (scoreVal >= 80) pillClass = 'high';
                else if (scoreVal >= 40) pillClass = 'medium';

                item.innerHTML = `
                    <div class="pair-header">
                        <div class="pair-title">
                            <span>Pair #${idx + 1}</span>
                            <span class="divider-dot"></span>
                            <span style="color: var(--text-secondary); font-weight: 500;">
                                ${pair.label1} vs ${pair.label2}
                            </span>
                        </div>
                        <div class="pair-metrics">
                            <span class="metric-pill ${pillClass}">
                                Match: ${scoreVal.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div class="pair-body">
                        <div class="pair-segment">
                            <span class="segment-pos">${pair.label1}</span>
                            <p class="segment-content">"${escapeHtml(pair.text1)}"</p>
                        </div>
                        <div class="pair-segment">
                            <span class="segment-pos">${pair.label2}</span>
                            <p class="segment-content">"${escapeHtml(pair.text2)}"</p>
                        </div>
                    </div>
                    <div class="pair-footer">
                        <span class="method-details">
                            Near-Exact Matching: ${pair.near_exact_score.toFixed(1)}% 
                            &nbsp;|&nbsp; 
                            Semantic Similarity: ${pair.semantic_score.toFixed(1)}%
                        </span>
                    </div>
                `;
                duplicatesList.appendChild(item);
            });
        }

        showScreen(resultsDashboard);
    }

    // Set SVG Circle offset
    function setProgress(percent) {
        // Clamp between 0 and 100
        const val = Math.max(0, Math.min(100, percent));
        const offset = RING_CIRCUMFERENCE - (val / 100) * RING_CIRCUMFERENCE;
        scoreRing.style.strokeDashoffset = offset;
    }

    // Helper to safely escape HTML to prevent XSS
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
    }
});
