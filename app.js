/**
 * GitSubmit Pro - Main Application Logic
 * Hỗ trợ 2 chế độ:
 * 1. Batch Mode (Mỗi file bài tập là 1 Repository & 1 Link riêng biệt - như Bai1_Session2_IT206, Bai2_Session2_IT206, BTTH_Session2_IT206)
 * 2. Single Mode (Nộp 1 bài tập đơn lẻ)
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- State ---
  const state = {
    token: localStorage.getItem('gitsubmit_token') || '',
    user: null,
    currentMode: 'batch', // 'batch' hoặc 'single'
    selectedFiles: [], // Dùng cho Single Mode
    batchItems: [],    // Dùng cho Batch Mode: Array<{ file: File, filename: string, cleanName: string, repoName: string, status: string, repoUrl?: string }>
    isProcessing: false,
    history: JSON.parse(localStorage.getItem('gitsubmit_history') || '[]')
  };

  const client = new GitHubClient(state.token);

  // --- DOM Elements ---
  const tokenBanner = document.getElementById('token-banner');
  const userBadge = document.getElementById('user-badge');
  const userAvatar = document.getElementById('user-avatar');
  const userLogin = document.getElementById('user-login');
  const btnLogout = document.getElementById('btn-logout');
  const btnSettingsModal = document.getElementById('btn-settings-modal');
  const btnQuickToken = document.getElementById('btn-quick-token');

  // Mode Switcher
  const tabBatchMode = document.getElementById('tab-batch-mode');
  const tabSingleMode = document.getElementById('tab-single-mode');
  const singleModeFields = document.getElementById('single-mode-fields');
  const batchModeBanner = document.getElementById('batch-mode-banner');
  const dropTitleText = document.getElementById('drop-title-text');
  const dropSubtitleText = document.getElementById('drop-subtitle-text');

  // Modal
  const tokenModal = document.getElementById('token-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const inputPatToken = document.getElementById('input-pat-token');
  const btnToggleVisibility = document.getElementById('btn-toggle-token-visibility');
  const btnTestSaveToken = document.getElementById('btn-test-save-token');
  const tokenFeedback = document.getElementById('token-test-feedback');
  const tokenBtnText = document.getElementById('token-btn-text');

  // Form Fields
  const inputStudentName = document.getElementById('student-name');
  const inputStudentId = document.getElementById('student-id');
  const inputSubjectName = document.getElementById('subject-name');
  const inputSessionNumber = document.getElementById('session-number');
  const inputRepoName = document.getElementById('repo-name');
  const inputRepoDesc = document.getElementById('repo-desc');
  const btnRegenName = document.getElementById('btn-regen-name');
  const repoPrefixPreview = document.getElementById('repo-prefix-preview');
  const presetPills = document.querySelectorAll('.preset-pill');

  let currentSelectedExerciseType = 'Bai1';

  // File Upload Elements
  const dropZone = document.getElementById('drop-zone');
  const fileFolderInput = document.getElementById('file-folder-input');
  const fileFilesInput = document.getElementById('file-files-input');
  const btnPickFolder = document.getElementById('btn-pick-folder');
  const btnPickFiles = document.getElementById('btn-pick-files');

  // Single Mode Summary
  const filesSummaryCard = document.getElementById('files-summary-card');
  const summaryFileCount = document.getElementById('summary-file-count');
  const summaryFileSize = document.getElementById('summary-file-size');
  const filesTreeList = document.getElementById('files-tree-list');
  const btnClearFiles = document.getElementById('btn-clear-files');

  // Batch Mode Table
  const batchTableCard = document.getElementById('batch-table-card');
  const batchTableBody = document.getElementById('batch-table-body');
  const batchItemCount = document.getElementById('batch-item-count');
  const btnClearBatchFiles = document.getElementById('btn-clear-batch-files');
  const btnAddMoreBatch = document.getElementById('btn-add-more-batch');

  // Options & Actions
  const optGenerateReadme = document.getElementById('opt-generate-readme');
  const optGenerateGitignore = document.getElementById('opt-generate-gitignore');
  const btnStartProcess = document.getElementById('btn-start-process');
  const submitBtnText = document.getElementById('submit-btn-text');

  // Progress Elements
  const progressContainer = document.getElementById('progress-container');
  const progressStatusText = document.getElementById('progress-status-text');
  const progressPercent = document.getElementById('progress-percent');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressLogs = document.getElementById('progress-logs');

  // Result Elements
  const resultSuccessCard = document.getElementById('result-success-card');
  const singleResultBox = document.getElementById('single-result-box');
  const finalRepoUrl = document.getElementById('final-repo-url');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const btnOpenRepo = document.getElementById('btn-open-repo');

  // Batch Result Elements
  const batchResultsBox = document.getElementById('batch-results-box');
  const batchLinksContainer = document.getElementById('batch-links-container');
  const btnCopyAllGitLinks = document.getElementById('btn-copy-all-git-links');

  const submissionMessagePreview = document.getElementById('submission-message-preview');
  const btnCopyTemplate = document.getElementById('btn-copy-template');

  // CLI & History
  const cliCommandsPreview = document.getElementById('cli-commands-preview');
  const btnCopyCli = document.getElementById('btn-copy-cli');
  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // Ignored patterns
  const IGNORED_PATTERNS = [
    'node_modules', '.git', '.vs', '.idea', 'bin/', 'obj/', '__pycache__',
    '.DS_Store', 'Thumbs.db', 'dist/', 'build/'
  ];

  // --- Mode Switching ---
  function setMode(mode) {
    state.currentMode = mode;
    if (mode === 'batch') {
      tabBatchMode.classList.add('active');
      tabSingleMode.classList.remove('active');
      singleModeFields.classList.add('hidden');
      batchModeBanner.classList.remove('hidden');
      dropTitleText.textContent = 'Kéo & Thả các file bài tập vào đây (Bai1, Bai2, BTTH...)';
      dropSubtitleText.textContent = 'Mỗi file bài tập sẽ tự động tạo thành 1 Repo và 1 link riêng biệt!';
      submitBtnText.textContent = 'Tạo Repo & Lấy Link Nộp Bài';
      filesSummaryCard.classList.add('hidden');
      if (state.batchItems.length > 0) {
        batchTableCard.classList.remove('hidden');
      }
    } else {
      tabSingleMode.classList.add('active');
      tabBatchMode.classList.remove('active');
      singleModeFields.classList.remove('hidden');
      batchModeBanner.classList.add('hidden');
      dropTitleText.textContent = 'Kéo & Thả toàn bộ thư mục bài tập vào đây';
      dropSubtitleText.textContent = 'Tất cả các file trong thư mục sẽ được đẩy chung vào 1 Repository duy nhất';
      submitBtnText.textContent = 'Tạo Repo & Đẩy Bài Lên GitHub';
      batchTableCard.classList.add('hidden');
      if (state.selectedFiles.length > 0) {
        filesSummaryCard.classList.remove('hidden');
      }
    }
    updateCliCommandsPreview();
  }

  tabBatchMode.addEventListener('click', () => setMode('batch'));
  tabSingleMode.addEventListener('click', () => setMode('single'));

  // --- Helper Functions ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function cleanBaseFileName(fileName) {
    // Lấy tên không đuôi: Bai1.cpp -> Bai1, BTTH_Session2.java -> BTTH
    const base = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    // Bỏ ký tự thừa nhưng giữ nguyên chữ hoa/thường
    return base.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  function generateRepoNameForBatchItem(cleanName) {
    const session = inputSessionNumber ? inputSessionNumber.value.trim() : 'Session2';
    const subject = inputSubjectName ? inputSubjectName.value.trim() : 'IT206';

    // Nếu tên file đã có sẵn Session hoặc Subject thì tránh lặp
    let base = cleanName;
    if (base.toLowerCase().includes(session.toLowerCase())) {
      return `${base}_${subject}`;
    }
    return `${base}_${session}_${subject}`;
  }

  function generateStandardRepoName() {
    const exerciseType = currentSelectedExerciseType || 'Bai1';
    const session = inputSessionNumber ? inputSessionNumber.value.trim() : 'Session2';
    const subject = inputSubjectName ? inputSubjectName.value.trim() : 'IT206';

    const parts = [];
    if (exerciseType) parts.push(exerciseType);
    if (session) parts.push(session);
    if (subject) parts.push(subject);

    return parts.join('_');
  }

  function updateRepoNameSuggestion() {
    const generated = generateStandardRepoName();
    inputRepoName.value = generated;
    updateCliCommandsPreview();

    // Nếu đang ở batch mode, cập nhật lại tên repo cho các batch items
    if (state.currentMode === 'batch' && state.batchItems.length > 0) {
      state.batchItems.forEach(item => {
        item.repoName = generateRepoNameForBatchItem(item.cleanName);
      });
      renderBatchTable();
    }
  }

  function updateCliCommandsPreview() {
    const username = state.user ? state.user.login : 'Qtrung474';
    const repo = inputRepoName.value.trim() || 'Bai1_Session2_IT206';
    const student = inputStudentName.value.trim() || '';

    const commitMsg = student ? `Nop bai ${repo} - ${student}` : `Nop bai ${repo}`;

    cliCommandsPreview.textContent = 
`git init
git add .
git commit -m "${commitMsg}"
git branch -M main
git remote add origin https://github.com/${username}/${repo}.git
git push -u origin main`;
  }

  // --- Initial Load & Storage Restore ---
  function initLoad() {
    inputStudentName.value = localStorage.getItem('gitsubmit_student_name') || '';
    inputStudentId.value = localStorage.getItem('gitsubmit_student_id') || '';
    inputSubjectName.value = localStorage.getItem('gitsubmit_subject_name') || 'IT206';
    if (inputSessionNumber) {
      inputSessionNumber.value = localStorage.getItem('gitsubmit_session_number') || 'Session2';
    }

    setMode('batch'); // Default to batch mode as requested
    updateRepoNameSuggestion();
    renderHistory();

    if (state.token) {
      authenticateWithToken(state.token, false);
    } else {
      tokenBanner.classList.remove('hidden');
    }
  }

  function saveStudentPreferences() {
    localStorage.setItem('gitsubmit_student_name', inputStudentName.value.trim());
    localStorage.setItem('gitsubmit_student_id', inputStudentId.value.trim());
    localStorage.setItem('gitsubmit_subject_name', inputSubjectName.value.trim());
    if (inputSessionNumber) {
      localStorage.setItem('gitsubmit_session_number', inputSessionNumber.value.trim());
    }
  }

  // --- GitHub Authentication ---
  async function authenticateWithToken(token, showSuccessToast = true) {
    try {
      client.setToken(token);
      const user = await client.verifyUser();
      state.user = user;
      state.token = token;
      localStorage.setItem('gitsubmit_token', token);

      tokenBanner.classList.add('hidden');
      userBadge.classList.remove('hidden');
      userAvatar.src = user.avatar_url;
      userLogin.textContent = user.name || user.login;
      repoPrefixPreview.textContent = `github.com/${user.login}/`;

      updateCliCommandsPreview();

      if (showSuccessToast) {
        showToast(`Đã kết nối GitHub: @${user.login}`, 'success');
      }
      return true;
    } catch (err) {
      state.user = null;
      userBadge.classList.add('hidden');
      tokenBanner.classList.remove('hidden');
      repoPrefixPreview.textContent = 'github.com/username/';
      throw err;
    }
  }

  function logoutUser() {
    state.token = '';
    state.user = null;
    client.setToken('');
    localStorage.removeItem('gitsubmit_token');
    userBadge.classList.add('hidden');
    tokenBanner.classList.remove('hidden');
    repoPrefixPreview.textContent = 'github.com/username/';
    showToast('Đã đăng xuất GitHub Token', 'info');
  }

  // --- Modal Events ---
  function openTokenModal() {
    inputPatToken.value = state.token;
    tokenFeedback.classList.add('hidden');
    tokenModal.classList.remove('hidden');
    inputPatToken.focus();
  }

  function closeTokenModal() {
    tokenModal.classList.add('hidden');
  }

  btnQuickToken.addEventListener('click', openTokenModal);
  btnSettingsModal.addEventListener('click', openTokenModal);
  btnCloseModal.addEventListener('click', closeTokenModal);
  btnLogout.addEventListener('click', logoutUser);

  tokenModal.addEventListener('click', (e) => {
    if (e.target === tokenModal) closeTokenModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !tokenModal.classList.contains('hidden')) {
      closeTokenModal();
    }
  });

  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentSelectedExerciseType = pill.dataset.type;
      updateRepoNameSuggestion();
      showToast(`Đã chọn mẫu: ${currentSelectedExerciseType}`, 'info');
    });
  });

  btnToggleVisibility.addEventListener('click', () => {
    const isPass = inputPatToken.type === 'password';
    inputPatToken.type = isPass ? 'text' : 'password';
  });

  btnTestSaveToken.addEventListener('click', async () => {
    const tokenVal = inputPatToken.value.trim();
    if (!tokenVal) {
      tokenFeedback.className = 'token-feedback error';
      tokenFeedback.textContent = 'Vui lòng nhập GitHub Token của bạn.';
      tokenFeedback.classList.remove('hidden');
      return;
    }

    tokenBtnText.textContent = 'Đang kiểm tra token...';
    btnTestSaveToken.disabled = true;

    try {
      await authenticateWithToken(tokenVal, true);
      tokenFeedback.className = 'token-feedback success';
      tokenFeedback.textContent = `Thành công! Đã kết nối với @${state.user.login} (${state.user.public_repos} repos công khai).`;
      tokenFeedback.classList.remove('hidden');

      setTimeout(() => {
        closeTokenModal();
      }, 1000);
    } catch (err) {
      tokenFeedback.className = 'token-feedback error';
      tokenFeedback.textContent = `Lỗi: ${err.message}`;
      tokenFeedback.classList.remove('hidden');
    } finally {
      tokenBtnText.textContent = 'Kiểm Tra & Lưu Token';
      btnTestSaveToken.disabled = false;
    }
  });

  // --- Form Events ---
  inputSubjectName.addEventListener('input', () => {
    saveStudentPreferences();
    updateRepoNameSuggestion();
  });
  if (inputSessionNumber) {
    inputSessionNumber.addEventListener('input', () => {
      saveStudentPreferences();
      updateRepoNameSuggestion();
    });
  }
  inputStudentName.addEventListener('input', () => {
    saveStudentPreferences();
    updateCliCommandsPreview();
  });
  inputStudentId.addEventListener('input', () => {
    saveStudentPreferences();
    updateRepoNameSuggestion();
  });

  inputRepoName.addEventListener('input', () => {
    updateCliCommandsPreview();
  });

  btnRegenName.addEventListener('click', () => {
    inputRepoName.value = generateStandardRepoName();
    updateCliCommandsPreview();
    showToast('Đã tạo tên repo chuẩn hóa mới', 'info');
  });

  // --- File Selection Logic ---
  function isPathIgnored(path) {
    const normalized = path.replace(/\\/g, '/');
    return IGNORED_PATTERNS.some(pat => {
      return normalized.includes(pat) || normalized.split('/').includes(pat);
    });
  }

  function handleFilesSelected(filesList) {
    if (state.currentMode === 'batch') {
      handleBatchFilesSelected(filesList);
    } else {
      handleSingleFilesSelected(filesList);
    }
  }

  // --- Batch Mode Handling: Mỗi file là 1 bài ---
  function handleBatchFilesSelected(filesList) {
    let addedCount = 0;

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const relativePath = file.webkitRelativePath || file.name;
      if (isPathIgnored(relativePath)) continue;

      const fileName = file.name;
      const cleanName = cleanBaseFileName(fileName);
      const repoName = generateRepoNameForBatchItem(cleanName);

      // Tránh trùng lặp file cùng tên đã có trong danh sách
      const alreadyExists = state.batchItems.some(it => it.filename === fileName);
      if (!alreadyExists) {
        state.batchItems.push({
          file: file,
          filename: fileName,
          cleanName: cleanName,
          repoName: repoName,
          status: 'pending' // 'pending', 'uploading', 'done', 'error'
        });
        addedCount++;
      }
    }

    // Reset input value để người dùng có thể chọn tiếp file cùng tên hoặc chọn file mới ngay lập tức
    fileFilesInput.value = '';
    fileFolderInput.value = '';

    if (addedCount === 0 && state.batchItems.length === 0) {
      showToast('Không có file hợp lệ nào được chọn!', 'error');
      return;
    }

    renderBatchTable();

    if (addedCount > 0) {
      showToast(`Đã thêm ${addedCount} bài tập (Tổng: ${state.batchItems.length} bài sẵn sàng nộp)!`, 'success');
    } else {
      showToast('File này đã có sẵn trong danh sách!', 'info');
    }
  }

  function renderBatchTable() {
    if (state.batchItems.length === 0) {
      batchTableCard.classList.add('hidden');
      return;
    }

    batchTableCard.classList.remove('hidden');
    batchItemCount.textContent = `${state.batchItems.length} bài tập được phát hiện`;
    batchTableBody.innerHTML = '';

    const getFileIcon = (filename) => {
      const ext = filename.split('.').pop().toLowerCase();
      if (['docx', 'doc'].includes(ext)) return '📝';
      if (['pdf'].includes(ext)) return '📕';
      if (['cpp', 'c', 'h'].includes(ext)) return '⚡';
      if (['java'].includes(ext)) return '☕';
      if (['py'].includes(ext)) return '🐍';
      if (['js', 'ts'].includes(ext)) return '📜';
      if (['html', 'css'].includes(ext)) return '🌐';
      if (['zip', 'rar', '7z'].includes(ext)) return '📦';
      return '📄';
    };

    const userLoginText = state.user ? state.user.login : 'user';

    state.batchItems.forEach((item, index) => {
      const tr = document.createElement('tr');

      let statusBadge = '';
      if (item.status === 'pending') {
        statusBadge = '<span class="batch-status-badge batch-status-pending">⏳ Chờ tạo</span>';
      } else if (item.status === 'uploading') {
        statusBadge = '<span class="batch-status-badge batch-status-uploading">🚀 Đang đẩy...</span>';
      } else if (item.status === 'done') {
        statusBadge = '<span class="batch-status-badge batch-status-done">✅ Đã xong</span>';
      } else if (item.status === 'error') {
        statusBadge = '<span class="batch-status-badge batch-status-error">❌ Lỗi</span>';
      }

      tr.innerHTML = `
        <td>
          <div class="batch-file-info">
            <span class="file-icon-badge">${getFileIcon(item.filename)}</span>
            <div>
              <strong class="batch-file-name">${item.filename}</strong>
              <span class="batch-file-size">${formatBytes(item.file.size)}</span>
            </div>
          </div>
        </td>
        <td>
          <div class="repo-slug-wrap">
            <span class="repo-owner-tag">@${userLoginText}/</span>
            <input type="text" class="batch-row-input" value="${item.repoName}" data-index="${index}" title="Bạn có thể chỉnh sửa tên repo này nếu muốn">
          </div>
        </td>
        <td>${statusBadge}</td>
        <td style="text-align: center;">
          <button type="button" class="btn-icon btn-remove-batch-item" data-index="${index}" title="Xóa bài này khỏi danh sách">✕</button>
        </td>
      `;

      // Cho phép sửa trực tiếp tên repo trên bảng
      const inputEl = tr.querySelector('.batch-row-input');
      inputEl.addEventListener('input', (e) => {
        state.batchItems[index].repoName = e.target.value.trim();
      });

      // Xóa từng file khỏi danh sách
      const btnRemove = tr.querySelector('.btn-remove-batch-item');
      btnRemove.addEventListener('click', () => {
        state.batchItems.splice(index, 1);
        renderBatchTable();
        showToast(`Đã xóa ${item.filename} khỏi danh sách`, 'info');
      });

      batchTableBody.appendChild(tr);
    });
  }

  if (btnAddMoreBatch) {
    btnAddMoreBatch.addEventListener('click', () => {
      fileFilesInput.click();
    });
  }

  btnClearBatchFiles.addEventListener('click', () => {
    state.batchItems = [];
    batchTableCard.classList.add('hidden');
    fileFolderInput.value = '';
    fileFilesInput.value = '';
    showToast('Đã xóa danh sách bài tập hàng loạt', 'info');
  });

  // --- Single Mode Handling ---
  function handleSingleFilesSelected(filesList) {
    const validFiles = [];
    let ignoredCount = 0;

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      let relativePath = file.webkitRelativePath || file.name;
      const parts = relativePath.split('/');
      if (parts.length > 1) {
        relativePath = parts.slice(1).join('/');
      }

      if (isPathIgnored(relativePath)) {
        ignoredCount++;
        continue;
      }

      validFiles.push({
        path: relativePath,
        file: file
      });
    }

    if (validFiles.length === 0) {
      showToast('Không tìm thấy file hợp lệ nào!', 'error');
      return;
    }

    state.selectedFiles = validFiles;
    renderSelectedFilesSummary(ignoredCount);
  }

  function renderSelectedFilesSummary(ignoredCount = 0) {
    filesSummaryCard.classList.remove('hidden');
    summaryFileCount.textContent = `${state.selectedFiles.length} tệp tin`;

    const totalBytes = state.selectedFiles.reduce((acc, f) => acc + (f.file.size || 0), 0);
    summaryFileSize.textContent = formatBytes(totalBytes);

    filesTreeList.innerHTML = '';
    state.selectedFiles.slice(0, 50).forEach(item => {
      const row = document.createElement('div');
      row.className = 'tree-file-item';
      row.innerHTML = `
        <span class="tree-file-path">📄 ${item.path}</span>
        <span class="tree-file-size">${formatBytes(item.file.size || 0)}</span>
      `;
      filesTreeList.appendChild(row);
    });

    if (state.selectedFiles.length > 50) {
      const moreRow = document.createElement('div');
      moreRow.className = 'tree-file-item';
      moreRow.innerHTML = `<span class="tree-file-path" style="color: var(--accent-cyan)">... và ${state.selectedFiles.length - 50} tệp tin khác</span>`;
      filesTreeList.appendChild(moreRow);
    }

    let msg = `Đã chọn ${state.selectedFiles.length} tệp tin sẵn sàng nộp!`;
    if (ignoredCount > 0) {
      msg += ` (Đã loại trừ ${ignoredCount} file rác)`;
    }
    showToast(msg, 'success');
  }

  btnClearFiles.addEventListener('click', () => {
    state.selectedFiles = [];
    filesSummaryCard.classList.add('hidden');
    fileFolderInput.value = '';
    fileFilesInput.value = '';
    showToast('Đã xóa danh sách file đã chọn', 'info');
  });

  // Pickers & Drag Drop
  btnPickFolder.addEventListener('click', (e) => {
    e.stopPropagation();
    fileFolderInput.click();
  });

  fileFolderInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
  });

  btnPickFiles.addEventListener('click', (e) => {
    e.stopPropagation();
    fileFilesInput.click();
  });

  fileFilesInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
  });

  dropZone.addEventListener('click', () => {
    if (state.currentMode === 'batch') {
      fileFilesInput.click();
    } else {
      fileFolderInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', async (e) => {
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const filesFound = [];
      const queue = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) queue.push(traverseFileTree(entry, ''));
        }
      }

      await Promise.all(queue);

      async function traverseFileTree(item, path) {
        if (item.isFile) {
          return new Promise(resolve => {
            item.file(file => {
              const fullRelPath = path ? `${path}/${file.name}` : file.name;
              if (!isPathIgnored(fullRelPath)) {
                filesFound.push(file);
              }
              resolve();
            });
          });
        } else if (item.isDirectory) {
          if (isPathIgnored(item.name)) return;
          const dirReader = item.createReader();
          return new Promise(resolve => {
            dirReader.readEntries(async entries => {
              for (const child of entries) {
                await traverseFileTree(child, path ? `${path}/${item.name}` : item.name);
              }
              resolve();
            });
          });
        }
      }

      if (filesFound.length > 0) {
        handleFilesSelected(filesFound);
      } else if (e.dataTransfer.files.length > 0) {
        handleFilesSelected(e.dataTransfer.files);
      }
    }
  });

  // --- README & Template Generators ---
  function generateReadmeContent(repoName, repoUrl, specificFileName = '') {
    const studentName = inputStudentName.value.trim() || 'Chưa cập nhật';
    const studentId = inputStudentId.value.trim() || 'Chưa cập nhật';
    const subject = inputSubjectName.value.trim() || 'IT206';
    const session = inputSessionNumber ? inputSessionNumber.value.trim() : 'Session2';
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    let fileDetail = specificFileName ? `- 📄 \`${specificFileName}\`` : '- (Mã nguồn bài tập)';

    return `# 📚 ${repoName} - Môn ${subject} (${session})

> **Thông tin nộp bài tập** được tạo tự động bởi [GitSubmit Pro](https://github.com/).

---

## 👨‍🎓 Thông Tin Sinh Viên
| Mục | Chi tiết |
| :--- | :--- |
| **Họ và tên** | ${studentName} |
| **Mã số sinh viên (MSSV)** | ${studentId} |
| **Môn học** | ${subject} |
| **Buổi học / Session** | ${session} |
| **Tên bài nộp** | ${repoName} |
| **Thời gian nộp bài** | ${now} |
| **Repository URL** | [${repoName}](${repoUrl}) |

---

## 📁 File Bài Tập
\`\`\`text
${fileDetail}
\`\`\`

---
*Generated automatically with ❤️ by GitSubmit Pro.*
`;
  }

  function generateGitignoreContent() {
    return `# Logs
logs
*.log
npm-debug.log*

# Runtime
pids
*.pid
node_modules/
dist/
build/
bin/
obj/
*.exe
*.dll
.vscode/
.idea/
__pycache__/
*.py[cod]
.env
.DS_Store
Thumbs.db
`;
  }

  // --- Process & Submission Execution ---
  function logProgress(msg, type = 'info') {
    const item = document.createElement('div');
    item.className = `log-item ${type}`;
    item.textContent = `> ${msg}`;
    progressLogs.appendChild(item);
    progressLogs.scrollTop = progressLogs.scrollHeight;
  }

  function updateProgressBar(percent, statusText) {
    progressBarFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
    if (statusText) progressStatusText.textContent = statusText;
  }

  btnStartProcess.addEventListener('click', async () => {
    if (state.isProcessing) return;

    if (!state.token) {
      showToast('Bạn chưa cấu hình GitHub Token!', 'error');
      openTokenModal();
      return;
    }

    saveStudentPreferences();

    if (state.currentMode === 'batch') {
      await processBatchSubmission();
    } else {
      await processSingleSubmission();
    }
  });

  // --- Chạy Xử Lý Nộp Hàng Loạt (Batch Mode) ---
  async function processBatchSubmission() {
    if (state.batchItems.length === 0) {
      showToast('Vui lòng chọn các file bài tập trước khi nộp hàng loạt!', 'error');
      return;
    }

    state.isProcessing = true;
    btnStartProcess.disabled = true;
    submitBtnText.textContent = 'Đang tự động tạo các Repo & tải file...';
    progressContainer.classList.remove('hidden');
    progressLogs.innerHTML = '';
    resultSuccessCard.classList.add('hidden');

    const total = state.batchItems.length;
    const completedLinks = [];

    try {
      updateProgressBar(5, 'Đang xác thực thông tin tài khoản GitHub...');
      logProgress(`Bắt đầu quy trình nộp hàng loạt ${total} bài tập...`);

      if (!state.user) {
        await client.verifyUser();
      }

      const visibility = document.querySelector('input[name="repo-visibility"]:checked').value;
      const isPrivate = visibility === 'private';

      for (let i = 0; i < total; i++) {
        const item = state.batchItems[i];
        item.status = 'uploading';
        renderBatchTable();

        const currentPercent = Math.round(((i) / total) * 90) + 5;
        updateProgressBar(currentPercent, `Đang xử lý bài ${i + 1}/${total}: ${item.repoName}...`);
        logProgress(`[${i + 1}/${total}] Đang tạo Repository: ${state.user.login}/${item.repoName}`);

        try {
          // 1. Tạo Repo (chỉ bật autoInit nếu người dùng chủ động tích chọn README)
          const repoDesc = inputRepoDesc.value.trim() || `Bài tập ${item.cleanName} môn ${inputSubjectName.value.trim() || 'IT206'}`;
          const isReadmeEnabled = Boolean(optGenerateReadme && optGenerateReadme.checked);
          const isGitignoreEnabled = Boolean(optGenerateGitignore && optGenerateGitignore.checked);

          const newRepo = await client.createRepository({
            name: item.repoName,
            description: repoDesc,
            isPrivate: isPrivate,
            autoInit: isReadmeEnabled
          });

          // 2. Upload file bài tập (chỉ thêm README hay .gitignore nếu được chọn)
          const uploadFiles = [
            { path: item.filename, file: item.file }
          ];

          if (isReadmeEnabled) {
            uploadFiles.push({
              path: 'README.md',
              content: generateReadmeContent(item.repoName, newRepo.html_url, item.filename)
            });
          }

          if (isGitignoreEnabled) {
            uploadFiles.push({
              path: '.gitignore',
              content: generateGitignoreContent()
            });
          }

          const commitMsg = `Submit ${item.repoName} - ${inputStudentName.value.trim() || state.user.login}`;
          await client.uploadFilesCommit(
            state.user.login,
            item.repoName,
            uploadFiles,
            commitMsg,
            () => {}
          );

          item.status = 'done';
          item.repoUrl = `${newRepo.html_url}.git`;
          completedLinks.push({
            name: item.repoName,
            gitUrl: `${newRepo.html_url}.git`,
            webUrl: newRepo.html_url
          });

          logProgress(`-> Hoàn tất [${i + 1}/${total}]: ${newRepo.html_url}.git`, 'success');

          // Lưu vào lịch sử
          saveToHistory({
            id: Date.now().toString() + '_' + i,
            repoName: item.repoName,
            repoUrl: `${newRepo.html_url}.git`,
            subject: inputSubjectName.value.trim() || 'IT206',
            assignment: item.cleanName,
            studentName: inputStudentName.value.trim(),
            studentId: inputStudentId.value.trim(),
            date: new Date().toLocaleString('vi-VN'),
            fileCount: uploadFiles.length
          });

        } catch (subErr) {
          item.status = 'error';
          logProgress(`Lỗi khi tạo ${item.repoName}: ${subErr.message}`, 'error');
        }

        renderBatchTable();
      }

      updateProgressBar(100, `Hoàn tất toàn bộ ${completedLinks.length}/${total} bài tập!`);
      logProgress(`Đã hoàn tất! Danh sách các link đã sẵn sàng bên dưới.`, 'success');

      // Hiển thị kết quả Batch Mode
      renderBatchResults(completedLinks);

      showToast(`Đã tạo thành công ${completedLinks.length} Repository và lấy đầy đủ link!`, 'success');

    } catch (err) {
      console.error(err);
      logProgress(`Thất bại: ${err.message}`, 'error');
      showToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      state.isProcessing = false;
      btnStartProcess.disabled = false;
      submitBtnText.textContent = 'Tạo Repo & Lấy Link Nộp Bài';
    }
  }

  function renderBatchResults(links) {
    resultSuccessCard.classList.remove('hidden');
    singleResultBox.classList.add('hidden');
    batchResultsBox.classList.remove('hidden');
    batchLinksContainer.innerHTML = '';

    const subject = inputSubjectName.value.trim() || 'IT206';
    const session = inputSessionNumber ? inputSessionNumber.value.trim() : 'Session2';
    const studentName = inputStudentName.value.trim();
    const studentId = inputStudentId.value.trim();
    const now = new Date().toLocaleString('vi-VN');

    // Build plain links text (.git)
    const allGitLines = links.map(l => l.gitUrl).join('\n');

    // Build teacher submission message
    let teacherMsg = `Kính gửi Thầy/Cô,\n\nEm xin phép gửi danh sách link nộp bài tập môn ${subject} (${session}):\n`;
    if (studentName) teacherMsg += `- Họ và tên: ${studentName}\n`;
    if (studentId) teacherMsg += `- MSSV: ${studentId}\n`;
    teacherMsg += `\nDanh sách các link bài tập:\n`;
    links.forEach(l => {
      teacherMsg += `- ${l.name}: ${l.gitUrl}\n`;
    });
    teacherMsg += `\nThời gian nộp: ${now}\nEm xin chân thành cảm ơn Thầy/Cô!`;

    submissionMessagePreview.value = teacherMsg;

    // Render individual link rows (identical to user screenshot)
    links.forEach(l => {
      const row = document.createElement('div');
      row.className = 'batch-link-item';
      row.innerHTML = `
        <a href="${l.webUrl}" target="_blank" class="batch-link-url">${l.gitUrl}</a>
        <button type="button" class="btn-xs btn-copy-single-git" data-url="${l.gitUrl}">Copy</button>
      `;

      row.querySelector('.btn-copy-single-git').addEventListener('click', (e) => {
        navigator.clipboard.writeText(l.gitUrl).then(() => {
          showToast(`Đã sao chép link: ${l.name}`, 'success');
        });
      });

      batchLinksContainer.appendChild(row);
    });

    // Copy all .git links button
    btnCopyAllGitLinks.onclick = () => {
      navigator.clipboard.writeText(allGitLines).then(() => {
        showToast('Đã sao chép tất cả các link .git vào Clipboard!', 'success');
      });
    };

    resultSuccessCard.scrollIntoView({ behavior: 'smooth' });
  }

  // --- Chạy Xử Lý Nộp 1 Bài (Single Mode) ---
  async function processSingleSubmission() {
    let repoName = inputRepoName.value.trim();
    if (!repoName) {
      repoName = generateStandardRepoName();
      inputRepoName.value = repoName;
    }

    if (state.selectedFiles.length === 0) {
      const confirmContinue = confirm('Bạn chưa chọn tệp tin bài tập nào. Tạo repo trống có sẵn README?');
      if (!confirmContinue) return;
    }

    state.isProcessing = true;
    btnStartProcess.disabled = true;
    submitBtnText.textContent = 'Đang xử lý tạo Repo & tải file...';
    progressContainer.classList.remove('hidden');
    progressLogs.innerHTML = '';
    resultSuccessCard.classList.add('hidden');

    try {
      updateProgressBar(10, 'Đang xác thực thông tin tài khoản GitHub...');
      logProgress(`Bắt đầu xử lý cho sinh viên: ${inputStudentName.value.trim() || 'Ẩn danh'}`);

      if (!state.user) {
        await client.verifyUser();
      }

      const visibility = document.querySelector('input[name="repo-visibility"]:checked').value;
      const isPrivate = visibility === 'private';
      const repoDesc = inputRepoDesc.value.trim() || `Bài tập môn ${inputSubjectName.value.trim() || 'IT206'}`;
      const isReadmeEnabled = Boolean(optGenerateReadme && optGenerateReadme.checked);
      const isGitignoreEnabled = Boolean(optGenerateGitignore && optGenerateGitignore.checked);

      updateProgressBar(25, `Đang tạo repository "${repoName}" trên GitHub...`);
      logProgress(`Gọi API tạo Repository: ${state.user.login}/${repoName}`);

      const newRepo = await client.createRepository({
        name: repoName,
        description: repoDesc,
        isPrivate: isPrivate,
        autoInit: isReadmeEnabled
      });

      logProgress(`Tạo Repository thành công: ${newRepo.html_url}`, 'success');
      updateProgressBar(40, 'Đang chuẩn bị file...');

      const uploadQueue = [...state.selectedFiles];

      if (isReadmeEnabled) {
        uploadQueue.push({
          path: 'README.md',
          content: generateReadmeContent(repoName, newRepo.html_url)
        });
      }

      if (isGitignoreEnabled) {
        uploadQueue.push({
          path: '.gitignore',
          content: generateGitignoreContent()
        });
      }

      if (uploadQueue.length > 0) {
        const commitMsg = `Submit ${repoName} - ${inputStudentName.value.trim() || state.user.login}`;
        await client.uploadFilesCommit(
          state.user.login,
          repoName,
          uploadQueue,
          commitMsg,
          (prog) => {
            if (prog.step === 'blobs') {
              updateProgressBar(prog.percent, `Đang đẩy tệp ${prog.current}/${prog.total}: ${prog.filename}`);
            } else if (prog.step === 'commit') {
              updateProgressBar(88, 'Đang tạo commit...');
            } else if (prog.step === 'push') {
              updateProgressBar(95, 'Đang cập nhật nhánh main...');
            }
          }
        );
      }

      updateProgressBar(100, 'Hoàn tất 100%!');
      logProgress('Tuyệt vời! Repository đã sẵn sàng!', 'success');

      // Hiển thị kết quả Single Mode
      resultSuccessCard.classList.remove('hidden');
      singleResultBox.classList.remove('hidden');
      batchResultsBox.classList.add('hidden');

      const repoGitUrl = `${newRepo.html_url}.git`;
      finalRepoUrl.value = repoGitUrl;
      btnOpenRepo.href = newRepo.html_url;

      const subject = inputSubjectName.value.trim() || 'IT206';
      const session = inputSessionNumber ? inputSessionNumber.value.trim() : 'Session2';
      const studentName = inputStudentName.value.trim();
      const studentId = inputStudentId.value.trim();
      const now = new Date().toLocaleString('vi-VN');

      let singleMsg = `Kính gửi Thầy/Cô,\n\nEm xin phép gửi thông tin nộp bài tập:\n- Bài nộp: ${repoName} (${session})\n- Môn học: ${subject}\n`;
      if (studentName) singleMsg += `- Họ và tên: ${studentName}\n`;
      if (studentId) singleMsg += `- MSSV: ${studentId}\n`;
      singleMsg += `- Link GitHub: ${repoGitUrl}\n- Thời gian nộp: ${now}\n\nEm xin chân thành cảm ơn Thầy/Cô!`;
      submissionMessagePreview.value = singleMsg;

      saveToHistory({
        id: Date.now().toString(),
        repoName: newRepo.name,
        repoUrl: repoGitUrl,
        subject: subject,
        assignment: repoName,
        studentName: studentName,
        studentId: studentId,
        date: now,
        fileCount: uploadQueue.length
      });

      resultSuccessCard.scrollIntoView({ behavior: 'smooth' });
      showToast('Đã nộp bài thành công!', 'success');

    } catch (err) {
      console.error(err);
      logProgress(`Thất bại: ${err.message}`, 'error');
      showToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      state.isProcessing = false;
      btnStartProcess.disabled = false;
      submitBtnText.textContent = 'Tạo Repo & Đẩy Bài Lên GitHub';
    }
  }

  // Copy Buttons
  btnCopyLink.addEventListener('click', () => {
    navigator.clipboard.writeText(finalRepoUrl.value).then(() => {
      showToast('Đã sao chép link GitHub vào Clipboard!', 'success');
    });
  });

  btnCopyTemplate.addEventListener('click', () => {
    navigator.clipboard.writeText(submissionMessagePreview.value).then(() => {
      showToast('Đã sao chép mẫu tin nhắn nộp bài cho Thầy/Cô!', 'success');
    });
  });

  btnCopyCli.addEventListener('click', () => {
    navigator.clipboard.writeText(cliCommandsPreview.textContent).then(() => {
      showToast('Đã sao chép lệnh Git Terminal!', 'success');
    });
  });

  // --- History Management ---
  function saveToHistory(entry) {
    state.history.unshift(entry);
    if (state.history.length > 50) state.history.pop();
    localStorage.setItem('gitsubmit_history', JSON.stringify(state.history));
    renderHistory();
  }

  function renderHistory() {
    if (!state.history || state.history.length === 0) {
      historyEmpty.classList.remove('hidden');
      historyList.classList.add('hidden');
      return;
    }

    historyEmpty.classList.add('hidden');
    historyList.classList.remove('hidden');
    historyList.innerHTML = '';

    state.history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-item';
      card.innerHTML = `
        <div class="history-item-info">
          <span class="history-item-title">${item.repoName || item.assignment}</span>
          <div class="history-item-meta">
            <span>📅 ${item.date}</span>
            <span>🔗 <a href="${item.repoUrl.replace('.git', '')}" target="_blank" style="color: var(--accent-cyan); text-decoration: none;">${item.repoName}</a></span>
          </div>
        </div>
        <div class="history-item-actions">
          <button class="btn-xs btn-history-copy" data-url="${item.repoUrl}" title="Copy Link .git">Copy Link</button>
        </div>
      `;

      card.querySelector('.btn-history-copy').addEventListener('click', () => {
        navigator.clipboard.writeText(item.repoUrl).then(() => {
          showToast(`Đã sao chép link ${item.repoName}`, 'success');
        });
      });

      historyList.appendChild(card);
    });
  }

  btnClearHistory.addEventListener('click', () => {
    if (state.history.length === 0) return;
    if (confirm('Bạn có chắc muốn xóa lịch sử nộp bài?')) {
      state.history = [];
      localStorage.removeItem('gitsubmit_history');
      renderHistory();
      showToast('Đã làm sạch lịch sử', 'info');
    }
  });

  // Khởi động
  initLoad();
});
