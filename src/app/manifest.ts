import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EnviroVitals — One Health CKM dashboard",
    short_name: "EnviroVitals",
    description: "Live air, heat and water conditions, community CKM prevalence, and value-specific steps for patients and households.",
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
