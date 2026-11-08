export const CURRENT_APP_VERSION = '1.0.3';
export const GITHUB_REPO_OWNER = 'KhoaTeHD';
export const GITHUB_REPO_NAME = 'KNBoard';

export interface ReleaseUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl: string;
  htmlUrl: string;
  isTauriNativeUpdate: boolean;
}

/**
 * Compares two semantic version strings (e.g., "1.0.2" vs "1.0.0").
 * Returns 1 if vA > vB, -1 if vA < vB, 0 if equal.
 */
export function compareSemver(vA: string, vB: string): number {
  const cleanA = vA.replace(/^v/i, '').trim().split('.').map((n) => parseInt(n, 10) || 0);
  const cleanB = vB.replace(/^v/i, '').trim().split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(cleanA.length, cleanB.length);
  for (let i = 0; i < len; i++) {
    const a = cleanA[i] ?? 0;
    const b = cleanB[i] ?? 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

/**
 * Detects whether the app is currently running inside the Tauri Native Desktop shell
 */
export function isRunningInTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Checks for updates via:
 * 1. Tauri v2 Native Updater plugin (when installed as Desktop .exe/.msi)
 * 2. GitHub Releases API (https://api.github.com/repos/KhoaTeHD/KNBoard/releases/latest)
 */
export async function checkAppUpdate(): Promise<ReleaseUpdateInfo> {
  // 1. Try Tauri v2 Native OTA Updater first if running in Tauri Desktop shell
  if (isRunningInTauri()) {
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update && update.available) {
        return {
          hasUpdate: true,
          currentVersion: update.currentVersion || CURRENT_APP_VERSION,
          latestVersion: update.version,
          releaseTitle: `Phiên bản mới v${update.version}`,
          releaseNotes:
            update.body ||
            'Cập nhật cải thiện hiệu năng, bổ sung tính năng bảng vẽ Toán 2D/3D và tối ưu bút XP-Pen.',
          publishedAt: update.date || new Date().toISOString(),
          downloadUrl: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`,
          htmlUrl: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`,
          isTauriNativeUpdate: true,
        };
      }
    } catch {
      // Fallback to GitHub Releases API check below
    }
  }

  // 2. Query GitHub Releases REST API directly
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;
  const res = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (res.status === 404) {
    // No release published on GitHub yet
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      releaseTitle: `Phiên bản hiện tại v${CURRENT_APP_VERSION} là mới nhất`,
      releaseNotes: 'Hiện chưa có bản phát hành mới hơn trên GitHub Releases.',
      publishedAt: new Date().toISOString(),
      downloadUrl: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`,
      htmlUrl: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`,
      isTauriNativeUpdate: false,
    };
  }

  if (!res.ok) {
    throw new Error(`Không thể kết nối GitHub Releases (HTTP ${res.status})`);
  }

  const data = await res.json();
  const latestTag = (data.tag_name || CURRENT_APP_VERSION).replace(/^v/i, '');
  const hasNewer = compareSemver(latestTag, CURRENT_APP_VERSION) > 0;

  // Find Windows installer asset (.msi or .exe) if attached to the GitHub Release
  const assets: { name: string; browser_download_url: string }[] = data.assets || [];
  const winInstaller = assets.find(
    (a) => a.name.endsWith('.exe') || a.name.endsWith('.msi')
  );

  return {
    hasUpdate: hasNewer,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: latestTag,
    releaseTitle: data.name || `KNBoard v${latestTag}`,
    releaseNotes:
      data.body || 'Bản cập nhật mới từ kho lưu trữ chính thức KhoaTeHD/KNBoard.',
    publishedAt: data.published_at || new Date().toISOString(),
    downloadUrl:
      winInstaller?.browser_download_url ||
      data.html_url ||
      `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`,
    htmlUrl:
      data.html_url ||
      `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`,
    isTauriNativeUpdate: false,
  };
}

/**
 * Triggers Tauri v2 Native In-Place Download, Installation & Automatic App Restart!
 */
export async function performTauriNativeUpdate(
  onProgress?: (downloadedBytes: number, totalBytes: number) => void
): Promise<boolean> {
  if (!isRunningInTauri()) return false;
  const { check } = await import('@tauri-apps/plugin-updater');
  const { relaunch } = await import('@tauri-apps/plugin-process');

  const update = await check();
  if (!update || !update.available) return false;

  let downloaded = 0;
  let contentLength = 0;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength || 0;
        break;
      case 'Progress':
        downloaded += event.data.chunkLength;
        if (onProgress) onProgress(downloaded, contentLength);
        break;
      case 'Finished':
        break;
    }
  });

  await relaunch();
  return true;
}
