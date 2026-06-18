import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'ChurnRadar',
  description: 'B2B SaaS churn risk detection',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
