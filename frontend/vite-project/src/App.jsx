import { useEffect, useState } from "react";
import Auth from "./Auth";
import { apiRequest } from "./lib/api";
import "./App.css";

function getInitials(user) {
  const name = user?.displayName || user?.username || "Gather User";

  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatPostTime(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Recently";

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000),
  );

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

function Avatar({ initials, className = "", imageUrl = "" }) {
  if (imageUrl) {
    return (
      <img
        className={`avatar ${className}`}
        src={imageUrl}
        alt=""
        loading="lazy"
      />
    );
  }

  return (
    <div className={`avatar ${className}`} aria-label={initials}>
      {initials}
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [activeNav, setActiveNav] = useState("Home");
  const [feedMode, setFeedMode] = useState("For you");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [followBusyIds, setFollowBusyIds] = useState([]);
  const [followError, setFollowError] = useState("");

  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gather_bookmarks") || "[]");
    } catch {
      return [];
    }
  });

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [likingPostIds, setLikingPostIds] = useState([]);
  const [likeErrors, setLikeErrors] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentsOpenIds, setCommentsOpenIds] = useState([]);
  const [commentsLoadedPostIds, setCommentsLoadedPostIds] = useState([]);
  const [commentsLoadingIds, setCommentsLoadingIds] = useState([]);
  const [commentsSubmittingIds, setCommentsSubmittingIds] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentErrors, setCommentErrors] = useState({});
  const [openPostMenuId, setOpenPostMenuId] = useState("");
  const [deletingPostIds, setDeletingPostIds] = useState([]);
  const [deletePostErrors, setDeletePostErrors] = useState({});

  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postSubmitError, setPostSubmitError] = useState("");
  const [postSubmitSuccess, setPostSubmitSuccess] = useState("");
  const [posts, setPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationBusy, setNotificationBusy] = useState(false);

  // Messaging state
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [messageActionError, setMessageActionError] = useState("");

  const currentUserId =
    currentUser?.id || currentUser?._id || currentUser?.username || null;

  const followingIds = Array.isArray(currentUser?.following)
    ? currentUser.following.map((id) => String(id?._id || id))
    : [];

  const displayName =
    currentUser?.displayName || currentUser?.username || "Gather member";

  const username = currentUser?.username ? `@${currentUser.username}` : "";
  const initials = getInitials(currentUser);

  // Restore the existing authenticated session.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = sessionStorage.getItem("gather_token");

      if (!token) {
        setCheckingSession(false);
        return;
      }

      try {
        const data = await apiRequest("/users/me");
        const user = data?.user ?? data?.profile ?? data;

        if (
          !user ||
          typeof user !== "object" ||
          !(user.id || user._id || user.username)
        ) {
          throw new Error("Could not restore your account session.");
        }

        if (!cancelled) {
          setCurrentUser(user);
          setSessionError("");
        }
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem("gather_token");
          setCurrentUser(null);
          setSessionError(
            "Your previous session has expired. Please log in again.",
          );
        }
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);


  // Load the authenticated community feed and normalize backend fields for the UI.
  useEffect(() => {
    if (!currentUserId) {
      setPosts([]);
      return undefined;
    }

    let cancelled = false;

    async function loadFeed() {
      setFeedLoading(true);
      setFeedError("");

      try {
        const result = await apiRequest("/posts/feed");

        if (!Array.isArray(result?.posts)) {
          throw new Error("The server returned an unexpected feed response.");
        }

        const loadedPosts = result.posts.map((post) => {
          const author = post.createdBy || {};
          const authorId = author.id || author._id || post.createdBy;

          return {
            id: String(post.id || post._id || ""),
            authorId: authorId ? String(authorId) : "",
            name: author.displayName || author.username || "Gather member",
            username: author.username ? `@${author.username}` : "@member",
            initials: getInitials(author),
            profilePicture: author.profilePicture || "",
            time: formatPostTime(post.createdAt),
            caption: post.caption || "",
            image: post.imageUrl || "",
            likes: Number(post.likesCount) || 0,
            likedByMe: Boolean(post.likedByMe),
            commentsCount: Number(post.commentsCount) || 0,
          };
        }).filter((post) => post.id);

        if (!cancelled) {
          setPosts(loadedPosts);
        }
      } catch (error) {
        if (!cancelled) {
          setFeedError(error.message || "Couldn't load the feed. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setFeedLoading(false);
        }
      }
    }

    loadFeed();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, feedRefreshKey]);

  // Search members when Discover is open and the query has at least two characters.
  useEffect(() => {
    const query = searchQuery.trim();

    if (!currentUserId || activeNav !== "Discover" || query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");

      try {
        const result = await apiRequest(
          `/users/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );

        if (!Array.isArray(result?.users)) {
          throw new Error("The server returned an unexpected search response.");
        }

        if (!cancelled) {
          setSearchResults(result.users);
        }
      } catch (error) {
        if (!cancelled && error.name !== "AbortError") {
          setSearchResults([]);
          setSearchError(error.message || "Couldn't search members. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeNav, currentUserId, searchQuery]);

  // Load notifications when the Notifications screen is opened.
  useEffect(() => {
    if (!currentUserId || activeNav !== "Notifications") {
      return undefined;
    }

    let cancelled = false;

    async function loadNotifications() {
      setNotificationsLoading(true);
      setNotificationsError("");

      try {
        const result = await apiRequest("/notifications");

        if (!Array.isArray(result?.notifications)) {
          throw new Error(
            "The server returned an unexpected notifications response.",
          );
        }

        if (!cancelled) {
          setNotifications(result.notifications);
          setUnreadNotificationCount(Number(result.unreadCount) || 0);
        }
      } catch (error) {
        if (!cancelled) {
          setNotificationsError(
            error.message || "Couldn't load notifications. Please try again.",
          );
        }
      } finally {
        if (!cancelled) setNotificationsLoading(false);
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [activeNav, currentUserId]);

  async function markNotificationRead(notificationId) {
    const notification = notifications.find(
      (item) => String(item._id || item.id) === String(notificationId),
    );

    if (!notification || notification.isRead || notificationBusy) return;

    setNotificationBusy(true);
    setNotificationsError("");

    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: "PATCH",
      });

      setNotifications((items) =>
        items.map((item) =>
          String(item._id || item.id) === String(notificationId)
            ? { ...item, isRead: true }
            : item,
        ),
      );

      setUnreadNotificationCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setNotificationsError(
        error.message || "Couldn't mark this notification as read.",
      );
    } finally {
      setNotificationBusy(false);
    }
  }

  async function markAllNotificationsRead() {
    if (unreadNotificationCount === 0 || notificationBusy) return;

    setNotificationBusy(true);
    setNotificationsError("");

    try {
      await apiRequest("/notifications/read-all", {
        method: "PATCH",
      });

      setNotifications((items) =>
        items.map((item) => ({ ...item, isRead: true })),
      );

      setUnreadNotificationCount(0);
    } catch (error) {
      setNotificationsError(
        error.message || "Couldn't mark all notifications as read.",
      );
    } finally {
      setNotificationBusy(false);
    }
  }

  // Load conversations whenever the Messages screen is opened.
  useEffect(() => {
    if (!currentUserId || activeNav !== "Messages") {
      return undefined;
    }

    let cancelled = false;

    async function loadConversations() {
      setConversationsLoading(true);
      setConversationsError("");

      try {
        const result = await apiRequest("/messages/conversations");

        if (!Array.isArray(result?.conversations)) {
          throw new Error("Unexpected conversations response.");
        }

        if (!cancelled) {
          setConversations(result.conversations);
        }
      } catch (error) {
        if (!cancelled) {
          setConversationsError(
            error.message || "Couldn't load conversations.",
          );
        }
      } finally {
        if (!cancelled) setConversationsLoading(false);
      }
    }

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, [activeNav, currentUserId]);

  // Load messages when a conversation is selected.
  useEffect(() => {
    if (!currentUserId || !selectedConversationId) {
      return undefined;
    }

    let cancelled = false;

    async function loadMessages() {
      setMessagesLoading(true);
      setMessagesError("");

      try {
        const result = await apiRequest(
          `/messages/conversations/${selectedConversationId}/messages`,
        );

        if (!Array.isArray(result?.messages)) {
          throw new Error("Unexpected messages response.");
        }

        if (!cancelled) setMessages(result.messages);
      } catch (error) {
        if (!cancelled) {
          setMessagesError(error.message || "Couldn't load messages.");
        }
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, selectedConversationId]);

  // Start a conversation with a member from Discover.
  async function startConversation(recipientId) {
    if (!recipientId) return;

    setMessageActionError("");

    try {
      const result = await apiRequest("/messages/conversations", {
        method: "POST",
        body: JSON.stringify({ recipientId }),
      });

      if (!result?.conversation?._id) {
        throw new Error("The server returned an unexpected conversation.");
      }

      const conversation = result.conversation;
      const conversationId = String(conversation._id);

      setConversations((existing) => [
        conversation,
        ...existing.filter(
          (item) => String(item._id) !== conversationId,
        ),
      ]);

      setMessages([]);
      setMessagesError("");
      setSelectedConversationId(conversationId);
      setMessageDraft("");
      setActiveNav("Messages");
      setAccountMenuOpen(false);
    } catch (error) {
      setMessageActionError(
        error.message || "Couldn't start this conversation.",
      );
    }
  }

  // Send a message to the selected conversation.
  async function sendMessage(event) {
    event.preventDefault();

    const text = messageDraft.trim();

    if (!text || !selectedConversationId || messageSending) return;

    if (text.length > 2000) {
      setMessageActionError("Messages must be 2,000 characters or fewer.");
      return;
    }

    setMessageSending(true);
    setMessageActionError("");

    try {
      const result = await apiRequest(
        `/messages/conversations/${selectedConversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ text }),
        },
      );

      if (!result?.data?._id) {
        throw new Error("The server returned an unexpected message.");
      }

      const savedMessage = result.data;

      setMessages((existing) => [...existing, savedMessage]);
      setMessageDraft("");

      setConversations((existing) =>
        existing.map((conversation) =>
          String(conversation._id) === String(selectedConversationId)
            ? {
                ...conversation,
                lastMessage: savedMessage,
                lastMessageAt: savedMessage.createdAt,
              }
            : conversation,
        ),
      );
    } catch (error) {
      setMessageActionError(
        error.message || "Couldn't send your message. Please try again.",
      );
    } finally {
      setMessageSending(false);
    }
  }

  async function openProfile(userId) {
    if (!userId) return;

    setActiveNav("Profile");
    setSelectedProfile(null);
    setProfileLoading(true);
    setProfileError("");

    try {
      const result = await apiRequest(`/users/${userId}`);

      if (!result?.user) {
        throw new Error("The server returned an unexpected profile response.");
      }

      setSelectedProfile(result.user);
    } catch (error) {
      setProfileError(error.message || "Couldn't load this profile.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function toggleFollow(userId) {
    if (!userId || followBusyIds.includes(String(userId))) return;

    setFollowBusyIds((ids) => [...ids, String(userId)]);
    setFollowError("");

    try {
      await apiRequest(`/users/${userId}`, { method: "PATCH" });

      const [meResult, profileResult] = await Promise.all([
        apiRequest("/users/me"),
        activeNav === "Profile" && selectedProfile?.id
          ? apiRequest(`/users/${selectedProfile.id}`)
          : Promise.resolve(null),
      ]);

      const me = meResult?.user ?? meResult?.profile ?? meResult;
      setCurrentUser(me);

      if (profileResult?.user) setSelectedProfile(profileResult.user);

      setSearchResults((users) =>
        users.map((user) =>
          String(user.id || user._id) === String(userId)
            ? {
                ...user,
                isFollowing: !followingIds.includes(String(userId)),
              }
            : user,
        ),
      );
    } catch (error) {
      setFollowError(
        error.message || "Couldn't update this follow. Please try again.",
      );
    } finally {
      setFollowBusyIds((ids) =>
        ids.filter((id) => id !== String(userId)),
      );
    }
  }

  function toggleBookmark(postId) {
    const id = String(postId);

    const nextBookmarks = bookmarks.includes(id)
      ? bookmarks.filter((savedId) => savedId !== id)
      : [...bookmarks, id];

    setBookmarks(nextBookmarks);

    try {
      localStorage.setItem("gather_bookmarks", JSON.stringify(nextBookmarks));
      setFollowError("");
    } catch {
      setFollowError("Bookmarks could not be saved in this browser.");
    }
  }

  const visiblePosts =
    feedMode === "Following"
      ? posts.filter((post) =>
          followingIds.includes(String(post.authorId)),
        )
      : posts;

  function handleAuthenticated(user) {
    setCurrentUser(user);
    setSessionError("");
    setActiveNav("Home");
  }

  function handleLogout() {
    sessionStorage.removeItem("gather_token");
    setCurrentUser(null);
    setCaption("");
    setImageUrl("");
    setPosts([]);
    setFeedError("");
    setFeedLoading(false);
    setPostSubmitting(false);
    setPostSubmitError("");
    setPostSubmitSuccess("");
    setLikingPostIds([]);
    setLikeErrors({});
    setCommentsByPost({});
    setCommentsOpenIds([]);
    setCommentsLoadedPostIds([]);
    setCommentsLoadingIds([]);
    setCommentsSubmittingIds([]);
    setCommentDrafts({});
    setCommentErrors({});
    setNotifications([]);
    setUnreadNotificationCount(0);
    setConversations([]);
    setSelectedConversationId("");
    setMessages([]);
    setMessageDraft("");
    setMessageActionError("");
    setActiveNav("Home");
    setSessionError("");
    setAccountMenuOpen(false);
  }

  async function deletePost(postId) {
    if (!postId || deletingPostIds.includes(postId)) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this post? This action cannot be undone.",
    );

    if (!confirmed) {
      setOpenPostMenuId("");
      return;
    }

    setDeletingPostIds((current) => [...current, postId]);
    setDeletePostErrors((current) => ({ ...current, [postId]: "" }));

    try {
      await apiRequest(`/posts/${postId}`, { method: "DELETE" });

      setPosts((currentPosts) =>
        currentPosts.filter((post) => post.id !== postId),
      );
      setCommentsByPost((current) => {
        const next = { ...current };
        delete next[postId];
        return next;
      });
      setCommentsOpenIds((current) =>
        current.filter((id) => id !== postId),
      );
      setOpenPostMenuId("");
    } catch (error) {
      setDeletePostErrors((current) => ({
        ...current,
        [postId]: error.message || "Couldn't delete this post. Please try again.",
      }));
    } finally {
      setDeletingPostIds((current) =>
        current.filter((id) => id !== postId),
      );
    }
  }

  async function toggleLike(postId) {
    if (likingPostIds.includes(postId)) return;

    setLikingPostIds((current) => [...current, postId]);
    setLikeErrors((current) => ({ ...current, [postId]: "" }));

    try {
      const result = await apiRequest(`/posts/${postId}/like`, {
        method: "PATCH",
      });

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: result.likesCount,
                likedByMe: result.liked,
              }
            : post,
        ),
      );
    } catch (error) {
      setLikeErrors((current) => ({
        ...current,
        [postId]:
          error.message || "Unable to update like. Please try again.",
      }));
    } finally {
      setLikingPostIds((current) =>
        current.filter((id) => id !== postId),
      );
    }
  }

  async function toggleComments(postId) {
    const isOpen = commentsOpenIds.includes(postId);

    if (isOpen) {
      setCommentsOpenIds((current) =>
        current.filter((id) => id !== postId),
      );
      return;
    }

    setCommentsOpenIds((current) => [...current, postId]);
    setCommentErrors((current) => ({ ...current, [postId]: "" }));

    if (commentsLoadedPostIds.includes(postId)) return;

    setCommentsLoadingIds((current) =>
      current.includes(postId) ? current : [...current, postId],
    );

    try {
      const result = await apiRequest(`/posts/${postId}/comments`);

      if (!Array.isArray(result?.comments)) {
        throw new Error("The server returned an unexpected comments response.");
      }

      setCommentsByPost((current) => ({
        ...current,
        [postId]: result.comments,
      }));

      setCommentsLoadedPostIds((current) =>
        current.includes(postId) ? current : [...current, postId],
      );

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? { ...post, commentsCount: result.comments.length }
            : post,
        ),
      );
    } catch (error) {
      setCommentErrors((current) => ({
        ...current,
        [postId]: error.message || "Couldn't load comments. Please try again.",
      }));
    } finally {
      setCommentsLoadingIds((current) =>
        current.filter((id) => id !== postId),
      );
    }
  }

  async function submitComment(event, postId) {
    event.preventDefault();

    const text = (commentDrafts[postId] || "").trim();

    if (!text) {
      setCommentErrors((current) => ({
        ...current,
        [postId]: "Write a comment before submitting.",
      }));
      return;
    }

    if (text.length > 1000) {
      setCommentErrors((current) => ({
        ...current,
        [postId]: "Comments must be 1,000 characters or fewer.",
      }));
      return;
    }

    if (commentsSubmittingIds.includes(postId)) return;

    setCommentsSubmittingIds((current) => [...current, postId]);
    setCommentErrors((current) => ({ ...current, [postId]: "" }));

    try {
      const result = await apiRequest(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      if (!result?.comment) {
        throw new Error("The server returned an unexpected comment response.");
      }

      setCommentsByPost((current) => ({
        ...current,
        [postId]: [...(current[postId] || []), result.comment],
      }));

      setCommentsLoadedPostIds((current) =>
        current.includes(postId) ? current : [...current, postId],
      );

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                commentsCount: (Number(post.commentsCount) || 0) + 1,
              }
            : post,
        ),
      );

      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    } catch (error) {
      setCommentErrors((current) => ({
        ...current,
        [postId]:
          error.message || "Couldn't add your comment. Please try again.",
      }));
    } finally {
      setCommentsSubmittingIds((current) =>
        current.filter((id) => id !== postId),
      );
    }
  }

  async function createPost(event) {
    event.preventDefault();

    const trimmedImageUrl = imageUrl.trim();
    const trimmedCaption = caption.trim();

    setPostSubmitError("");
    setPostSubmitSuccess("");

    if (!trimmedImageUrl) {
      setPostSubmitError("Please enter an image URL.");
      return;
    }

    if (trimmedCaption.length > 500) {
      setPostSubmitError("Your caption must be 500 characters or fewer.");
      return;
    }

    try {
      const parsedUrl = new URL(trimmedImageUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        setPostSubmitError("Please enter a valid HTTP or HTTPS image URL.");
        return;
      }
    } catch {
      setPostSubmitError("Please enter a valid image URL.");
      return;
    }

    setPostSubmitting(true);

    try {
      await apiRequest("/posts", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: trimmedImageUrl,
          caption: trimmedCaption,
        }),
      });

      setCaption("");
      setImageUrl("");
      setPostSubmitSuccess("Your post was published successfully.");
      setFeedRefreshKey((key) => key + 1);
    } catch (error) {
      setPostSubmitError(
        error.message || "Couldn't publish your post. Please try again.",
      );
    } finally {
      setPostSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="auth-loading" aria-live="polite">
        <div className="auth-loading-brand">
          gather<span>.</span>
        </div>
        <p>Preparing your space...</p>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <>
        {sessionError && (
          <div className="session-notice" role="status">
            {sessionError}
          </div>
        )}
        <Auth onAuthenticated={handleAuthenticated} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Gather home">
          <span className="brand-mark">g.</span>
          <span>
            gather<span className="brand-period">.</span>
          </span>
        </a>

        <div className="workspace-label">YOUR SPACE</div>

        <nav className="main-nav" aria-label="Main navigation">
          {[
            { name: "Home", icon: "⌂" },
            { name: "Discover", icon: "⌕" },
            { name: "Bookmarks", icon: "◇" },
            { name: "Messages", icon: "▤" },
          ].map((item) => (
            <button
              key={item.name}
              className={`nav-item ${activeNav === item.name ? "active" : ""}`}
              onClick={() => {
                setActiveNav(item.name);
                setAccountMenuOpen(false);
              }}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.name}</span>
              {item.name === "Messages" && conversations.length > 0 && (
                <span className="nav-count">{conversations.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <div className="workspace-label">YOUR COMMUNITY</div>

        <button className="community-link" type="button">
          <span className="community-dot community-dot-peach" />
          Design thinkers
          <span className="community-members">2.4k</span>
        </button>

        <button className="community-link" type="button">
          <span className="community-dot community-dot-green" />
          Everyday moments
          <span className="community-members">846</span>
        </button>

        <button className="community-link" type="button">
          <span className="community-dot community-dot-blue" />
          Creative minds
          <span className="community-members">1.2k</span>
        </button>

        <div className="sidebar-bottom">
          <div className="profile-mini">
            <Avatar
              initials={initials}
              imageUrl={currentUser?.profilePicture || ""}
            />
            <div className="profile-mini-info">
              <strong>{displayName}</strong>
              <span>{username}</span>
            </div>
            <button
              className="more-button"
              aria-label="Account menu"
              title="Account menu"
              onClick={() => setAccountMenuOpen((open) => !open)}
              type="button"
            >
              ↪
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">g.</span>
            <strong>gather.</strong>
          </div>

          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search"
              placeholder="Search people, posts, and ideas..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setActiveNav("Discover");
              }}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) {
                  setActiveNav("Discover");
                }
              }}
            />
            <kbd>⌘ K</kbd>
          </label>

          <div className="topbar-actions">
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              type="button"
              onClick={() => {
                setActiveNav("Notifications");
                setAccountMenuOpen(false);
              }}
            >
              ♧
              {unreadNotificationCount > 0 && <span />}
            </button>

            <button
              className="avatar-trigger"
              type="button"
              aria-label="Open account menu"
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              <Avatar
                initials={initials}
                className="topbar-avatar"
                imageUrl={currentUser?.profilePicture || ""}
              />
            </button>

            {accountMenuOpen && (
              <div className="account-menu">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setActiveNav("Profile");
                    setSelectedProfile({
                      ...currentUser,
                      followersCount: currentUser.followers?.length || 0,
                      followingCount: currentUser.following?.length || 0,
                    });
                  }}
                >
                  My profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setActiveNav("Settings");
                  }}
                >
                  Account settings
                </button>
                <button type="button" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="page-layout">
          <section className="feed-column">
            <div className="page-heading">
              <div>
                <p className="eyebrow">YOUR LITTLE CORNER OF THE INTERNET</p>
                <h1>{activeNav === "Home" ? "Your feed" : activeNav}</h1>
                <p className="page-subtitle">
                  Good things happen when we come together.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() =>
                  document.getElementById("post-image-url")?.focus()
                }
                type="button"
              >
                <span>＋</span> Create post
              </button>
            </div>

            {activeNav === "Home" ? (
              <>
                <div className="feed-tabs" role="group" aria-label="Feed filter">
                  <button
                    className={`feed-tab ${feedMode === "For you" ? "selected" : ""}`}
                    onClick={() => setFeedMode("For you")}
                    type="button"
                  >
                    For you
                  </button>
                  <button
                    className={`feed-tab ${feedMode === "Following" ? "selected" : ""}`}
                    onClick={() => setFeedMode("Following")}
                    type="button"
                  >
                    Following
                  </button>
                  <span className="feed-tab-note">
                    A fresh perspective, every day
                  </span>
                </div>

                <form className="composer card" onSubmit={createPost}>
                  <div className="composer-top">
                    <Avatar
                      initials={initials}
                      imageUrl={currentUser?.profilePicture || ""}
                    />

                    <div className="composer-input">
                      <label
                        htmlFor="post-image-url"
                        className="composer-field-label"
                      >
                        Image URL
                      </label>
                      <input
                        id="post-image-url"
                        className="composer-image-input"
                        type="url"
                        value={imageUrl}
                        onChange={(event) => setImageUrl(event.target.value)}
                        placeholder="https://example.com/your-image.jpg"
                        maxLength={2048}
                        required
                      />

                      <label
                        htmlFor="post-caption"
                        className="composer-field-label"
                      >
                        Caption <span>(optional)</span>
                      </label>
                      <textarea
                        id="post-caption"
                        value={caption}
                        onChange={(event) => setCaption(event.target.value)}
                        placeholder="What's on your mind today?"
                        rows={3}
                        maxLength={500}
                      />
                      <span className="caption-counter">{caption.length}/500</span>
                    </div>
                  </div>

                  <div className="composer-footer">
                    <div className="composer-hint">
                      <span className="composer-sparkle">✳</span>
                      A thought, a moment, a little inspiration.
                    </div>
                    <button
                      className="primary-button composer-submit"
                      type="submit"
                      disabled={postSubmitting || !imageUrl.trim()}
                    >
                      {postSubmitting ? "Publishing..." : "Publish post"}
                      {!postSubmitting && <span> ↗</span>}
                    </button>
                  </div>

                  {postSubmitError && (
                    <p className="post-feedback post-feedback-error" role="alert">
                      {postSubmitError}
                    </p>
                  )}
                  {postSubmitSuccess && (
                    <p className="post-feedback post-feedback-success" role="status">
                      {postSubmitSuccess}
                    </p>
                  )}
                  <p className="demo-notice">
                    Posts are saved to your Gather account. Use a direct,
                    publicly accessible image URL.
                  </p>
                </form>

                <div className="feed-heading">
                  <h2>
                    {feedMode === "Following"
                      ? "Posts from people you follow"
                      : "Happening around you"}
                  </h2>
                  <button
                    className="sort-button"
                    type="button"
                    onClick={() => setFeedRefreshKey((key) => key + 1)}
                    disabled={feedLoading}
                  >
                    {feedLoading ? "Loading..." : "Refresh ↻"}
                  </button>
                </div>

                {feedLoading && (
                  <div className="card feed-status" role="status">
                    Loading your community posts...
                  </div>
                )}

                {!feedLoading && feedError && (
                  <div className="card feed-status feed-status-error" role="alert">
                    <p>{feedError}</p>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => setFeedRefreshKey((key) => key + 1)}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!feedLoading && !feedError && visiblePosts.length === 0 && (
                  <div className="card feed-status">
                    <h3>Your feed is ready for its first post.</h3>
                    <p>
                      When community members share something, their posts will
                      appear here.
                    </p>
                  </div>
                )}

                {!feedLoading &&
                  !feedError &&
                  visiblePosts.map((post) => {
                    const liked = Boolean(post.likedByMe);
                    const displayedLikes = Number(post.likes) || 0;
                    const isOwnPost =
                      String(post.authorId) ===
                      String(currentUser?.id || currentUser?._id || "");
                    const isBookmarked = bookmarks.includes(String(post.id));

                    return (
                      <article className="post-card card" key={post.id}>
                        <div className="post-header">
                          <Avatar
                            initials={post.initials}
                            imageUrl={post.profilePicture}
                          />
                          <button
                            className="post-author-button"
                            type="button"
                            onClick={() => openProfile(post.authorId)}
                          >
                            <div className="post-author">
                              <strong>{post.name}</strong>
                              <span>
                                {post.username}{" "}
                                <span className="dot-separator">·</span>{" "}
                                {post.time}
                              </span>
                            </div>
                          </button>
                          <div className="post-menu-container">
                            <button
                              className="more-button"
                              aria-label={`More options for ${post.name}'s post`}
                              aria-haspopup="menu"
                              aria-expanded={openPostMenuId === post.id}
                              onClick={() =>
                                setOpenPostMenuId((current) =>
                                  current === post.id ? "" : post.id,
                                )
                              }
                              type="button"
                            >
                              ···
                            </button>

                            {openPostMenuId === post.id && (
                              <div className="post-options-menu" role="menu">
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    toggleBookmark(post.id);
                                    setOpenPostMenuId("");
                                  }}
                                >
                                  {isBookmarked ? "Remove bookmark" : "Save post"}
                                </button>

                                {isOwnPost && (
                                  <button
                                    className="post-menu-delete"
                                    type="button"
                                    role="menuitem"
                                    disabled={deletingPostIds.includes(post.id)}
                                    onClick={() => deletePost(post.id)}
                                  >
                                    {deletingPostIds.includes(post.id)
                                      ? "Deleting..."
                                      : "Delete post"}
                                  </button>
                                )}

                                {deletePostErrors[post.id] && (
                                  <p className="post-menu-error" role="alert">
                                    {deletePostErrors[post.id]}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {post.caption && (
                          <p className="post-caption">{post.caption}</p>
                        )}

                        {post.image && (
                          <img
                            className="post-image"
                            src={post.image}
                            alt={`Photo shared by ${post.name}`}
                            loading="lazy"
                          />
                        )}

                        <div className="post-stats">
                          <span>{displayedLikes} appreciations</span>
                          <span>{Number(post.commentsCount) || 0} comments</span>
                        </div>

                        <div className="post-actions">
                          <button
                            className={`post-action ${liked ? "liked" : ""}`}
                            onClick={() => toggleLike(post.id)}
                            type="button"
                            aria-pressed={liked}
                            disabled={likingPostIds.includes(post.id)}
                          >
                            <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
                            Appreciate
                          </button>

                          {likeErrors[post.id] && (
                            <span className="error-message" role="alert">
                              {likeErrors[post.id]}
                            </span>
                          )}

                          <button
                            className={`post-action ${commentsOpenIds.includes(post.id) ? "comment-action-active" : ""}`}
                            type="button"
                            onClick={() => toggleComments(post.id)}
                            aria-expanded={commentsOpenIds.includes(post.id)}
                          >
                            <span aria-hidden="true">▢</span>
                            {commentsOpenIds.includes(post.id)
                              ? "Hide comments"
                              : "Comment"}
                          </button>

                          <button
                            className={`post-action ${bookmarks.includes(String(post.id)) ? "liked" : ""}`}
                            type="button"
                            onClick={() => toggleBookmark(post.id)}
                            aria-pressed={bookmarks.includes(String(post.id))}
                          >
                            <span aria-hidden="true">
                              {bookmarks.includes(String(post.id)) ? "◆" : "◇"}
                            </span>
                            {bookmarks.includes(String(post.id)) ? "Saved" : "Save"}
                          </button>

                          <button
                            className="post-action share-action"
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  window.location.origin,
                                );
                              } catch {
                                setFollowError(
                                  "Sharing is unavailable in this browser.",
                                );
                              }
                            }}
                          >
                            <span aria-hidden="true">↗</span>
                            Share
                          </button>
                        </div>

                        {commentsOpenIds.includes(post.id) && (
                          <section
                            className="comments-panel"
                            aria-label={`Comments on ${post.name}'s post`}
                          >
                            <div className="comments-panel-heading">
                              <h3>Conversation</h3>
                              <span>
                                {(commentsByPost[post.id] || []).length}{" "}
                                {(commentsByPost[post.id] || []).length === 1
                                  ? "comment"
                                  : "comments"}
                              </span>
                            </div>

                            {commentsLoadingIds.includes(post.id) && (
                              <p className="comments-status" role="status">
                                Loading comments...
                              </p>
                            )}

                            {!commentsLoadingIds.includes(post.id) &&
                              !commentErrors[post.id] &&
                              (commentsByPost[post.id] || []).length === 0 && (
                                <p className="comments-empty">
                                  No comments yet. Start the conversation.
                                </p>
                              )}

                            {!commentsLoadingIds.includes(post.id) &&
                              (commentsByPost[post.id] || []).map((comment) => {
                                const author = comment.user || {};
                                const authorName =
                                  author.displayName ||
                                  author.username ||
                                  "Gather member";

                                return (
                                  <div className="comment-item" key={comment.id}>
                                    <Avatar
                                      initials={getInitials(author)}
                                      imageUrl={author.profilePicture || ""}
                                      className="comment-avatar"
                                    />
                                    <div className="comment-content">
                                      <div className="comment-meta">
                                        <strong>{authorName}</strong>
                                        <span>
                                          {formatPostTime(comment.createdAt)}
                                        </span>
                                      </div>
                                      <p>{comment.text}</p>
                                    </div>
                                  </div>
                                );
                              })}

                            {commentErrors[post.id] && (
                              <div className="comment-error" role="alert">
                                <span>{commentErrors[post.id]}</span>
                              </div>
                            )}

                            <form
                              className="comment-composer"
                              onSubmit={(event) =>
                                submitComment(event, post.id)
                              }
                            >
                              <Avatar
                                initials={initials}
                                imageUrl={currentUser?.profilePicture || ""}
                                className="comment-avatar"
                              />
                              <div className="comment-input-wrap">
                                <label
                                  className="sr-only"
                                  htmlFor={`comment-${post.id}`}
                                >
                                  Write a comment
                                </label>
                                <textarea
                                  id={`comment-${post.id}`}
                                  value={commentDrafts[post.id] || ""}
                                  onChange={(event) =>
                                    setCommentDrafts((current) => ({
                                      ...current,
                                      [post.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Add something thoughtful..."
                                  rows={2}
                                  maxLength={1000}
                                  disabled={commentsSubmittingIds.includes(post.id)}
                                />
                                <div className="comment-composer-footer">
                                  <span>
                                    {(commentDrafts[post.id] || "").length}/1000
                                  </span>
                                  <button
                                    className="primary-button comment-submit"
                                    type="submit"
                                    disabled={
                                      commentsSubmittingIds.includes(post.id) ||
                                      !(commentDrafts[post.id] || "").trim()
                                    }
                                  >
                                    {commentsSubmittingIds.includes(post.id)
                                      ? "Posting..."
                                      : "Post comment"}
                                  </button>
                                </div>
                              </div>
                            </form>
                          </section>
                        )}
                      </article>
                    );
                  })}

                <p className="prototype-footer">
                  Your posts and conversations are connected to Gather's backend.
                </p>
              </>
            ) : (
              <section className="feature-screen card">
                {activeNav === "Discover" && (
                  <>
                    <p className="eyebrow">FIND YOUR PEOPLE</p>
                    <h2>Discover members</h2>
                    <p className="feature-description">
                      Search by username or display name. Open a profile to
                      learn more, follow members, or start a conversation.
                    </p>

                    <label
                      className="feature-search-label"
                      htmlFor="discover-search"
                    >
                      Search members
                    </label>
                    <input
                      id="discover-search"
                      className="feature-search-input"
                      value={searchQuery}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSearchQuery(value);

                        if (value.trim().length < 2) {
                          setSearchResults([]);
                          setSearchError("");
                          setSearchLoading(false);
                        }
                      }}
                      placeholder="Try a username or display name"
                      maxLength={30}
                    />

                    {searchQuery.trim().length < 2 && (
                      <p className="feature-muted">
                        Enter at least 2 characters to search.
                      </p>
                    )}
                    {searchLoading && (
                      <p role="status" className="feature-muted">
                        Searching members...
                      </p>
                    )}
                    {searchError && (
                      <p role="alert" className="feature-error">
                        {searchError}
                      </p>
                    )}
                    {followError && (
                      <p role="alert" className="feature-error">
                        {followError}
                      </p>
                    )}
                    {messageActionError && (
                      <p role="alert" className="feature-error">
                        {messageActionError}
                      </p>
                    )}
                    {!searchLoading &&
                      searchQuery.trim().length >= 2 &&
                      !searchError &&
                      searchResults.length === 0 && (
                        <p className="feature-muted">
                          No members found for that search.
                        </p>
                      )}

                    <div className="member-results">
                      {searchResults.map((person) => {
                        const personId = String(person.id || person._id || "");
                        const isFollowing = followingIds.includes(personId);

                        return (
                          <div
                            className="member-result"
                            key={personId || person.username}
                          >
                            <button
                              className="member-profile-button"
                              type="button"
                              onClick={() => openProfile(personId)}
                            >
                              <Avatar
                                initials={getInitials(person)}
                                imageUrl={person.profilePicture || ""}
                              />
                              <span>
                                <strong>
                                  {person.displayName || person.username}
                                </strong>
                                <small>@{person.username}</small>
                              </span>
                            </button>

                            <div className="member-result-actions">
                              <button
                                className="follow-button"
                                type="button"
                                onClick={() => toggleFollow(personId)}
                                disabled={
                                  !personId ||
                                  followBusyIds.includes(personId)
                                }
                              >
                                {followBusyIds.includes(personId)
                                  ? "Saving..."
                                  : isFollowing
                                    ? "Following"
                                    : "Follow"}
                              </button>

                              <button
                                className="follow-button message-member-button"
                                type="button"
                                onClick={() => startConversation(personId)}
                                disabled={!personId}
                              >
                                Message
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {activeNav === "Bookmarks" && (
                  <>
                    <p className="eyebrow">YOUR SAVED INSPIRATION</p>
                    <h2>Bookmarks</h2>
                    <p className="feature-description">
                      Posts you save on this browser appear here.
                    </p>

                    {posts.filter((post) =>
                      bookmarks.includes(String(post.id)),
                    ).length === 0 ? (
                      <p className="feature-muted">
                        No bookmarks yet. Use the bookmark action on a post to
                        save it here.
                      </p>
                    ) : (
                      posts
                        .filter((post) => bookmarks.includes(String(post.id)))
                        .map((post) => (
                          <article className="saved-post" key={post.id}>
                            <div className="saved-post-main">
                              <strong>{post.name}</strong>
                              <span>{post.username}</span>
                              {post.caption && <p>{post.caption}</p>}
                            </div>
                            {post.image && (
                              <img
                                src={post.image}
                                alt={`Post by ${post.name}`}
                                loading="lazy"
                              />
                            )}
                            <button
                              className="follow-button"
                              type="button"
                              onClick={() => toggleBookmark(post.id)}
                            >
                              Remove bookmark
                            </button>
                          </article>
                        ))
                    )}
                  </>
                )}

                {activeNav === "Profile" && (
                  <>
                    {profileLoading && (
                      <p role="status" className="feature-muted">
                        Loading profile...
                      </p>
                    )}
                    {profileError && (
                      <p role="alert" className="feature-error">
                        {profileError}
                      </p>
                    )}

                    {!profileLoading && selectedProfile && (
                      <div className="profile-screen">
                        <Avatar
                          initials={getInitials(selectedProfile)}
                          imageUrl={selectedProfile.profilePicture || ""}
                          className="profile-screen-avatar"
                        />
                        <h2>
                          {selectedProfile.displayName ||
                            selectedProfile.username}
                        </h2>
                        <p className="feature-muted">
                          @{selectedProfile.username}
                        </p>
                        <p>
                          {selectedProfile.bio ||
                            "This member hasn't added a bio yet."}
                        </p>

                        <div className="profile-counts">
                          <span>
                            <strong>
                              {selectedProfile.followersCount || 0}
                            </strong>{" "}
                            followers
                          </span>
                          <span>
                            <strong>
                              {selectedProfile.followingCount || 0}
                            </strong>{" "}
                            following
                          </span>
                        </div>

                        {String(
                          selectedProfile.id || selectedProfile._id,
                        ) !== String(currentUserId) && (
                          <div className="profile-action-buttons">
                            <button
                              className="primary-button"
                              type="button"
                              onClick={() =>
                                toggleFollow(
                                  String(
                                    selectedProfile.id ||
                                      selectedProfile._id,
                                  ),
                                )
                              }
                              disabled={followBusyIds.includes(
                                String(
                                  selectedProfile.id ||
                                    selectedProfile._id,
                                ),
                              )}
                            >
                              {followBusyIds.includes(
                                String(
                                  selectedProfile.id ||
                                    selectedProfile._id,
                                ),
                              )
                                ? "Saving..."
                                : selectedProfile.isFollowing
                                  ? "Unfollow"
                                  : "Follow"}
                            </button>
                            <button
                              className="follow-button"
                              type="button"
                              onClick={() =>
                                startConversation(
                                  String(
                                    selectedProfile.id ||
                                      selectedProfile._id,
                                  ),
                                )
                              }
                            >
                              Message
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {activeNav === "Messages" && (
                  <>
                    <p className="eyebrow">YOUR PRIVATE SPACE</p>
                    <h2>Messages</h2>
                    <p className="feature-description">
                      Good conversations start with a hello.
                    </p>

                    {messageActionError && (
                      <p className="feature-error" role="alert">
                        {messageActionError}
                      </p>
                    )}

                    <div className="messaging-layout">
                      <aside className="conversation-panel">
                        <div className="conversation-panel-heading">
                          <h3>Your conversations</h3>
                        </div>

                        {conversationsLoading && (
                          <p className="feature-muted" role="status">
                            Loading conversations...
                          </p>
                        )}
                        {conversationsError && (
                          <p className="feature-error" role="alert">
                            {conversationsError}
                          </p>
                        )}

                        {!conversationsLoading &&
                          !conversationsError &&
                          conversations.length === 0 && (
                            <p className="feature-muted conversation-empty">
                              No conversations yet. Find a member in Discover
                              and send them a message.
                            </p>
                          )}

                        <div className="conversation-list">
                          {conversations.map((conversation) => {
                            const otherPerson = (
                              conversation.participants || []
                            ).find(
                              (person) =>
                                String(person._id || person.id) !==
                                String(currentUserId),
                            );

                            if (!otherPerson) return null;

                            const lastMessage = conversation.lastMessage;

                            return (
                              <button
                                key={conversation._id}
                                type="button"
                                className={`conversation-item ${
                                  String(conversation._id) ===
                                  String(selectedConversationId)
                                    ? "conversation-item-active"
                                    : ""
                                }`}
                                onClick={() => {
                                  setMessageActionError("");
                                  setMessages([]);
                                  setMessagesError("");
                                  setSelectedConversationId(
                                    String(conversation._id),
                                  );
                                }}
                              >
                                <Avatar
                                  initials={getInitials(otherPerson)}
                                  imageUrl={otherPerson.profilePicture || ""}
                                  className="conversation-avatar"
                                />
                                <span className="conversation-item-copy">
                                  <strong>
                                    {otherPerson.displayName ||
                                      otherPerson.username ||
                                      "Gather member"}
                                  </strong>
                                  <span className="conversation-preview">
                                    {lastMessage?.text ||
                                      "Start a conversation"}
                                  </span>
                                </span>
                                <span className="conversation-item-time">
                                  {lastMessage?.createdAt
                                    ? formatPostTime(lastMessage.createdAt)
                                    : ""}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </aside>

                      <section className="chat-panel">
                        {!selectedConversationId ? (
                          <div className="chat-welcome">
                            <span
                              className="chat-welcome-icon"
                              aria-hidden="true"
                            >
                              ✳
                            </span>
                            <h3>
                              Your next good conversation starts here.
                            </h3>
                            <p>
                              Choose a conversation or find someone new in
                              Discover.
                            </p>
                          </div>
                        ) : (
                          <>
                            {(() => {
                              const conversation = conversations.find(
                                (item) =>
                                  String(item._id) ===
                                  String(selectedConversationId),
                              );

                              const otherPerson = (
                                conversation?.participants || []
                              ).find(
                                (person) =>
                                  String(person._id || person.id) !==
                                  String(currentUserId),
                              );

                              return (
                                <header className="chat-header">
                                  <Avatar
                                    initials={getInitials(otherPerson)}
                                    imageUrl={
                                      otherPerson?.profilePicture || ""
                                    }
                                    className="chat-header-avatar"
                                  />
                                  <div>
                                    <strong>
                                      {otherPerson?.displayName ||
                                        otherPerson?.username ||
                                        "Gather member"}
                                    </strong>
                                    <span>
                                      {otherPerson?.username
                                        ? `@${otherPerson.username}`
                                        : "Gather member"}
                                    </span>
                                  </div>
                                </header>
                              );
                            })()}

                            <div className="chat-messages" aria-live="polite">
                              {messagesLoading && (
                                <p className="feature-muted" role="status">
                                  Loading messages...
                                </p>
                              )}
                              {messagesError && (
                                <p className="feature-error" role="alert">
                                  {messagesError}
                                </p>
                              )}

                              {!messagesLoading &&
                                !messagesError &&
                                messages.length === 0 && (
                                  <p className="chat-empty">
                                    No messages yet. Say hello!
                                  </p>
                                )}

                              {!messagesLoading &&
                                messages.map((message) => {
                                  const senderId = String(
                                    message.sender?._id ||
                                      message.sender?.id ||
                                      "",
                                  );

                                  const isMine =
                                    senderId === String(currentUserId);

                                  return (
                                    <div
                                      key={message._id}
                                      className={`chat-message-row ${
                                        isMine ? "chat-message-row-mine" : ""
                                      }`}
                                    >
                                      {!isMine && (
                                        <Avatar
                                          initials={getInitials(message.sender)}
                                          imageUrl={
                                            message.sender?.profilePicture || ""
                                          }
                                          className="chat-message-avatar"
                                        />
                                      )}

                                      <div
                                        className={`chat-message-bubble ${
                                          isMine ? "chat-message-mine" : ""
                                        }`}
                                      >
                                        <p>{message.text}</p>
                                        <time
                                          dateTime={message.createdAt}
                                        >
                                          {message.createdAt
                                            ? new Date(
                                                message.createdAt,
                                              ).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })
                                            : ""}
                                        </time>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>

                            <form
                              className="chat-composer"
                              onSubmit={sendMessage}
                            >
                              <label
                                className="sr-only"
                                htmlFor="message-draft"
                              >
                                Write a message
                              </label>
                              <textarea
                                id="message-draft"
                                value={messageDraft}
                                onChange={(event) =>
                                  setMessageDraft(event.target.value)
                                }
                                placeholder="Write something thoughtful..."
                                rows={2}
                                maxLength={2000}
                                disabled={messageSending}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" &&
                                    !event.shiftKey &&
                                    !event.nativeEvent.isComposing
                                  ) {
                                    event.preventDefault();
                                    event.currentTarget.form?.requestSubmit();
                                  }
                                }}
                              />
                              <button
                                className="primary-button chat-send-button"
                                type="submit"
                                disabled={
                                  messageSending || !messageDraft.trim()
                                }
                              >
                                {messageSending ? "Sending..." : "Send ↗"}
                              </button>
                            </form>
                          </>
                        )}
                      </section>
                    </div>
                  </>
                )}

                {activeNav === "Settings" && (
                  <>
                    <p className="eyebrow">YOUR ACCOUNT</p>
                    <h2>Account settings</h2>
                    <p className="feature-description">
                      You're signed in as {displayName} ({username}). Profile
                      editing is available through the profile API; we'll
                      connect a dedicated edit form next.
                    </p>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </>
                )}

                {activeNav === "Notifications" && (
                  <>
                    <p className="eyebrow">WHAT'S HAPPENING</p>

                    <div className="notification-heading-row">
                      <div>
                        <h2>Notifications</h2>
                        <p className="feature-description">
                          Stay up to date with your Gather community.
                        </p>
                      </div>

                      {unreadNotificationCount > 0 && (
                        <button
                          className="follow-button"
                          type="button"
                          onClick={markAllNotificationsRead}
                          disabled={notificationBusy}
                        >
                          {notificationBusy
                            ? "Saving..."
                            : "Mark all as read"}
                        </button>
                      )}
                    </div>

                    {notificationsLoading && (
                      <p className="feature-muted" role="status">
                        Loading your notifications...
                      </p>
                    )}

                    {notificationsError && (
                      <div className="feature-error" role="alert">
                        <p>{notificationsError}</p>
                        <button
                          className="follow-button"
                          type="button"
                          onClick={() => setActiveNav("Home")}
                        >
                          Back to feed
                        </button>
                      </div>
                    )}

                    {!notificationsLoading &&
                      !notificationsError &&
                      notifications.length === 0 && (
                        <div className="feature-muted notification-empty">
                          <span
                            className="notification-empty-icon"
                            aria-hidden="true"
                          >
                            ♡
                          </span>
                          <h3>You're all caught up</h3>
                          <p>
                            When people interact with you, you'll see it here.
                          </p>
                        </div>
                      )}

                    {!notificationsLoading &&
                      !notificationsError &&
                      notifications.length > 0 && (
                        <div className="notification-list">
                          {notifications.map((notification) => {
                            const actor = notification.actor || {};
                            const actorName =
                              actor.displayName ||
                              actor.username ||
                              "A Gather member";

                            const notificationMessage = {
                              follow: "started following you.",
                              like: "appreciated your post.",
                              comment: "commented on your post.",
                            }[notification.type] || "interacted with you.";

                            const notificationId = String(
                              notification._id || notification.id,
                            );

                            return (
                              <article
                                className={`notification-item ${
                                  notification.isRead
                                    ? ""
                                    : "notification-unread"
                                }`}
                                key={notificationId}
                              >
                                <Avatar
                                  initials={getInitials(actor)}
                                  imageUrl={actor.profilePicture || ""}
                                  className="notification-avatar"
                                />

                                <div className="notification-content">
                                  <p>
                                    <strong>{actorName}</strong>{" "}
                                    {notificationMessage}
                                  </p>

                                  {notification.post?.caption && (
                                    <p className="notification-post-caption">
                                      “{notification.post.caption}”
                                    </p>
                                  )}

                                  <span className="notification-time">
                                    {formatPostTime(notification.createdAt)}
                                  </span>

                                  {!notification.isRead && (
                                    <button
                                      className="follow-button notification-read-button"
                                      type="button"
                                      onClick={() =>
                                        markNotificationRead(notificationId)
                                      }
                                      disabled={notificationBusy}
                                    >
                                      Mark as read
                                    </button>
                                  )}
                                </div>

                                {!notification.isRead && (
                                  <span
                                    className="notification-unread-dot"
                                    aria-label="Unread"
                                    title="Unread"
                                  />
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                  </>
                )}
              </section>
            )}
          </section>

          <aside className="right-column">
            <section className="welcome-card">
              <span className="welcome-kicker">A PLACE TO BELONG</span>
              <h2>
                Small moments.
                <br />
                Meaningful connections.
              </h2>
              <p>
                A community grows one conversation at a time. Make yourself
                at home.
              </p>
              <div className="welcome-decoration" aria-hidden="true">
                <span>g.</span>
              </div>
            </section>

            <section className="suggestions-section">
              <div className="section-heading">
                <h2>People to know</h2>
                <button
                  type="button"
                  onClick={() => setActiveNav("Discover")}
                >
                  See all
                </button>
              </div>

              {searchResults.slice(0, 3).map((person) => {
                const personId = String(person.id || person._id || "");
                const isFollowing = followingIds.includes(personId);

                return (
                  <div
                    className="suggestion"
                    key={personId || person.username}
                  >
                    <button
                      className="member-profile-button"
                      type="button"
                      onClick={() => openProfile(personId)}
                    >
                      <Avatar
                        initials={getInitials(person)}
                        imageUrl={person.profilePicture || ""}
                      />
                      <span className="suggestion-info">
                        <strong>
                          {person.displayName || person.username}
                        </strong>
                        <span>@{person.username}</span>
                      </span>
                    </button>
                    <button
                      className="follow-button"
                      type="button"
                      onClick={() => toggleFollow(personId)}
                      disabled={
                        !personId || followBusyIds.includes(personId)
                      }
                    >
                      {followBusyIds.includes(personId)
                        ? "Saving..."
                        : isFollowing
                          ? "Following"
                          : "Follow"}
                    </button>
                  </div>
                );
              })}

              {searchResults.length === 0 && (
                <p className="demo-notice">
                  Search for members using the search bar above.
                </p>
              )}
            </section>

            <section className="community-note">
              <span className="note-icon">✳</span>
              <div>
                <strong>Make room for good things.</strong>
                <p>
                  Share what inspires you. Celebrate someone else's win. Stay
                  curious.
                </p>
              </div>
            </section>

            <footer className="site-footer">
              <span>About</span>
              <span>Community guidelines</span>
              <span>Privacy</span>
              <span>© 2026 Gather</span>
            </footer>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;