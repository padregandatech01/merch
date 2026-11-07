import type { Metadata } from "next";
import "./globals.css";
import "./portal-styles.css";
export const metadata:Metadata={
 title:"Loxada | Merchandise",
 description:"Merchandise department account portal",
 robots:{index:false,follow:false}
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
 return <html lang="en"><body>{children}</body></html>;
}
