import { useQuery, useMutation } from '@tanstack/react-query';
import { api, ensureArray } from '../lib/api';
import { queryClient } from '../lib/queryClient';

export interface Friend {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  status?: string;
}

export interface FriendRequest {
  id: string;
  from_user: { id: string; username: string; avatar_url?: string };
  to_user: { id: string; username: string; avatar_url?: string };
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export function useFriends() {
  return useQuery({
    queryKey: ['friends'],
    queryFn: async () => ensureArray<Friend>(await api.get('/api/friends/')),
  });
}

export function useFriendRequests() {
  return useQuery({
    queryKey: ['friend-requests'],
    queryFn: () => api.get<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/api/friends/requests'),
  });
}

export function useSendFriendRequest() {
  return useMutation({
    mutationFn: (username: string) =>
      api.post('/api/friends/requests', { username }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });
}

export function useAcceptFriendRequest() {
  return useMutation({
    mutationFn: (requestId: string) =>
      api.post(`/api/friends/requests/${requestId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });
}

export function useRemoveFriend() {
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/api/friends/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

export interface BlockedUser {
  id: string;
  username: string;
  avatar_url?: string;
  blocked_at?: string;
}

export function useBlockedUsers() {
  return useQuery({
    queryKey: ['blocked-users'],
    queryFn: async () => ensureArray<BlockedUser>(await api.get('/api/users/blocked')),
  });
}

export function useBlockUser() {
  return useMutation({
    mutationFn: (userId: string) =>
      api.post(`/api/users/${userId}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
  });
}

export function useUnblockUser() {
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/api/users/${userId}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    },
  });
}
