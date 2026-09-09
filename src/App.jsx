import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./auth/Auth";
import Navbar from "./components/Navbar/Navbar";
import Login from "./pages/Login/Login";
import Loader from "./components/Loader/Loader";
import "./App.css";

const Home = lazy(() => import("./pages/Home/Home"));
const CreatePost = lazy(() => import("./pages/Create/CreatePost/CreatePost"));
const DirectMessage = lazy(() => import("./pages/DirectMessage/DirectMessage"));
const ErrorPage = lazy(() => import("./pages/Error/ErrorPage"));
const Explore = lazy(() => import("./pages/Explore/Explore"));
const Notifications = lazy(() => import("./pages/Notifications/Notifications"));
const PostPage = lazy(() => import("./pages/Post/PostPage"));
const Content = lazy(() => import("./pages/Profile/Content/Content"));
const Settings = lazy(() => import("./pages/Profile/Settings/Settings"));
const UserProfile = lazy(() => import("./pages/Profile/UserProfile/UserProfile"));
const Search = lazy(() => import("./pages/Search/Search"));

function App() {
  const { user } = useAuth();

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#171a1f",
            color: "#f7f5f2",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: "14px",
          },
        }}
      />
      {user ? (
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route element={<Navbar />}>
              <Route index element={<Home />} />
              <Route path="create-post" element={<CreatePost />} />
              <Route path="profile" element={<Content />} />
              <Route path="settings" element={<Settings />} />
              <Route path="search" element={<Search />} />
              <Route path="explore" element={<Explore />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="direct-message" element={<DirectMessage />} />
              <Route path="post/:postId" element={<PostPage />} />
              <Route path=":username" element={<UserProfile />} />
              <Route path="*" element={<ErrorPage />} />
            </Route>
          </Routes>
        </Suspense>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </>
  );
}

export default App;
