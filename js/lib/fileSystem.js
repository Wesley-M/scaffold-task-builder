// ─── File System Service ─────────────────────────────────────────
// Uses the File System Access API (Chrome/Edge) to browse and edit project files.
// Falls back gracefully when the API is unavailable.

const FS_STORAGE_KEY = 'scaffold-ui-project-name';

class FileSystemService {
  constructor() {
    this._rootHandle = null;
    this._rootName = '';
    this._fileIndex = [];       // [{ path, name, ext, isDir, handle }]
    this._indexing = false;
    this._listeners = new Set();
  }

  /** Whether the File System Access API is available. */
  get supported() {
    return typeof window.showDirectoryPicker === 'function';
  }

  /** Whether a project root has been set. */
  get hasRoot() {
    return this._rootHandle !== null;
  }

  /** The project root directory name. */
  get rootName() {
    return this._rootName;
  }

  /** The full file index. */
  get files() {
    return this._fileIndex;
  }

  /** Subscribe to index changes. Returns unsubscribe fn. */
  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify() {
    for (const fn of this._listeners) {
      try { fn(this._fileIndex); } catch (e) { console.error('FS listener error:', e); }
    }
  }

  /**
   * Open a directory picker and set it as the project root.
   * Requests readwrite access so files can be saved in place.
   * @returns {Promise<boolean>} true if root was set
   */
  async setProjectRoot() {
    if (!this.supported) {
      alert('File browsing requires a Chromium-based browser (Chrome, Edge, Brave, Arc).');
      return false;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      this._rootHandle = handle;
      this._rootName = handle.name;
      localStorage.setItem(FS_STORAGE_KEY, handle.name);
      await this.reindex();
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
      if (e.name === 'SecurityError') {
        alert(
          'Chrome blocked access to this directory for security reasons.\n\n' +
          'Sensitive directories like your home folder, Desktop, or Documents root are restricted.\n\n' +
          'Please select a specific project folder instead (e.g. your repository root).'
        );
      } else {
        alert('Failed to open directory: ' + e.message);
      }
      console.error('Failed to set project root:', e);
      return false;
    }
  }

  /**
   * Reindex all files from the project root.
   */
  async reindex() {
    if (!this._rootHandle) return;
    this._indexing = true;
    this._fileIndex = [];

    const MAX_FILES = 20000;
    const MAX_DEPTH = 12;
    const SKIP = new Set([
      '.git', '.svn', '.hg',
      'node_modules', '.gradle', 'build', 'out', 'dist', 'target', 'bin', 'obj',
      '.next', '.nuxt', '.output', '.cache', '.parcel-cache', '.turbo',
      '.idea', '.vscode', '.vs', '.settings', '.project',
      '.DS_Store', 'Thumbs.db', '.Spotlight-V100', '.Trashes', '.fseventsd',
      '__pycache__', '.tox', '.mypy_cache', '.pytest_cache', '*.egg-info',
      'vendor', 'bower_components', '.terraform',
    ]);

    let fileCount = 0;
    let aborted = false;

    const walk = async (dirHandle, prefix, depth) => {
      if (aborted || depth > MAX_DEPTH) return;
      try {
        for await (const entry of dirHandle.values()) {
          if (aborted) return;
          if (SKIP.has(entry.name) || entry.name.startsWith('.Spotlight')) continue;
          const path = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.kind === 'directory') {
            this._fileIndex.push({ path, name: entry.name, ext: '', isDir: true, handle: entry });
            await walk(entry, path, depth + 1);
          } else {
            const ext = entry.name.includes('.') ? entry.name.split('.').pop().toLowerCase() : '';
            this._fileIndex.push({ path, name: entry.name, ext, isDir: false, handle: entry });
            fileCount++;
            if (fileCount >= MAX_FILES) {
              aborted = true;
              console.warn(`File index capped at ${MAX_FILES} files`);
              return;
            }
          }
        }
      } catch (e) {
        // Permission denied or other error on subdirectory — skip it
      }
    };

    await walk(this._rootHandle, '', 0);
    this._fileIndex.sort((a, b) => a.path.localeCompare(b.path));
    this._indexing = false;
    this._notify();
  }

  /**
   * Search files by query string.
   */
  search(query = '', { extensions = [], dirsOnly = false, filesOnly = false, limit = 100 } = {}) {
    const q = query.toLowerCase().trim();
    let results = this._fileIndex;

    if (dirsOnly) results = results.filter(f => f.isDir);
    if (filesOnly) results = results.filter(f => !f.isDir);
    if (extensions.length > 0) {
      results = results.filter(f => f.isDir || extensions.includes(f.ext || ''));
    }
    if (q) {
      results = results.filter(f => f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
    }

    return results.slice(0, limit);
  }

  /**
   * Get all .task files in the project.
   * @returns {Array} .task file entries sorted by path
   */
  getTaskFiles() {
    return this._fileIndex.filter(f => !f.isDir && f.ext === 'task');
  }

  /**
   * Check if a file exists at the given path.
   */
  fileExists(filePath) {
    if (!this.hasRoot || !filePath) return false;
    const staticPath = filePath.replace(/\$\{[^}]+\}/g, '');
    if (staticPath.includes('$')) return false;
    if (staticPath === filePath) {
      return this._fileIndex.some(f => f.path === filePath);
    }
    return true;
  }

  /**
   * Read a file's text content.
   * @param {string} filePath - Relative path from root
   * @returns {Promise<string|null>}
   */
  async readFile(filePath) {
    const entry = this._fileIndex.find(f => f.path === filePath && !f.isDir);
    if (!entry || !entry.handle) return null;
    try {
      const file = await entry.handle.getFile();
      return await file.text();
    } catch (e) {
      console.error(`Failed to read ${filePath}:`, e);
      return null;
    }
  }

  /**
   * Write text content to an existing file.
   * @param {string} filePath - Relative path from root
   * @param {string} content - Text content to write
   * @returns {Promise<boolean>} true if successful
   */
  async writeFile(filePath, content) {
    const entry = this._fileIndex.find(f => f.path === filePath && !f.isDir);
    if (!entry || !entry.handle) return false;
    try {
      const writable = await entry.handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (e) {
      console.error(`Failed to write ${filePath}:`, e);
      return false;
    }
  }

  /**
   * Create a new file in a directory.
   * @param {string} dirPath - Directory path relative to root ('' for root)
   * @param {string} fileName - The new file name
   * @param {string} content - File content
   * @returns {Promise<{path: string, handle: FileSystemFileHandle}|null>}
   */
  async createFile(dirPath, fileName, content = '') {
    if (!this._rootHandle) return null;
    try {
      let dirHandle = this._rootHandle;
      if (dirPath) {
        for (const segment of dirPath.split('/')) {
          dirHandle = await dirHandle.getDirectoryHandle(segment);
        }
      }
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      const path = dirPath ? `${dirPath}/${fileName}` : fileName;
      // Add to index
      const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
      const entry = { path, name: fileName, ext, isDir: false, handle: fileHandle };
      this._fileIndex.push(entry);
      this._fileIndex.sort((a, b) => a.path.localeCompare(b.path));
      this._notify();
      return { path, handle: fileHandle };
    } catch (e) {
      console.error(`Failed to create ${dirPath}/${fileName}:`, e);
      return null;
    }
  }

  /**
   * Disconnect from the project root.
   */
  disconnect() {
    this._rootHandle = null;
    this._rootName = '';
    this._fileIndex = [];
    localStorage.removeItem(FS_STORAGE_KEY);
    this._notify();
  }
}

export const fileSystem = new FileSystemService();
