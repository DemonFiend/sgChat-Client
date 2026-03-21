import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';

export interface RoleReactionMapping {
  id: string;
  emoji: string;
  emoji_type: 'unicode' | 'custom';
  custom_emoji_id?: string | null;
  role_id: string;
  role_name?: string;
  role_color?: string | null;
  position: number;
}

export interface RoleReactionGroup {
  id: string;
  name: string;
  description?: string;
  channel_id: string;
  message_id?: string;
  server_id: string;
  /** Server returns `enabled`; aliased to `is_active` for UI convenience */
  is_active: boolean;
  exclusive: boolean;
  created_at: string;
  mappings: RoleReactionMapping[];
}

export function useRoleReactions(serverId: string | null) {
  return useQuery({
    queryKey: ['role-reactions', serverId],
    queryFn: async () => {
      const res = await api.get<{ groups: any[] }>(`/api/servers/${serverId}/role-reactions`);
      // Server returns `enabled`; map to `is_active` for the client interface
      return (res.groups || []).map((g) => ({
        ...g,
        is_active: g.enabled ?? g.is_active ?? false,
      })) as RoleReactionGroup[];
    },
    enabled: !!serverId,
  });
}

export function useSetupDefaultRoleReactions(serverId: string) {
  return useMutation({
    mutationFn: () =>
      api.post(`/api/servers/${serverId}/role-reactions/setup`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-reactions', serverId] });
    },
  });
}

export function useCreateRoleReactionGroup(serverId: string) {
  return useMutation({
    mutationFn: (data: { name: string; description?: string; channel_id: string; exclusive?: boolean }) =>
      api.post<RoleReactionGroup>(`/api/servers/${serverId}/role-reactions/groups`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-reactions', serverId] });
    },
  });
}

export function useUpdateRoleReactionGroup(serverId: string) {
  return useMutation({
    mutationFn: ({ groupId, ...data }: { groupId: string; name?: string; description?: string; channel_id?: string; exclusive?: boolean }) =>
      api.patch(`/api/servers/${serverId}/role-reactions/groups/${groupId}`, data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['role-reactions', serverId] });
      const previous = queryClient.getQueryData<RoleReactionGroup[]>(['role-reactions', serverId]);
      queryClient.setQueryData<RoleReactionGroup[]>(['role-reactions', serverId], (old) =>
        old?.map((g) => g.id === variables.groupId ? { ...g, ...variables, id: g.id } : g),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['role-reactions', serverId], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['role-reactions', serverId] });
    },
  });
}

export function useDeleteRoleReactionGroup(serverId: string) {
  return useMutation({
    mutationFn: (groupId: string) =>
      api.delete(`/api/servers/${serverId}/role-reactions/groups/${groupId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-reactions', serverId] });
    },
  });
}

export function useToggleRoleReactionGroup(serverId: string) {
  return useMutation({
    mutationFn: ({ groupId, enabled }: { groupId: string; enabled: boolean }) =>
      api.patch(`/api/servers/${serverId}/role-reactions/groups/${groupId}/toggle`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-reactions', serverId] });
    },
  });
}

export function useAddRoleReactionMapping(serverId: string) {
  return useMutation({
    mutationFn: ({ groupId, ...data }: {
      groupId: string;
      emoji?: string;
      emoji_type: 'unicode' | 'custom';
      custom_emoji_id?: string;
      role_id: string;
    }) =>
      api.post(`/api/servers/${serverId}/role-reactions/groups/${groupId}/mappings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-reactions', serverId] });
    },
  });
}

export function useDeleteRoleReactionMapping(serverId: string) {
  return useMutation({
    mutationFn: ({ groupId, mappingId }: { groupId: string; mappingId: string }) =>
      api.delete(`/api/servers/${serverId}/role-reactions/groups/${groupId}/mappings/${mappingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-reactions', serverId] });
    },
  });
}

export function useReorderRoleReactionMappings(serverId: string) {
  return useMutation({
    mutationFn: ({ groupId, mappingIds }: { groupId: string; mappingIds: string[] }) =>
      api.patch(`/api/servers/${serverId}/role-reactions/groups/${groupId}/mappings/reorder`, { mapping_ids: mappingIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-reactions', serverId] });
    },
  });
}

export function useFormatRoleReactionChannel(serverId: string) {
  return useMutation({
    mutationFn: (channelId: string) =>
      api.post(`/api/servers/${serverId}/role-reactions/format-channel`, { channel_id: channelId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-reactions', serverId] });
    },
  });
}
