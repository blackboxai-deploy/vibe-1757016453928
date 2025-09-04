import './globals.css';

export const metadata = {
  title: 'Medical Imaging Analysis - Radiologist AI Diagnostic Tool',
  description: 'Professional radiologist platform for AI-powered medical image analysis supporting DICOM files and bulk processing with Claude Sonnet 4',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased font-sans">
        <div className="min-h-full">
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}