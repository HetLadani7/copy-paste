document.addEventListener('DOMContentLoaded', () => {
  // --- STATE VARIABLES ---
  let selectedFile = null;
  let activeShareTimer = null;
  let activeReceiveTimer = null;

  // --- DOM ELEMENTS ---
  // Tabs
  const tabSend = document.getElementById('tab-send');
  const tabReceive = document.getElementById('tab-receive');
  const paneSend = document.getElementById('pane-send');
  const paneReceive = document.getElementById('pane-receive');

  // Input Type Toggles
  const toggleText = document.getElementById('toggle-text');
  const toggleFile = document.getElementById('toggle-file');
  const textInputWrapper = document.getElementById('text-input-wrapper');
  const fileInputWrapper = document.getElementById('file-input-wrapper');

  // Text Inputs
  const shareText = document.getElementById('share-text');
  const charCounter = document.getElementById('char-counter');

  // File Inputs / Dropzone
  const dropzone = document.getElementById('dropzone');
  const fileUploader = document.getElementById('file-uploader');
  const fileDetails = document.getElementById('file-details');
  const previewGenericIcon = document.getElementById('preview-generic-icon');
  const previewImage = document.getElementById('preview-image');
  const fileNameDisplay = document.getElementById('file-name');
  const fileSizeDisplay = document.getElementById('file-size');
  const removeFileBtn = document.getElementById('remove-file-btn');

  // Action Buttons
  const btnCreateCode = document.getElementById('btn-create-code');
  const shareSpinner = document.getElementById('share-spinner');

  // Success Views
  const successView = document.getElementById('share-success-view');
  const inputContainer = document.getElementById('input-container');
  const generatedCode = document.getElementById('generated-code');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const shareTimerDisplay = document.getElementById('share-timer');
  const timerProgress = document.getElementById('timer-progress');
  const btnResetSender = document.getElementById('btn-reset-sender');

  // Receiver Input Elements
  const digitInputs = Array.from(document.querySelectorAll('.code-digit-input'));
  const btnRetrieve = document.getElementById('btn-retrieve');
  const retrieveSpinner = document.getElementById('retrieve-spinner');
  const receiveEntryView = document.getElementById('receive-entry-view');
  const receiveResultView = document.getElementById('receive-result-view');
  const receiveTimerDisplay = document.getElementById('receive-timer');
  const receiveTimerProgress = document.getElementById('receive-timer-progress');
  const btnResetReceiver = document.getElementById('btn-reset-receiver');

  // Decrypted Results
  const resultTextWrapper = document.getElementById('result-text-box');
  const retrievedText = document.getElementById('retrieved-text');
  const btnCopyRetrieved = document.getElementById('btn-copy-retrieved');

  const resultFileWrapper = document.getElementById('result-file-box');
  const retrievedFileName = document.getElementById('retrieved-file-name');
  const retrievedFileSize = document.getElementById('retrieved-file-size');
  const btnDownloadFile = document.getElementById('btn-download-file');
  const fileImgPreview = document.getElementById('file-img-preview');
  const fileGenericIcon = document.getElementById('file-generic-icon');

  // Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // --- HELPER FUNCTIONS ---

  // Display Toast message
  function showToast(message, duration = 3000) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 300);
    }, duration);
  }

  // Format file size
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Setup countdown timer
  function startCountdown(durationMs, displayEl, progressEl, onExpire) {
    const startTime = Date.now();
    const endTime = startTime + durationMs;

    function update() {
      const remainingMs = Math.max(0, endTime - Date.now());
      const totalSeconds = Math.ceil(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      // Update text
      displayEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Update progress bar width
      const percentage = (remainingMs / durationMs) * 100;
      if (progressEl) {
        progressEl.style.width = `${percentage}%`;
      }

      if (remainingMs <= 0) {
        clearInterval(timerInterval);
        if (onExpire) onExpire();
      }
    }

    update();
    const timerInterval = setInterval(update, 1000);
    return timerInterval;
  }

  // --- TAB CONTROLS ---
  function switchTab(target) {
    if (target === 'send') {
      tabSend.classList.add('active');
      tabSend.setAttribute('aria-selected', 'true');
      tabReceive.classList.remove('active');
      tabReceive.setAttribute('aria-selected', 'false');
      paneSend.classList.remove('hidden');
      paneSend.classList.add('active');
      paneReceive.classList.add('hidden');
      paneReceive.classList.remove('active');
    } else {
      tabReceive.classList.add('active');
      tabReceive.setAttribute('aria-selected', 'true');
      tabSend.classList.remove('active');
      tabSend.setAttribute('aria-selected', 'false');
      paneReceive.classList.remove('hidden');
      paneReceive.classList.add('active');
      paneSend.classList.add('hidden');
      paneSend.classList.remove('active');
      // Autofocus first digit when switching to receive mode
      setTimeout(() => digitInputs[0].focus(), 100);
    }
  }

  tabSend.addEventListener('click', () => switchTab('send'));
  tabReceive.addEventListener('click', () => switchTab('receive'));

  // --- SENDER CONTROLS ---

  // Text / File Toggles
  toggleText.addEventListener('click', () => {
    toggleText.classList.add('active');
    toggleFile.classList.remove('active');
    textInputWrapper.classList.remove('hidden');
    fileInputWrapper.classList.add('hidden');
  });

  toggleFile.addEventListener('click', () => {
    toggleFile.classList.add('active');
    toggleText.classList.remove('active');
    fileInputWrapper.classList.remove('hidden');
    textInputWrapper.classList.add('hidden');
  });

  // Text character counter
  shareText.addEventListener('input', () => {
    const length = shareText.value.length;
    charCounter.textContent = `${length} / 50000 characters`;
  });

  // Drag and Drop & Browsing File Setup
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
  });

  dropzone.addEventListener('drop', e => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  });

  fileUploader.addEventListener('change', e => {
    if (e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  });



  function handleFileSelection(file) {
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      showToast("File size exceeds the 100MB limit.");
      return;
    }

    selectedFile = file;
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = formatBytes(file.size);

    // Check if it's an image to show inline preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        previewImage.src = e.target.result;
        previewImage.classList.remove('hidden');
        previewGenericIcon.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    } else {
      previewImage.classList.add('hidden');
      previewGenericIcon.classList.remove('hidden');
    }

    fileDetails.classList.remove('hidden');
    dropzone.querySelector('.dropzone-content').style.opacity = '0';
  }

  // Remove File Selection
  removeFileBtn.addEventListener('click', e => {
    e.stopPropagation();
    resetFileSelector();
  });

  function resetFileSelector() {
    selectedFile = null;
    fileUploader.value = '';
    previewImage.src = '';
    previewImage.classList.add('hidden');
    previewGenericIcon.classList.remove('hidden');
    fileDetails.classList.add('hidden');
    dropzone.querySelector('.dropzone-content').style.opacity = '1';
  }

  // Send content creation trigger
  btnCreateCode.addEventListener('click', async () => {
    const isTextMode = toggleText.classList.contains('active');
    let requestBody = null;
    let isFormData = false;

    if (isTextMode) {
      const text = shareText.value.trim();
      if (!text) {
        showToast("Please enter some text to share.");
        return;
      }
      requestBody = JSON.stringify({ text });
      isFormData = false;
    } else {
      if (!selectedFile) {
        showToast("Please select a file to share.");
        return;
      }
      const formData = new FormData();
      formData.append('file', selectedFile);
      requestBody = formData;
      isFormData = true;
    }

    // Start loading state
    btnCreateCode.disabled = true;
    shareSpinner.classList.remove('hidden');

    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: isFormData ? {} : { 'Content-Type': 'application/json' },
        body: requestBody
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create share code.");
      }

      const data = await response.json();
      displayShareSuccess(data);

    } catch (error) {
      console.error(error);
      showToast(error.message || "An error occurred while sharing.");
      btnCreateCode.disabled = false;
    } finally {
      shareSpinner.classList.add('hidden');
    }
  });

  // Success view renderer
  function displayShareSuccess(data) {
    // Hide inputs
    inputContainer.classList.add('hidden');
    btnCreateCode.classList.add('hidden');
    
    // Display formatted code (e.g., 12 34)
    const rawCode = data.code;
    const formattedCode = rawCode.substring(0, 2) + ' ' + rawCode.substring(2);
    generatedCode.textContent = formattedCode;



    // Show card
    successView.classList.remove('hidden');

    // Copy Code functionality
    btnCopyCode.onclick = () => {
      navigator.clipboard.writeText(rawCode).then(() => {
        showToast("Code copied to clipboard!");
        
        // Success animation icon swap
        const copySvg = btnCopyCode.querySelector('.copy-svg');
        const checkSvg = btnCopyCode.querySelector('.check-svg');
        copySvg.classList.add('hidden');
        checkSvg.classList.remove('hidden');

        setTimeout(() => {
          copySvg.classList.remove('hidden');
          checkSvg.classList.add('hidden');
        }, 2000);
      });
    };



    // Countdown Timer execution
    if (activeShareTimer) clearInterval(activeShareTimer);
    activeShareTimer = startCountdown(data.timeLeftMs, shareTimerDisplay, timerProgress, () => {
      showToast("Content has expired and is deleted.", 4000);
      resetSenderPane();
    });
  }

  // Reset sender pane to original state
  btnResetSender.addEventListener('click', resetSenderPane);

  function resetSenderPane() {
    if (activeShareTimer) clearInterval(activeShareTimer);
    
    successView.classList.add('hidden');
    inputContainer.classList.remove('hidden');
    btnCreateCode.classList.remove('hidden');
    btnCreateCode.disabled = false;

    // Clear content inputs
    shareText.value = '';
    charCounter.textContent = '0 / 50000 characters';
    resetFileSelector();
  }

  // --- RECEIVER CONTROLS ---

  // 4-digit Code Inputs auto-shifting focus
  digitInputs.forEach((input, index) => {
    // Only accept numeric entries
    input.addEventListener('input', e => {
      const value = e.target.value;
      if (!/^[0-9]$/.test(value)) {
        e.target.value = '';
        return;
      }
      
      // Auto move focus to next digit box
      if (index < digitInputs.length - 1) {
        digitInputs[index + 1].focus();
      }
    });

    // Handle backspace navigation
    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        digitInputs[index - 1].focus();
      }
    });

    // Paste handler
    input.addEventListener('paste', e => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      
      if (pasteData.length >= 4) {
        for (let i = 0; i < 4; i++) {
          digitInputs[i].value = pasteData[i];
        }
        digitInputs[3].focus();
      }
    });
  });

  // Retrieve Content handler
  btnRetrieve.addEventListener('click', fetchSharedContent);

  async function fetchSharedContent() {
    // Collect 4 digits
    const code = digitInputs.map(input => input.value).join('');
    if (code.length !== 4) {
      showToast("Please enter all 4 digits of the sharing code.");
      return;
    }

    // Loading State
    btnRetrieve.disabled = true;
    retrieveSpinner.classList.remove('hidden');

    try {
      const response = await fetch(`/api/share/${code}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Code is invalid or expired.");
      }

      const data = await response.json();
      displayRetrievedContent(data);

    } catch (error) {
      console.error(error);
      showToast(error.message || "Invalid sharing code.");
      btnRetrieve.disabled = false;
    } finally {
      retrieveSpinner.classList.add('hidden');
    }
  }

  // Render decrypted content
  function displayRetrievedContent(data) {
    // Hide Entry screen
    receiveEntryView.classList.add('hidden');

    // Clear result templates
    resultTextWrapper.classList.add('hidden');
    resultFileWrapper.classList.add('hidden');
    fileImgPreview.classList.add('hidden');
    fileGenericIcon.classList.add('hidden');

    if (data.type === 'text') {
      retrievedText.value = data.content;
      resultTextWrapper.classList.remove('hidden');

      btnCopyRetrieved.onclick = () => {
        navigator.clipboard.writeText(data.content).then(() => {
          showToast("Text copied successfully!");
        });
      };
    } else {
      // File mode
      retrievedFileName.textContent = data.fileName;
      // Reconstruct file from base64 Content
      try {
        const byteCharacters = atob(data.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.mimeType });
        
        // Calculate file size based on decoded size
        retrievedFileSize.textContent = formatBytes(blob.size);

        const objectUrl = URL.createObjectURL(blob);
        btnDownloadFile.href = objectUrl;
        btnDownloadFile.download = data.fileName;

        if (data.mimeType.startsWith('image/')) {
          fileImgPreview.src = objectUrl;
          fileImgPreview.classList.remove('hidden');
        } else {
          fileGenericIcon.classList.remove('hidden');
        }
        
        resultFileWrapper.classList.remove('hidden');

      } catch (err) {
        console.error("Failed to parse file payload:", err);
        showToast("Error processing the shared file.");
      }
    }

    // Display retrieved view card
    receiveResultView.classList.remove('hidden');

    // Trigger local countdown
    if (activeReceiveTimer) clearInterval(activeReceiveTimer);
    activeReceiveTimer = startCountdown(data.timeLeftMs, receiveTimerDisplay, receiveTimerProgress, () => {
      showToast("Shared content has expired.", 4000);
      resetReceiverPane();
    });
  }

  // Reset receiver pane
  btnResetReceiver.addEventListener('click', resetReceiverPane);

  function resetReceiverPane() {
    if (activeReceiveTimer) clearInterval(activeReceiveTimer);

    receiveResultView.classList.add('hidden');
    receiveEntryView.classList.remove('hidden');
    btnRetrieve.disabled = false;

    // Reset code input values
    digitInputs.forEach(input => input.value = '');
    
    // Clear URL parameters if any
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // --- DEEP LINKING CHECK ON PAGE LOAD ---
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code');
  
  if (codeParam && codeParam.length === 4 && /^[0-9]+$/.test(codeParam)) {
    // Switch to receive tab
    switchTab('receive');
    
    // Autofill digits
    for (let i = 0; i < 4; i++) {
      digitInputs[i].value = codeParam[i];
    }
    
    // Perform autofetch
    fetchSharedContent();
  }
});
