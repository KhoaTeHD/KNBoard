using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace KNBoardDesktop
{
    internal static class Program
    {
        [STAThread]
        static void Main()
        {
            ApplicationConfiguration.Initialize();
            Application.Run(new MainForm());
        }
    }

    public class MainForm : Form
    {
        private readonly WebView2 webView;

        public MainForm()
        {
            Text = "KNBoard v1.0.0 — Soạn Đề Thi, Bảng Vẽ Toán 2D/3D & Giảng Dạy XP-Pen";
            Width = 1440;
            Height = 900;
            MinimumSize = new Size(1024, 680);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(241, 245, 249);

            string icoPath = Path.Combine(AppContext.BaseDirectory, "icon.ico");
            if (File.Exists(icoPath))
            {
                Icon = new Icon(icoPath);
            }

            webView = new WebView2
            {
                Dock = DockStyle.Fill
            };
            Controls.Add(webView);

            Load += async (_, _) => await InitializeAsync();
        }

        private async System.Threading.Tasks.Task InitializeAsync()
        {
            string userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "KNBoard"
            );
            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await webView.EnsureCoreWebView2Async(env);

            // Configure optimal settings for low-end laptops and XP-Pen stylus responsiveness
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            webView.CoreWebView2.Settings.IsZoomControlEnabled = true;

            string wwwroot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            if (!Directory.Exists(wwwroot))
            {
                // Fallback when running from repo root
                wwwroot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "dist"));
            }

            // Map virtual host https://knboard.local to local dist/ directory (0 network latency!)
            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "knboard.local",
                wwwroot,
                CoreWebView2HostResourceAccessKind.Allow
            );

            // Open external links (such as GitHub Release downloads) in the default system browser
            webView.CoreWebView2.NewWindowRequested += (sender, args) =>
            {
                args.Handled = true;
                try
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = args.Uri,
                        UseShellExecute = true
                    });
                }
                catch { }
            };

            webView.CoreWebView2.Navigate("https://knboard.local/index.html");
        }
    }
}
