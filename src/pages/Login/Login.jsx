import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { BoltIcon, CameraIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../auth/Auth";

const features = [
  { icon: CameraIcon, title: "Share the real moments", text: "Photos, clips, and the stories behind them." },
  { icon: UserGroupIcon, title: "Your people, closer", text: "A calm feed built around the people you choose." },
  { icon: BoltIcon, title: "Start a conversation", text: "Move from a post to a private chat in one tap." },
];

export default function Login() {
  return (
    <main className="login-page">
      <div className="login-glow login-glow--one" />
      <div className="login-glow login-glow--two" />

      <section className="login-story">
        <div>
          <div className="brand-lockup brand-lockup--large"><span className="brand-mark">S</span><span>snapshare</span></div>
          <p className="eyebrow">Your favorite people, in focus.</p>
          <h1>Small moments.<br /><em>Worth sharing.</em></h1>
          <p className="login-story__intro">A more personal place to post what matters, keep up with friends, and turn everyday snapshots into shared memories.</p>
        </div>

        <div className="login-features">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <span><Icon /></span>
              <div><strong>{title}</strong><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card__heading">
            <span className="login-card__badge">Welcome back</span>
            <h2>Sign in to Snapshare</h2>
            <p>Your feed is right where you left it.</p>
          </div>
          <Auth
            supabaseClient={supabase}
            providers={["google", "discord"]}
            redirectTo={`${window.location.origin}/`}
            socialLayout="horizontal"
            appearance={{
              theme: ThemeSupa,
              className: {
                container: "auth-container",
                button: "auth-button",
                input: "auth-input",
                label: "auth-label",
                anchor: "auth-link",
                divider: "auth-divider",
              },
              variables: {
                default: {
                  colors: {
                    brand: "#8e7dff",
                    brandAccent: "#a397ff",
                    brandButtonText: "#0d0f12",
                    inputBackground: "#111419",
                    inputText: "#f7f5f2",
                    inputBorder: "rgba(255,255,255,.12)",
                    inputBorderHover: "rgba(177,167,255,.6)",
                    inputBorderFocus: "#8e7dff",
                    inputLabelText: "#c8ccd2",
                    defaultButtonBackground: "#1b1f25",
                    defaultButtonBackgroundHover: "#242931",
                    defaultButtonBorder: "rgba(255,255,255,.1)",
                    defaultButtonText: "#f7f5f2",
                    dividerBackground: "rgba(255,255,255,.1)",
                    messageText: "#ff8d98",
                    messageBackground: "rgba(255,107,122,.08)",
                    messageBorder: "rgba(255,107,122,.2)",
                  },
                  radii: { borderRadiusButton: "12px", inputBorderRadius: "12px" },
                },
              },
            }}
          />
          <p className="login-card__terms">By continuing, you agree to keep Snapshare kind, human, and worth opening.</p>
        </div>
      </section>
    </main>
  );
}
