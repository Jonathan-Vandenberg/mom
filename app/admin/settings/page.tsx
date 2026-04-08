import { getSiteSettings } from "@/lib/settings";
import { updateSettings } from "@/actions/settings";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <div className="mb-10">
        <p className="text-xs tracking-[0.25em] uppercase mb-2 text-stone-400">
          Configure
        </p>
        <h1
          className="text-4xl font-light text-stone-900"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Site Settings
        </h1>
      </div>
      <SettingsForm settings={settings} action={updateSettings} />
    </div>
  );
}
