import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EnviroVitals — community CKM health",
    short_name: "EnviroVitals",
    description: "Community CKM prevalence, local air and drinking-water context, and practical household actions.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f4ef",
    theme_color: "#173c32",
    categories: ["health", "medical", "lifestyle", "utilities"],
    lang: "en-US",
    dir: "ltr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
