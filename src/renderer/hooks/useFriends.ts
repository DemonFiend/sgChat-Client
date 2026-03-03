import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';

export interface Friend {
  id: string;
  username: string;
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
    queryFn: () => api.get<Friend[]>('/api/users/@me/friends'),
  });
}

export function useFriendRequests() {
  return useQuery({
    queryKey: ['friend-requests'],
    queryFn: () => api.get<FriendRequest[]>('/api/users/@me/friend-requests'),
  });
}

export function useSendFriendRequest() {
  return useMutation({
    mutationFn: (username: string) =>
      api.post('/api/users/@me/friend-requests', { username }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });
}

export function useAcceptFriendRequest() {
  return useMutation({
    mutationFn: (requestId: string) =>
      api.post(`/api/users/@me/friend-requests/${requestId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });
}

export function useRemoveFriend() {
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/api/users/@me/friends/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}
