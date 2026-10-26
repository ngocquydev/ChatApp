import api from './api';

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
  relationStatus: string;
  requestId?: string;
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

  const { data } = await api.post('/graphql', {
    query,
    variables: { limit },
  });

  if (data?.errors && data.errors.length > 0) {
    throw new Error(data.errors[0].message);
  }

  return data?.data?.suggestedFriends || [];
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

  const { data } = await api.post('/graphql', {
    query,
    variables: { name, limit },
  });

  if (data?.errors && data.errors.length > 0) {
    throw new Error(data.errors[0].message);
  }

  return data?.data?.searchFriends || [];
}
