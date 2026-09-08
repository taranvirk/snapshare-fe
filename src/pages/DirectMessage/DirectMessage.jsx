import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth } from "../../auth/Auth";
import Avatar from "../../components/Avatar/Avatar";
import EmptyState from "../../components/EmptyState/EmptyState";
import { getRelativeDate } from "../../utils/DateFormatter";
import {
  getOrCreateConversation,
  insertMessage,
  listConversations,
  listRegisteredUsers,
  loadConversationMessages,
  subscribeToMessages,
} from "./messagingService";
import { mergeMessage, messageBelongsToConversation } from "./messageUtils";

const isMessagingSchemaError = (error) =>
  error?.code === "PGRST202"
  || error?.code === "PGRST204"
  || error?.code === "PGRST205"
  || /conversations|messages|get_or_create_conversation/i.test(error?.message ?? "");

const friendlyError = (error, fallback) =>
  isMessagingSchemaError(error)
    ? "Messaging needs its Supabase migration before it can be used. Run the included messaging SQL in the frontend's Supabase project."
    : fallback;

const conversationTimestamp = (conversation) =>
  new Date(conversation.last_message_at || conversation.created_at || 0).getTime();

export default function DirectMessage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const bottomRef = useRef(null);
  const activeConversationIdRef = useRef(null);
  const conversationRequestRef = useRef(0);
  const conversationsRef = useRef([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(searchParams.get("conversation"));
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationError, setConversationError] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("CONNECTING");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [newMessageQuery, setNewMessageQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [startingConversationId, setStartingConversationId] = useState(null);
  const requestedUserId = location.state?.userId;

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return conversations;
    return conversations.filter((conversation) =>
      conversation.otherUser.username?.toLowerCase().includes(normalizedQuery));
  }, [conversations, query]);

  const filteredRegisteredUsers = useMemo(() => {
    const normalizedQuery = newMessageQuery.trim().toLowerCase();
    if (!normalizedQuery) return registeredUsers;
    return registeredUsers.filter((profile) =>
      profile.username?.toLowerCase().includes(normalizedQuery));
  }, [newMessageQuery, registeredUsers]);

  const refreshConversations = useCallback(async () => {
    const nextConversations = await listConversations(user.id);
    conversationsRef.current = nextConversations;
    setConversations(nextConversations);
    return nextConversations;
  }, [user.id]);

  const selectConversation = useCallback((conversationId, { replace = false } = {}) => {
    setActiveConversationId(conversationId);
    activeConversationIdRef.current = conversationId;
    setSearchParams(conversationId ? { conversation: conversationId } : {}, { replace });
  }, [setSearchParams]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    let cancelled = false;

    async function initialiseConversations() {
      setLoadingConversations(true);
      setConversationError("");
      try {
        let requestedConversationId = null;
        if (requestedUserId && requestedUserId !== user.id) {
          requestedConversationId = await getOrCreateConversation(requestedUserId);
        }
        const nextConversations = await listConversations(user.id);
        if (cancelled) return;
        conversationsRef.current = nextConversations;
        setConversations(nextConversations);

        const urlConversationId = searchParams.get("conversation");
        const nextActiveId = requestedConversationId || urlConversationId;
        if (nextActiveId && nextConversations.some(({ id }) => id === nextActiveId)) {
          setActiveConversationId(nextActiveId);
          activeConversationIdRef.current = nextActiveId;
        } else if (urlConversationId) {
          setActiveConversationId(null);
          activeConversationIdRef.current = null;
          setSearchParams({}, { replace: true });
        }

        if (requestedConversationId) {
          navigate(`/direct-message?conversation=${encodeURIComponent(requestedConversationId)}`, {
            replace: true,
            state: null,
          });
        }
      } catch (error) {
        if (!cancelled) setConversationError(friendlyError(error, "We couldn't load your conversations. Please try again."));
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    }

    initialiseConversations();
    return () => { cancelled = true; };
    // Search params are read once here so changing the selected conversation does not reload the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, requestedUserId, setSearchParams, user.id]);

  useEffect(() => {
    if (loadingConversations) return;
    const urlConversationId = searchParams.get("conversation");
    const validConversationId = conversations.some(({ id }) => id === urlConversationId) ? urlConversationId : null;
    if (validConversationId !== activeConversationId) {
      setActiveConversationId(validConversationId);
      activeConversationIdRef.current = validConversationId;
    }
  }, [activeConversationId, conversations, loadingConversations, searchParams]);

  const loadMessages = useCallback(async (conversationId) => {
    const requestId = ++conversationRequestRef.current;
    setLoadingMessages(true);
    setMessageError("");
    setMessages([]);
    try {
      const nextMessages = await loadConversationMessages(conversationId);
      if (requestId === conversationRequestRef.current) {
        setMessages((current) => nextMessages.reduce(
          (merged, message) => mergeMessage(merged, message),
          current.filter((message) => messageBelongsToConversation(message, conversationId)),
        ));
      }
    } catch (error) {
      if (requestId === conversationRequestRef.current) {
        setMessageError(friendlyError(error, "We couldn't load this conversation. Please try again."));
      }
    } finally {
      if (requestId === conversationRequestRef.current) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      conversationRequestRef.current += 1;
      setMessages([]);
      setMessageError("");
      setLoadingMessages(false);
      return;
    }
    loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(
      user.id,
      (incomingMessage) => {
        if (incomingMessage.sender_id !== user.id && incomingMessage.recipient_id !== user.id) return;

        if (messageBelongsToConversation(incomingMessage, activeConversationIdRef.current)) {
          setMessages((current) => mergeMessage(current, incomingMessage));
        }

        const knownConversation = conversationsRef.current.some(({ id }) => id === incomingMessage.conversation_id);
        if (knownConversation) {
          setConversations((current) => {
            const updated = current.map((conversation) => conversation.id === incomingMessage.conversation_id
              ? {
                ...conversation,
                last_message_at: incomingMessage.created_at,
                last_message_preview: incomingMessage.body,
                last_sender_id: incomingMessage.sender_id,
              }
              : conversation);
            updated.sort((left, right) => conversationTimestamp(right) - conversationTimestamp(left));
            conversationsRef.current = updated;
            return updated;
          });
        } else {
          refreshConversations().catch(() => undefined);
        }
      },
      setRealtimeStatus,
    );

    return unsubscribe;
  }, [refreshConversations, user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: loadingMessages ? "auto" : "smooth" });
  }, [loadingMessages, messages]);

  const openNewMessageDialog = async () => {
    setShowNewMessage(true);
    setLoadingUsers(true);
    try {
      setRegisteredUsers(await listRegisteredUsers(user.id));
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't load Snapshare members."));
    } finally {
      setLoadingUsers(false);
    }
  };

  const startConversation = async (otherUserId) => {
    setStartingConversationId(otherUserId);
    try {
      const conversationId = await getOrCreateConversation(otherUserId);
      await refreshConversations();
      setShowNewMessage(false);
      setNewMessageQuery("");
      selectConversation(conversationId);
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't start this conversation."));
    } finally {
      setStartingConversationId(null);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeConversation || body.length > 2000) return;

    const clientMessageId = crypto.randomUUID();
    const optimisticMessage = {
      id: `pending-${clientMessageId}`,
      conversation_id: activeConversation.id,
      sender_id: user.id,
      recipient_id: activeConversation.otherUserId,
      body,
      client_message_id: clientMessageId,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setMessages((current) => mergeMessage(current, optimisticMessage));
    setDraft("");
    setMessageError("");

    try {
      const savedMessage = await insertMessage({
        conversationId: activeConversation.id,
        senderId: user.id,
        recipientId: activeConversation.otherUserId,
        body,
        clientMessageId,
      });
      if (messageBelongsToConversation(savedMessage, activeConversationIdRef.current)) {
        setMessages((current) => mergeMessage(current, savedMessage));
      }
    } catch (error) {
      if (activeConversationIdRef.current === activeConversation.id) {
        setMessages((current) => current.filter((message) => message.client_message_id !== clientMessageId));
        setDraft((current) => current || body);
      }
      toast.error(friendlyError(error, "Message not sent. Please try again."));
    }
  };

  const closeConversation = () => selectConversation(null);
  const realtimeConnected = realtimeStatus === "SUBSCRIBED";

  return (
    <main className={`messages-page ${activeConversation ? "messages-page--chat-open" : ""}`}>
      <aside className="conversation-list">
        <header>
          <div><span className="eyebrow">Private and personal</span><h1>Messages</h1></div>
          <div className="conversation-list__actions">
            <span className={`connection-dot ${realtimeConnected ? "connected" : ""}`} title={realtimeConnected ? "Live updates connected" : "Connecting live updates"} />
            <button className="new-message-button" type="button" onClick={openNewMessageDialog} aria-label="Start a new conversation"><PlusIcon /></button>
          </div>
        </header>
        <label className="conversation-search"><MagnifyingGlassIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" /></label>
        <div className="conversation-list__items">
          {loadingConversations ? (
            <div className="discovery-loading"><span className="spinner" />Loading conversations</div>
          ) : conversationError ? (
            <div className="messages-error" role="alert"><ExclamationCircleIcon /><p>{conversationError}</p><button className="button button--secondary" type="button" onClick={() => window.location.reload()}>Try again</button></div>
          ) : filteredConversations.length ? filteredConversations.map((conversation) => (
            <button key={conversation.id} type="button" className={`conversation-row ${activeConversation?.id === conversation.id ? "conversation-row--active" : ""}`} onClick={() => selectConversation(conversation.id)}>
              <Avatar src={conversation.otherUser.profile_picture_url} name={conversation.otherUser.username} size="md" />
              <span><strong>{conversation.otherUser.username}</strong><small>{conversation.last_message_preview || "Start the conversation"}</small></span>
              <time dateTime={conversation.last_message_at || conversation.created_at}>{getRelativeDate(conversation.last_message_at || conversation.created_at)}</time>
            </button>
          )) : (
            <EmptyState icon={<ChatBubbleLeftRightIcon />} title={query ? "No matching conversations" : "No conversations yet"} body={query ? "Try another name." : "Start a private conversation with another Snapshare member."} action={!query ? <button className="button button--secondary" type="button" onClick={openNewMessageDialog}>New message</button> : undefined} />
          )}
        </div>
      </aside>

      <section className="chat-panel">
        {activeConversation ? (
          <>
            <header className="chat-header">
              <button className="icon-button chat-back" type="button" onClick={closeConversation} aria-label="Back to conversations"><ArrowLeftIcon /></button>
              <Link to={`/${activeConversation.otherUser.username}`}><Avatar src={activeConversation.otherUser.profile_picture_url} name={activeConversation.otherUser.username} size="sm" /><span><strong>{activeConversation.otherUser.username}</strong><small>{realtimeConnected ? "Live conversation" : "Connecting live updates…"}</small></span></Link>
            </header>
            <div className="message-stream" aria-live="polite">
              {loadingMessages ? (
                <div className="discovery-loading"><span className="spinner" />Loading messages</div>
              ) : messageError ? (
                <div className="messages-error" role="alert"><ExclamationCircleIcon /><p>{messageError}</p><button className="button button--secondary" type="button" onClick={() => loadMessages(activeConversation.id)}>Try again</button></div>
              ) : messages.length ? messages.map((message) => {
                const mine = message.sender_id === user.id;
                return <div className={`message-bubble ${mine ? "message-bubble--mine" : ""} ${message.pending ? "message-bubble--pending" : ""}`} key={message.id}><p>{message.body}</p><span>{message.pending ? "Sending…" : getRelativeDate(message.created_at)}</span></div>;
              }) : (
                <div className="conversation-start"><Avatar src={activeConversation.otherUser.profile_picture_url} name={activeConversation.otherUser.username} size="xl" /><h2>Say hello to {activeConversation.otherUser.username}</h2><p>This is the beginning of your conversation.</p></div>
              )}
              <div ref={bottomRef} />
            </div>
            <form className="message-composer" onSubmit={sendMessage}>
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${activeConversation.otherUser.username}`} aria-label={`Message ${activeConversation.otherUser.username}`} maxLength={2000} autoComplete="off" />
              <button type="submit" disabled={!draft.trim()} aria-label="Send message"><PaperAirplaneIcon /></button>
            </form>
          </>
        ) : <EmptyState icon={<ChatBubbleLeftRightIcon />} title="Choose a conversation" body="Select a conversation or start a new one." action={<button className="button button--secondary" type="button" onClick={openNewMessageDialog}>New message</button>} />}
      </section>

      {showNewMessage && (
        <div className="message-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNewMessage(false); }}>
          <section className="message-dialog" role="dialog" aria-modal="true" aria-labelledby="new-message-title">
            <header><div><span className="eyebrow">Direct message</span><h2 id="new-message-title">Start a conversation</h2></div><button className="icon-button" type="button" onClick={() => setShowNewMessage(false)} aria-label="Close"><XMarkIcon /></button></header>
            <label className="conversation-search"><MagnifyingGlassIcon /><input autoFocus value={newMessageQuery} onChange={(event) => setNewMessageQuery(event.target.value)} placeholder="Search people" /></label>
            <div className="message-dialog__results">
              {loadingUsers ? <div className="discovery-loading"><span className="spinner" />Loading people</div> : filteredRegisteredUsers.length ? filteredRegisteredUsers.map((profile) => (
                <button className="conversation-row" type="button" key={profile.user_id} onClick={() => startConversation(profile.user_id)} disabled={startingConversationId === profile.user_id}><Avatar src={profile.profile_picture_url} name={profile.username} size="md" /><span><strong>{profile.username}</strong><small>{profile.user_bio || "Snapshare member"}</small></span>{startingConversationId === profile.user_id ? <span className="spinner" /> : <ChatBubbleLeftRightIcon />}</button>
              )) : <p className="message-dialog__empty">{newMessageQuery ? "No people match that search." : "No other registered users found."}</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
