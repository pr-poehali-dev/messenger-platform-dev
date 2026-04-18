const BASE_URL = "https://functions.poehali.dev/91cb32a3-61a7-466c-aada-390e31f979e3";

function getToken(): string {
  return localStorage.getItem("token") || "";
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}/?_path=${encodeURIComponent(path)}`;
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Auth-Token": token } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export const api = {
  // AUTH
  register: (username: string, display_name: string, email: string, password: string) =>
    request("/register", { method: "POST", body: JSON.stringify({ username, display_name, email, password }) }),

  login: (login: string, password: string) =>
    request("/login", { method: "POST", body: JSON.stringify({ login, password }) }),

  logout: () =>
    request("/logout", { method: "POST" }),

  me: () => request("/me"),

  updateProfile: (data: { display_name?: string; bio?: string; status?: string; avatar_url?: string }) =>
    request("/profile", { method: "PUT", body: JSON.stringify(data) }),

  // CHATS
  getChats: () => request("/chats"),

  createChat: (type: string, name: string, member_ids: number[]) =>
    request("/chats", { method: "POST", body: JSON.stringify({ type, name, member_ids }) }),

  getMessages: (chatId: number, limit = 50, offset = 0) =>
    request(`/chats/${chatId}/messages?limit=${limit}&offset=${offset}`),

  sendMessage: (chatId: number, text: string, reply_to?: number) =>
    request(`/chats/${chatId}/messages`, { method: "POST", body: JSON.stringify({ text, reply_to }) }),

  editMessage: (msgId: number, text: string) =>
    request(`/messages/${msgId}`, { method: "PUT", body: JSON.stringify({ text }) }),

  deleteMessage: (msgId: number) =>
    request(`/messages/${msgId}`, { method: "DELETE" }),

  // CONTACTS
  getContacts: () => request("/contacts"),

  searchUsers: (q: string) => request(`/contacts/search?q=${encodeURIComponent(q)}`),

  addContact: (contact_id: number) =>
    request("/contacts", { method: "POST", body: JSON.stringify({ contact_id }) }),

  removeContact: (contactId: number) =>
    request(`/contacts/${contactId}`, { method: "DELETE" }),

  // CHANNELS
  getChannels: () => request("/channels"),

  createChannel: (name: string, description: string, is_public: boolean) =>
    request("/channels", { method: "POST", body: JSON.stringify({ name, description, is_public }) }),

  subscribeChannel: (channelId: number) =>
    request(`/channels/${channelId}/subscribe`, { method: "POST" }),

  unsubscribeChannel: (channelId: number) =>
    request(`/channels/${channelId}/unsubscribe`, { method: "POST" }),

  getChannelPosts: (channelId: number) =>
    request(`/channels/${channelId}/posts`),

  createPost: (channelId: number, text: string) =>
    request(`/channels/${channelId}/posts`, { method: "POST", body: JSON.stringify({ text }) }),

  // NOTIFICATIONS
  getNotifications: () => request("/notifications"),

  markAllRead: () => request("/notifications/read-all", { method: "POST" }),

  // SEARCH
  search: (q: string) => request(`/search?q=${encodeURIComponent(q)}`),
};
