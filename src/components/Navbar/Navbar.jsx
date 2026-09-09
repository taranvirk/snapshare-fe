import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import {
  BellIcon as BellSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
  HomeIcon as HomeSolid,
  MagnifyingGlassIcon as SearchSolid,
  UserCircleIcon as UserSolid,
} from "@heroicons/react/24/solid";
import { useAuth, supabase } from "../../auth/Auth";
import Avatar from "../Avatar/Avatar";

const navigation = [
  { to: "/", label: "Home", icon: HomeIcon, activeIcon: HomeSolid, end: true },
  { to: "/explore", label: "Explore", icon: MagnifyingGlassIcon, activeIcon: SearchSolid },
  { to: "/direct-message", label: "Messages", icon: ChatBubbleLeftRightIcon, activeIcon: ChatSolid },
  { to: "/notifications", label: "Activity", icon: BellIcon, activeIcon: BellSolid },
  { to: "/profile", label: "Profile", icon: UserCircleIcon, activeIcon: UserSolid },
];

const routeTitles = {
  "/": "Home",
  "/search": "Discover",
  "/explore": "Explore",
  "/direct-message": "Messages",
  "/notifications": "Activity",
  "/create-post": "New post",
  "/profile": "Profile",
  "/settings": "Settings",
};

export default function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("public_profiles")
      .select("username, profile_picture_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => active && setProfile(data));
    return () => { active = false; };
  }, [user.id]);

  const title = routeTitles[location.pathname] || (location.pathname.startsWith("/post/") ? "Post" : "Profile");

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out successfully.");
    } catch (error) {
      console.error("Unable to sign out:", error);
      toast.error("Couldn't sign you out. Please try again.");
      setSigningOut(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <Link className="brand-lockup" to="/" aria-label="Snapshare home">
          <span className="brand-mark">S</span>
          <span>snapshare</span>
        </Link>
        <span className="mobile-header__title">{title}</span>
        <Link className="icon-button" to="/create-post" aria-label="Create a post"><PlusIcon /></Link>
      </header>

      <aside className="sidebar">
        <Link className="brand-lockup" to="/" aria-label="Snapshare home">
          <span className="brand-mark">S</span>
          <span>snapshare</span>
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon, activeIcon: ActiveIcon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`}>
              {({ isActive }) => (
                <>
                  {isActive ? <ActiveIcon /> : <Icon />}
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <Link className="create-button" to="/create-post"><PlusIcon /><span>Create post</span></Link>

        <div className="sidebar-profile">
          <Link to="/profile" className="sidebar-profile__user">
            <Avatar src={profile?.profile_picture_url} name={profile?.username || user.email} size="sm" />
            <span>
              <strong>{profile?.username || "Complete profile"}</strong>
              <small>{user.email}</small>
            </span>
          </Link>
          <button className="sidebar-signout" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navigation.map(({ to, label, icon: Icon, activeIcon: ActiveIcon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`}>
            {({ isActive }) => (
              <>
                {isActive ? <ActiveIcon /> : <Icon />}
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="app-content"><Outlet /></div>
    </div>
  );
}
