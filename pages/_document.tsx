import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="description" content="Aaron's Personal Operating System - AI-powered productivity dashboard" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Personal OS" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
