function withValidProperties(
  properties: Record<string, undefined | string | string[]>,
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return !!value;
    }),
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL;

  return Response.json({
    accountAssociation: {
      header: process.env.FARCASTER_HEADER,
      payload: process.env.FARCASTER_PAYLOAD,
      signature: process.env.FARCASTER_SIGNATURE,
    },
    frame: withValidProperties({
      name: "anime app",
      version: "1",
      iconUrl: "https://https://anime-mini-app.vercel.app//icon.png",
      homeUrl: "https://https://anime-mini-app.vercel.app/",
      imageUrl: "https://https://anime-mini-app.vercel.app//image.png",
      splashImageUrl: "https://https://anime-mini-app.vercel.app//splash.png",
      splashBackgroundColor: "#00ba00",
      webhookUrl: "https://https://anime-mini-app.vercel.app//api/webhook",
      subtitle: "Are you an otaku?",
      description: "Are you an otaku?",
      primaryCategory: "games",
      screenshotUrls: [],
      tags: [],
      heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
      tagline: process.env.NEXT_PUBLIC_APP_TAGLINE,
      ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE,
      ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
      ogImageUrl: process.env.NEXT_PUBLIC_APP_OG_IMAGE,
    }),
  });
}
