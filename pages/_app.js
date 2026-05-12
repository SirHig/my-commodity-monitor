import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta name="theme-color" content="#0f0f11" />
        <title>Commodity Monitor</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
