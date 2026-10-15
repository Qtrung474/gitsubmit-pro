/**
 * GitSubmit Pro - GitHub API Client
 * Cung cấp các phương thức tương tác trực tiếp với GitHub REST & Contents / Git Database API
 */

class GitHubClient {
  constructor(token = '') {
    this.token = token.trim();
    this.baseUrl = 'https://api.github.com';
    this.currentUser = null;
  }

  setToken(token) {
    this.token = token.trim();
  }

  getHeaders() {
    return {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${this.token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  /**
   * Kiểm tra token và lấy thông tin người dùng
   */
  async verifyUser() {
    if (!this.token) {
      throw new Error('Chưa cung cấp GitHub Token!');
    }

    const response = await fetch(`${this.baseUrl}/user`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại!');
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Lỗi GitHub (${response.status})`);
    }

    const data = await response.json();
    this.currentUser = data;
    return data;
  }

  /**
   * Tạo repository mới trên GitHub (hoặc tái sử dụng nếu đã tồn tại)
   */
  async createRepository({ name, description = '', isPrivate = false, autoInit = false }) {
    if (!this.currentUser) {
      await this.verifyUser();
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      private: Boolean(isPrivate),
      auto_init: Boolean(autoInit)
    };

    const response = await fetch(`${this.baseUrl}/user/repos`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      if (response.status === 422) {
        // Nếu repo đã tồn tại trên tài khoản của user, lấy repo đó để tiếp tục đẩy file
        const checkRes = await fetch(`${this.baseUrl}/repos/${this.currentUser.login}/${encodeURIComponent(name.trim())}`, {
          headers: this.getHeaders()
        });
        if (checkRes.ok) {
          return await checkRes.json();
        }
      }
      const err = await response.json().catch(() => ({}));
      let msg = err.message || `Không thể tạo repo (${response.status})`;
      if (err.errors && Array.isArray(err.errors)) {
        const details = err.errors.map(e => e.message || e.field).join(', ');
        if (details) msg += ` - Chi tiết: ${details}`;
      }
      if (response.status === 401) {
        msg = 'GitHub Token không hợp lệ hoặc đã hết hạn!';
      } else if (response.status === 403) {
        msg = 'Token không có quyền tạo repository. Vui lòng cấp quyền "repo" cho Personal Access Token!';
      } else if (response.status === 422) {
        if (name.includes(' ') || /\s/.test(name)) {
          msg = `Tên repo "${name}" chứa khoảng trắng (dấu cách), GitHub không cho phép!`;
        } else {
          msg = `Tên repo "${name}" không hợp lệ hoặc chứa ký tự đặc biệt bị GitHub cấm!`;
        }
      }
      throw new Error(msg);
    }

    return await response.json();
  }

  /**
   * Chuyển đổi File sang Base64
   */
  readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Tải 1 file trực tiếp qua Contents API
   * Hoạt động 100% ổn định kể cả trên repo mới tạo hoàn toàn rỗng (auto_init = false)
   */
  async uploadSingleFileContents(owner, repo, filePath, fileOrContent, commitMessage = 'Submit homework') {
    let base64Content = '';
    if (fileOrContent instanceof File || fileOrContent instanceof Blob) {
      base64Content = await this.readFileAsBase64(fileOrContent);
    } else if (typeof fileOrContent === 'string') {
      base64Content = btoa(unescape(encodeURIComponent(fileOrContent)));
    } else {
      throw new Error('Định dạng nội dung file không hợp lệ');
    }

    const cleanPath = filePath.split('/').map(encodeURIComponent).join('/');
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${cleanPath}`;

    // Kiểm tra xem file đã tồn tại trên repo chưa (nếu có thì lấy sha để ghi đè cập nhật)
    let sha = null;
    try {
      const checkFile = await fetch(url, { headers: this.getHeaders() });
      if (checkFile.ok) {
        const existingData = await checkFile.json();
        sha = existingData.sha;
      }
    } catch (e) {
      // Bỏ qua lỗi check
    }

    const payload = {
      message: commitMessage,
      content: base64Content
    };
    if (sha) {
      payload.sha = sha;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let msg = err.message || `Lỗi khi tải file ${filePath} (${res.status})`;
      if (res.status === 403 || res.status === 404) {
        msg = `Token không có quyền ghi/đẩy file vào repository. Cần cấp quyền "repo" (Classic) hoặc "Contents: Read and write" (Fine-grained).`;
      }
      throw new Error(msg);
    }

    return await res.json();
  }

  /**
   * Lấy commit mới nhất trên nhánh mặc định
   */
  async getDefaultBranchRef(owner, repo, branch = 'main') {
    let res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
      headers: this.getHeaders()
    });

    if (!res.ok && branch === 'main') {
      res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/ref/heads/master`, {
        headers: this.getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return { branch: 'master', data };
      }
    }

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return { branch, data };
  }

  /**
   * Đẩy danh sách file lên Repository
   * Tự động nhận diện:
   * - Nếu repo rỗng: dùng Contents API khởi tạo trực tiếp, không phụ thuộc auto_init
   * - Nếu 1 file: dùng Contents API siêu nhanh và chính xác
   * - Nếu nhiều file: tải tuần tự hoặc Git Database API
   */
  async uploadFilesCommit(owner, repo, files, commitMessage = 'Submit homework', onProgress = () => {}) {
    if (!files || files.length === 0) {
      return null;
    }

    const totalFiles = files.length;

    // Kiểm tra xem repo đã có commit/nhánh nào chưa
    const branchInfo = await this.getDefaultBranchRef(owner, repo, 'main');

    // Nếu repo hoàn toàn rỗng (auto_init: false) hoặc chỉ có 1 file:
    // Dùng Contents API để khởi tạo repo an toàn tuyệt đối
    if (!branchInfo || totalFiles === 1) {
      for (let i = 0; i < totalFiles; i++) {
        const item = files[i];
        onProgress({
          step: 'blobs',
          current: i + 1,
          total: totalFiles,
          filename: item.path,
          percent: Math.round(((i + 1) / totalFiles) * 90)
        });

        await this.uploadSingleFileContents(
          owner,
          repo,
          item.path,
          item.file || item.content,
          commitMessage
        );
      }

      onProgress({
        step: 'done',
        current: totalFiles,
        total: totalFiles,
        filename: 'Hoàn tất!',
        percent: 100
      });

      return { status: 'success' };
    }

    // Nếu repo đã có sẵn commit và có nhiều file:
    // Dùng Git Database API tạo 1 commit gộp
    const treeItems = [];

    for (let i = 0; i < totalFiles; i++) {
      const item = files[i];
      onProgress({
        step: 'blobs',
        current: i + 1,
        total: totalFiles,
        filename: item.path,
        percent: Math.round(((i + 1) / totalFiles) * 70)
      });

      let base64Content = '';
      if (item.file instanceof File || item.file instanceof Blob) {
        base64Content = await this.readFileAsBase64(item.file);
      } else if (typeof item.content === 'string') {
        base64Content = btoa(unescape(encodeURIComponent(item.content)));
      } else {
        continue;
      }

      // Tạo blob
      const blobRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: base64Content, encoding: 'base64' })
      });

      if (!blobRes.ok) {
        // Fallback qua uploadSingleFileContents nếu lỗi blob
        await this.uploadSingleFileContents(owner, repo, item.path, item.file || item.content, commitMessage);
        continue;
      }

      const blobData = await blobRes.json();
      treeItems.push({
        path: item.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha
      });
    }

    if (treeItems.length === 0) return null;

    onProgress({
      step: 'tree',
      current: totalFiles,
      total: totalFiles,
      filename: 'Đang tạo Git Tree...',
      percent: 75
    });

    const activeBranch = branchInfo.branch;
    const parentCommitSha = branchInfo.data.object.sha;

    let baseTreeSha = null;
    const commitRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/commits/${parentCommitSha}`, {
      headers: this.getHeaders()
    });
    if (commitRes.ok) {
      const commitData = await commitRes.json();
      baseTreeSha = commitData.tree.sha;
    }

    const treePayload = { tree: treeItems };
    if (baseTreeSha) treePayload.base_tree = baseTreeSha;

    const treeRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(treePayload)
    });

    if (!treeRes.ok) {
      const err = await treeRes.json().catch(() => ({}));
      throw new Error(err.message || 'Lỗi khi tạo Git Tree');
    }

    const treeData = await treeRes.json();

    onProgress({
      step: 'commit',
      current: totalFiles,
      total: totalFiles,
      filename: 'Đang tạo Git Commit...',
      percent: 88
    });

    const newCommitRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: commitMessage,
        tree: treeData.sha,
        parents: [parentCommitSha]
      })
    });

    if (!newCommitRes.ok) {
      const err = await newCommitRes.json().catch(() => ({}));
      throw new Error(err.message || 'Lỗi khi tạo Commit');
    }

    const newCommit = await newCommitRes.json();

    onProgress({
      step: 'push',
      current: totalFiles,
      total: totalFiles,
      filename: `Đang cập nhật nhánh ${activeBranch}...`,
      percent: 96
    });

    await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${activeBranch}`, {
      method: 'PATCH',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommit.sha, force: true })
    });

    onProgress({
      step: 'done',
      current: totalFiles,
      total: totalFiles,
      filename: 'Hoàn tất thành công!',
      percent: 100
    });

    return newCommit;
  }
}

window.GitHubClient = GitHubClient;
