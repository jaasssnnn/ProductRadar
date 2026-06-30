import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'ProductRadar',
  description: 'B2B SaaS product analytics & churn risk detection',
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
