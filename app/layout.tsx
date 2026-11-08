import type { Metadata } from "next";
import "./globals.css";
import "./portal-styles.css";
import "./store-accounts.css";
import "./admin/workspace.css";
import "./supplier-relationship.css";
export const metadata:Metadata={
 title:"Loxada | Merchandise",
 description:"Merchandise department account portal",
 robots:{index:false,follow:false}
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
 return <html lang="en"><body>{children}</body></html>;
}
