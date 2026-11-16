import api from './api';

export class GraphQLQueryError extends Error {
  constructor(message: string, readonly statusCode?: number) { super(message); }
}

export async function requestGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  type Response = {
    data?: T;
    errors?: { message: string; extensions?: { code?: string; originalError?: { statusCode?: number } } }[];
  };
  const request = () => api.post<Response>('/graphql', { query, variables });
  let { data } = await request();
  if (data.errors?.some((error) => error.extensions?.code === 'UNAUTHENTICATED' || error.extensions?.originalError?.statusCode === 401)) {
    await api.get('/auth/profile');
    ({ data } = await request());
  }
  if (data.errors?.length) {
    const error = data.errors[0];
    const code = error.extensions?.code;
    const status = error.extensions?.originalError?.statusCode ?? (code === 'NOT_FOUND' ? 404 : code === 'BAD_REQUEST' ? 400 : undefined);
    throw new GraphQLQueryError(error.message, status);
  }
  if (!data.data) throw new GraphQLQueryError('GraphQL response is missing');
  return data.data;
}

export interface UserSuggestionGql {
  _id: string;
  name: string;
  avatar?: string;
  bio?: string;
  mutualFriendsCount: number;
  mutualFriendNames: string[];
  reason: string;
  score?: number;
}

export interface SearchUserGql {
  _id: string;
  name: string;
  avatar?: string;
  bio?: string;
  relationStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  requestId?: string;
}

export async function searchFriendsPage(query: string, limit = 20, after?: string | null): Promise<{
  users: SearchUserGql[]; hasMore: boolean; nextCursor: string | null;
}> {
  const data = await requestGraphQL<{ searchUsersPage: { users: SearchUserGql[]; hasMore: boolean; nextCursor: string | null } }>(
    `query SearchUsersPage($query: String!, $limit: Int, $after: String) {
      searchUsersPage(query: $query, limit: $limit, after: $after) {
        users { _id name avatar bio relationStatus requestId } hasMore nextCursor
      }
    }`,
    { query, limit, after: after ?? null },
  );
  return data.searchUsersPage;
}

/**
 * Lấy danh sách gợi ý kết bạn qua cổng GraphQL Gateway (sử dụng đồ thị Neo4j)
 */
export async function fetchSuggestedFriendsGql(limit = 10): Promise<UserSuggestionGql[]> {
  const query = `
    query GetSuggestedFriends($limit: Int) {
      suggestedFriends(limit: $limit) {
        _id
        name
        avatar
        bio
        mutualFriendsCount
        mutualFriendNames
        reason
        score
      }
    }
  `;

  const data = await requestGraphQL<{ suggestedFriends: UserSuggestionGql[] }>(query, { limit });
  return data.suggestedFriends;
}

/**
 * Tìm kiếm bạn bè chỉ theo tên qua GraphQL Gateway
 */
export async function searchFriendsGql(name: string, limit = 20): Promise<SearchUserGql[]> {
  const query = `
    query SearchFriends($name: String!, $limit: Int) {
      searchFriends(name: $name, limit: $limit) {
        _id
        name
        avatar
        bio
        relationStatus
        requestId
      }
    }
  `;

  const data = await requestGraphQL<{ searchFriends: SearchUserGql[] }>(query, { name, limit });
  return data.searchFriends;
}
