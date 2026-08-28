import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PRODUCT } from "@/config/product";
import { Providers } from "./providers";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${PRODUCT.name} — ${PRODUCT.tagline}`, template: `%s · ${PRODUCT.name}` },
  description: PRODUCT.summary,
  applicationName: PRODUCT.name,
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

// Some injected wallets still race to install the legacy `window.ethereum`
// singleton. When a second extension attempts to redefine a non-configurable
// provider, Chrome emits an uncaught extension error even though the EIP-6963
// providers remain usable. Catch only that known extension-originated collision
// before Next's development overlay sees it; every application error still
// propagates normally.
const walletProviderCollisionGuard = `
window.addEventListener("error",function(event){
  var message=String(event.message||"");
  var source=String(event.filename||"");
  if(message.includes("Cannot redefine property: ethereum")&&/^(chrome|moz)-extension:\\/\\//.test(source)){
    event.preventDefault();
    event.stopImmediatePropagation();
  }
},true);
`;

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: walletProviderCollisionGuard }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
