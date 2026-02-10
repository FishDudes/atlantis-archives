import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import { DISCORD_ROLES } from "@shared/schema";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const refreshRolesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/refresh-roles", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to refresh roles");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
    },
  });

  const logout = () => {
    window.location.href = "/api/logout";
  };

  const userRoles = user?.discordRoles || [];
  const isAdmin = DISCORD_ROLES.ADMIN_ROLES.some((r) => userRoles.includes(r));

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    userRoles,
    isAdmin,
    refreshRoles: refreshRolesMutation.mutate,
    isRefreshingRoles: refreshRolesMutation.isPending,
  };
}
