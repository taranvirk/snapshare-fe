import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellIcon, HeartIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useAuth, supabase } from "../../auth/Auth";
import Avatar from "../../components/Avatar/Avatar";
import EmptyState from "../../components/EmptyState/EmptyState";

export default function Notifications() {
  const { user } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadActivity() {
      const { data: relationships } = await supabase.from("followers").select("follower_id").eq("following_id", user.id);
      const ids = relationships?.map((item) => item.follower_id) ?? [];
      if (!ids.length) { if (active) setLoading(false); return; }
      const { data } = await supabase.from("public_profiles").select("user_id, username, profile_picture_url").in("user_id", ids);
      if (active) { setFollowers(data ?? []); setLoading(false); }
    }
    loadActivity();
    return () => { active = false; };
  }, [user.id]);

  return (
    <main className="page page--narrow">
      <header className="page-heading"><div><span className="eyebrow">What’s happening</span><h1>Activity</h1><p>New people and moments connected to you.</p></div></header>
      <section className="activity-card">
        <div className="activity-card__title"><span><BellIcon /></span><div><h2>Recent activity</h2><p>Your newest updates live here.</p></div></div>
        {loading ? <div className="discovery-loading"><span className="spinner" />Checking for updates</div> : followers.length ? followers.map((profile) => (
          <Link className="activity-item" to={`/${profile.username}`} key={profile.user_id}><span className="activity-item__icon"><UserPlusIcon /></span><Avatar src={profile.profile_picture_url} name={profile.username} size="sm" /><span><strong>{profile.username}</strong> started following you.<small>Visit their profile and say hello.</small></span><span className="activity-item__arrow">→</span></Link>
        )) : <EmptyState icon={<HeartIcon />} title="Quiet for now" body="New follows and other activity will show up here." />}
      </section>
    </main>
  );
}
