import type { Metadata } from "next";
import { Montserrat, Noto_Sans_Lao } from "next/font/google";
import "./globals.css";

// ຟອນຄູ່ດຽວກັນກັບ ODG TMS: Montserrat ສຳລັບອັກສອນລາຕິນ + Noto Sans Lao ສຳລັບພາສາລາວ
const montserrat = Montserrat({
  variable: "--font-brand-sans",
  subsets: ["latin"],
  display: "swap",
});

const notoSansLao = Noto_Sans_Lao({
  variable: "--font-lao-sans",
  subsets: ["lao", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ODG IT",
    template: "%s · ODG IT",
  },
  description: "ລະບົບບໍລິຫານວຽກງານພະແນກໄອທີ — ticket, ໂປຣເຈັກ ແລະ ລາຍງານ",
};

/**
 * ອ່ານ theme ທີ່ຜູ້ໃຊ້ເລືອກໄວ້ກ່ອນ React ຈະ render ເພື່ອບໍ່ໃຫ້ໜ້າຈໍກະພິບ.
 */
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="lo"
      className={`${montserrat.variable} ${notoSansLao.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
