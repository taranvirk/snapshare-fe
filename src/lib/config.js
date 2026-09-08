export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

export const DEFAULT_PROFILE = {
  username: "New member",
  user_bio: "",
  website: "",
  profile_picture_url: "",
};
