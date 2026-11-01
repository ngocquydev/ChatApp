export type SupportedLanguage = "vi" | "en";

export interface TranslationDictionary {
  common: {
    loading: string;
    error: string;
    retry: string;
    confirm: string;
    cancel: string;
    close: string;
    save: string;
    edit: string;
    delete: string;
    share: string;
    back: string;
    search: string;
    seeMore: string;
    seeLess: string;
    empty: string;
    all: string;
    online: string;
    offline: string;
    comingSoon: string;
  };
  nav: {
    home: string;
    explore: string;
    messages: string;
    friends: string;
    notifications: string;
    profile: string;
    settings: string;
    logout: string;
    login: string;
    register: string;
    language: string;
    theme: string;
    skipToContent: string;
    openSettings: string;
    searchPlaceholder: string;
  };
  feed: {
    title: string;
    exploreFriends: string;
    whatsOnYourMind: string;
    post: string;
    posting: string;
    photosVideos: string;
    privacy: string;
    privacyPublic: string;
    privacyFriends: string;
    privacyOnlyMe: string;
    like: string;
    comment: string;
    commentsCount: string;
    sharesCount: string;
    shareToTimeline: string;
    noPostsTitle: string;
    noPostsDesc: string;
    endOfPosts: string;
    deletePostTitle: string;
    deletePostDesc: string;
    postCreated: string;
    postUpdated: string;
    postDeleted: string;
  };
  chat: {
    recentChats: string;
    seeAll: string;
    typeMessage: string;
    searchPlaceholder: string;
    noConversations: string;
    activeNow: string;
    messageRecalled: string;
  };
  friends: {
    title: string;
    requests: string;
    noRequests: string;
    accept: string;
    reject: string;
    unfriend: string;
    addFriend: string;
    cancelRequest: string;
    friendsCount: string;
  };
  notifications: {
    title: string;
    markAllRead: string;
    noNotifications: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    registerTitle: string;
    registerSubtitle: string;
    email: string;
    password: string;
    confirmPassword: string;
    fullName: string;
    forgotPassword: string;
    alreadyHaveAccount: string;
    dontHaveAccount: string;
    loggingIn: string;
  };
}

