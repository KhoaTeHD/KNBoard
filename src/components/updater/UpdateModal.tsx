import React, { useEffect, useState } from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  RefreshCw,
  X,
  ExternalLink,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  CURRENT_APP_VERSION,
  ReleaseUpdateInfo,
  checkAppUpdate,
  performTauriNativeUpdate,
} from '../../core/autoUpdater';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUpdateInfo: ReleaseUpdateInfo | null;
  onUpdateInfoChanged: (info: ReleaseUpdateInfo) => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  initialUpdateInfo,
  onUpdateInfoChanged,
}) => {
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<ReleaseUpdateInfo | null>(
    initialUpdateInfo
  );

  useEffect(() => {
    setUpdateInfo(initialUpdateInfo);
  }, [initialUpdateInfo]);

  const handleManualCheck = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const info = await checkAppUpdate();
      setUpdateInfo(info);
      onUpdateInfoChanged(info);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Không thể kiểm tra cập nhật lúc này.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !updateInfo) {
      handleManualCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallUpdate = async () => {
    if (!updateInfo) return;
    if (updateInfo.isTauriNativeUpdate) {
      setInstalling(true);
      setErrorMsg(null);
      try {
        await performTauriNativeUpdate((downloaded, total) => {
          if (total > 0) {
            setProgressPct(Math.min(100, Math.round((downloaded / total) * 100)));
          }
        });
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Lỗi khi tải bản cập nhật tự động. Đang mở trang tải trực tiếp...'
        );
        window.open(updateInfo.downloadUrl, '_blank', 'noopener,noreferrer');
      } finally {
        setInstalling(false);
      }
    } else {
      window.open(updateInfo.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px]">
      <div className="w-[460px] rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <DownloadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cập Nhật Phần Mềm KNBoard
              </h3>
              <p className="text-[11px] text-slate-500">
                Phiên bản đang dùng: <b>v{CURRENT_APP_VERSION}</b> • GitHub: KhoaTeHD/KNBoard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-3">
          {loading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-600">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
              <span className="text-xs font-medium">
                Đang kiểm tra phiên bản mới nhất trên GitHub Releases...
              </span>
            </div>
          ) : errorMsg ? (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Không thể kết nối máy chủ cập nhật</div>
                <div className="mt-0.5">{errorMsg}</div>
              </div>
            </div>
          ) : updateInfo?.hasUpdate ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-blue-950">
                      Đã có bản cập nhật mới: v{updateInfo.latestVersion}!
                    </div>
                    <div className="text-[11px] text-blue-700">
                      {updateInfo.releaseTitle}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                  MỚI
                </span>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 max-h-40 overflow-y-auto">
                <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Nội dung cập nhật:
                </div>
                <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {updateInfo.releaseNotes}
                </div>
              </div>

              {installing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-blue-700">
                    <span>Đang tải và cài đặt bản cập nhật...</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-200"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  Bạn đang sử dụng phiên bản mới nhất (v{CURRENT_APP_VERSION})
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Mỗi khi có bản phát hành mới trên GitHub, phần mềm sẽ tự động thông báo và cập nhật tại đây.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={handleManualCheck}
            disabled={loading || installing}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Kiểm tra lại</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/KhoaTeHD/KNBoard/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1 transition"
            >
              <span>GitHub Releases</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {updateInfo?.hasUpdate ? (
              <button
                onClick={handleInstallUpdate}
                disabled={installing}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>
                  {installing ? 'Đang cập nhật...' : 'Cập nhật ngay'}
                </span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
