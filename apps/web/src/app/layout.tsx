import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Homy — Gestion du foyer",
	description: "Gérez vos courses, dépenses partagées et factures en un seul endroit.",
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "Homy",
	},
	icons: {
		icon: "/icon.svg",
		apple: "/icon.svg",
	},
	other: {
		"mobile-web-app-capable": "yes",
	},
};

export const viewport: Viewport = {
	themeColor: "#2563eb",
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="fr">
			<head>
				{/* iOS PWA */}
				<link rel="apple-touch-icon" href="/icon.svg" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="Homy" />
				{/* Android PWA */}
				<meta name="mobile-web-app-capable" content="yes" />
				<link rel="manifest" href="/manifest.json" />
				<link rel="icon" href="/icon.svg" type="image/svg+xml" />
			</head>
			<body className={inter.className}>
				<Providers>{children}</Providers>
				{/* Enregistrement du Service Worker */}
				<script
					dangerouslySetInnerHTML={{
						__html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('SW registered:', reg.scope); })
                    .catch(function(err) { console.log('SW error:', err); });
                });
              }
            `,
					}}
				/>
			</body>
		</html>
	);
}
