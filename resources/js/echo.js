import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.Pusher = Pusher;

// Points at a Reverb server on a *different* backend than this one — this
// app never runs its own broadcaster, it only ever connects out to it as
// a client. Host/port/scheme come from .env (VITE_-prefixed so Vite
// exposes them to the browser bundle); fill those in with that other
// backend's actual Reverb connection details.
window.Echo = new Echo({
  broadcaster: "reverb",
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wssPort: 443,
  wsPath: "/ws",
  forceTLS: false,
  enabledTransports: ["wss", "ws"],
});

export function configBroadcast(event, channel, callback) {
  window.Echo.channel(channel).listen(event, callback);
}