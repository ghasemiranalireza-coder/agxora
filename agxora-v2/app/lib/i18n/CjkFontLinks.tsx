import type { JSX } from "react";

/**
 * Loads actual CJK glyph families. next/font Noto SC/JP/TC/KR only expose
 * latin/cyrillic/vietnamese subsets, so system + Google Fonts CSS2 is required
 * for zh-CN, zh-TW, ja, and ko.
 */
export function CjkFontLinks(): JSX.Element {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      {/* App Router has no pages/_document; root layout loads these faces. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;600;700&display=swap"
      />
    </>
  );
}
