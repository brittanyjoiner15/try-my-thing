// Round profile photo, or the first letter of the name on PostHog orange when there's no photo.
// No hooks, so it renders on the server or inside the client swipe deck.
/* eslint-disable @next/next/no-img-element -- Supabase Storage URL or data URL (demo) */

export default function Avatar({ name, url, size = "h-10 w-10 text-lg" }) {
  if (url) return <img src={url} alt="" draggable={false} className={`${size} shrink-0 rounded-full object-cover`} />;
  return (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-full bg-accent font-black text-white`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
