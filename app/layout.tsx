import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = localFont({
	src: "./fonts/GeistVF.woff",
	variable: "--font-geist-sans",
	weight: "100 900",
});
const geistMono = localFont({
	src: "./fonts/GeistMonoVF.woff",
	variable: "--font-geist-mono",
	weight: "100 900",
});

export const metadata: Metadata = {
	title: "Find Tee Times in ATX in one place",
	description: "Search and compare available tee times across Austin-area golf courses, all in one place.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased bg-transparent min-h-screen`}
			>
				{children}
				<Toaster position="bottom-center" richColors />
			</body>
		</html>
	);
}
