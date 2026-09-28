import type { MetadataProps } from "@/types/seo";

export function MetaTags({ metadata }: { metadata: MetadataProps }) {
  return (
    <>
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      <meta name="keywords" content={metadata.keywords.join(", ")} />
      <link rel="canonical" href={metadata.canonical} />
      <meta property="og:title" content={metadata.ogTitle} />
      <meta property="og:description" content={metadata.ogDescription} />
      <meta property="og:image" content={metadata.ogImage} />
      <meta property="og:type" content={metadata.ogType} />
      <meta property="og:url" content={metadata.ogUrl} />
      <meta name="twitter:card" content={metadata.twitterCard} />
      <meta name="twitter:title" content={metadata.twitterTitle} />
      <meta name="twitter:description" content={metadata.twitterDescription} />
      <meta name="twitter:image" content={metadata.twitterImage} />
      {metadata.publishedTime && <meta property="article:published_time" content={metadata.publishedTime} />}
      {metadata.modifiedTime && <meta property="article:modified_time" content={metadata.modifiedTime} />}
      {metadata.author && <meta name="author" content={metadata.author} />}
    </>
  );
}

export function MetaHead(props: { metadata: MetadataProps }) {
  return <MetaTags {...props} />;
}
