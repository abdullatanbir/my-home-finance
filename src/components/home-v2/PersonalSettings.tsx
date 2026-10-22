import { useState } from "react";
const key = "mhf-home-v2-personal-settings";
type Preferences = { name: string; reminders: boolean };
function read(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    return {
      name: typeof saved?.name === "string" ? saved.name : "",
      reminders: saved?.reminders === true,
    };
  } catch {
    return { name: "", reminders: false };
  }
}
export default function PersonalSettings() {
  const [prefs, setPrefs] = useState(read),
    [message, setMessage] = useState("");
  return (
    <section className="bc-card">
      <h2>Profile & notifications</h2>
      <p>
        Personal settings stay on this device. No online account or notification
        service is connected.
      </p>
      <form
        className="bc-form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            localStorage.setItem(key, JSON.stringify(prefs));
            setMessage("Personal preferences saved on this device.");
          } catch {
            setMessage(
              "Preferences could not be saved. Check browser storage availability.",
            );
          }
        }}
      >
        <label className="bc-field">
          Profile display name
          <input
            maxLength={80}
            value={prefs.name}
            onChange={(e) => setPrefs({ ...prefs, name: e.target.value })}
          />
        </label>
        <label className="bc-field">
          Notification preferences
          <select
            value={prefs.reminders ? "on" : "off"}
            onChange={(e) =>
              setPrefs({ ...prefs, reminders: e.target.value === "on" })
            }
          >
            <option value="off">Off</option>
            <option value="on">On (device preference only)</option>
          </select>
          <small>
            This stores your preference only. Push and background notifications
            are unavailable.
          </small>
        </label>
        <button type="submit">Save personal preferences</button>
      </form>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
