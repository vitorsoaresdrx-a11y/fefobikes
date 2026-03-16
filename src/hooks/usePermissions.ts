import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Module keys matching the DB enum
export type AppModule =
  | "dashboard"
  | "dre"
  | "produtos"
  | "bikes"
  | "estoque"
  | "pdv"
  | "caixa"
  | "historico"
  | "mecanica"
  | "gastos"
  | "clientes"
  | "whatsapp"
  | "configuracoes";

export const ALL_MODULES: { key: AppModule; label: string }[] = [
  { key: "dashboard", label: "Ações Rápidas" },
  { key: "dre", label: "Dashboard / DRE" },
  { key: "produtos", label: "Produtos" },
  { key: "bikes", label: "Bikes" },
  { key: "estoque", label: "Estoque" },
  { key: "pdv", label: "PDV" },
  { key: "caixa", label: "Caixa" },
  { key: "historico", label: "Histórico" },
  { key: "mecanica", label: "Mecânica" },
  { key: "gastos", label: "Gastos" },
  { key: "clientes", label: "Clientes" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "configuracoes", label: "Configurações" },
];

// Map route paths to module keys
export const ROUTE_MODULE_MAP: Record<string, AppModule> = {
  "/": "dashboard",
  "/dre": "dre",
  "/produtos": "produtos",
  "/bikes": "bikes",
  "/bikes/nova": "bikes",
  "/estoque": "estoque",
  "/pdv": "pdv",
  "/caixa": "caixa",
  "/historico": "historico",
  "/mecanica": "mecanica",
  "/mecanicos": "mecanica",
  "/mecanicos/historico": "mecanica",
  "/orcamentos": "mecanica",
  "/gastos": "gastos",
  "/clientes": "clientes",
  "/whatsapp": "whatsapp",
  "/configuracoes": "configuracoes",
};

// Map sidebar nav URLs to module keys
export const NAV_MODULE_MAP: Record<string, AppModule> = {
  "/": "dashboard",
  "/dre": "dre",
  "/produtos": "produtos",
  "/bikes": "bikes",
  "/estoque": "estoque",
  "/pdv": "pdv",
  "/caixa": "caixa",
  "/historico": "historico",
  "/mecanica": "mecanica",
  "/mecanicos": "mecanica",
  "/mecanicos/historico": "mecanica",
  "/orcamentos": "mecanica",
  "/gastos": "gastos",
  "/clientes": "clientes",
  "/whatsapp": "whatsapp",
  "/configuracoes": "configuracoes",
  "/ponto/cadastro": "configuracoes",
};

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
  email?: string;
}

export interface ModulePermission {
  id: string;
  tenant_member_id: string;
  module: AppModule;
  can_access: boolean;
  hide_sensitive: boolean;
}

const PERMISSIONS_KEY = ["permissions"];
const TENANT_KEY = ["tenant"];

// ─── Current user's own permissions ─────────────────────────────────────────

export function useMyPermissions() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: [...PERMISSIONS_KEY, "my", userId],
    queryFn: async () => {
      // Get my tenant membership
      const { data: member } = await supabase
        .from("tenant_members")
        .select("*")
        .eq("user_id", userId!)
        .single();

      if (!member) return { isOwner: false, permissions: [] as ModulePermission[], memberId: null };

      const isOwner = member.role === "owner";

      // Owners have full access, no need to fetch permissions
      if (isOwner) return { isOwner: true, permissions: [] as ModulePermission[], memberId: member.id };

      const { data: permissions } = await supabase
        .from("module_permissions")
        .select("*")
        .eq("tenant_member_id", member.id);

      return {
        isOwner: false,
        permissions: (permissions || []) as unknown as ModulePermission[],
        memberId: member.id,
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

// Helper hook: can user access a specific module?
export function useCanAccess(module: AppModule): { canAccess: boolean; hideSensitive: boolean; loading: boolean } {
  const { data, isLoading } = useMyPermissions();

  if (isLoading || !data) return { canAccess: true, hideSensitive: false, loading: true };

  // Owners can access everything
  if (data.isOwner) return { canAccess: true, hideSensitive: false, loading: false };

  const perm = data.permissions.find((p) => p.module === module);

  // If no permission record exists, deny by default for members
  if (!perm) return { canAccess: false, hideSensitive: false, loading: false };

  return { canAccess: perm.can_access, hideSensitive: perm.hide_sensitive, loading: false };
}

// ─── Owner: manage tenant members ───────────────────────────────────────────

export function useTenantMembers() {
  const { session } = useAuth();

  return useQuery({
    queryKey: [...TENANT_KEY, "members"],
    queryFn: async () => {
      const { data: members } = await supabase
        .from("tenant_members")
        .select("*")
        .order("created_at");

      return (members || []) as unknown as TenantMember[];
    },
    enabled: !!session?.user?.id,
  });
}

export function useMemberPermissions(memberId: string | null) {
  return useQuery({
    queryKey: [...PERMISSIONS_KEY, "member", memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from("module_permissions")
        .select("*")
        .eq("tenant_member_id", memberId!);

      return (data || []) as unknown as ModulePermission[];
    },
    enabled: !!memberId,
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      // First get the user's tenant
      const { data: myMember } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", session!.user.id)
        .single();

      if (!myMember) throw new Error("Tenant não encontrado");

      // Create a Supabase user invite (they'll get an email)
      // For now, we create the member record - the user needs to already have an account
      // We look up the user by email via profiles or auth
      const { data: invitedUser } = await supabase
        .from("profiles")
        .select("id")
        .ilike("full_name", `%${email}%`)
        .limit(1);

      // Since we can't query auth.users, we'll use the invite flow:
      // The owner provides the user_id or the user signs up and gets added
      // For simplicity, we'll use Supabase admin invite via edge function
      throw new Error("Use o ID do usuário ou peça para o membro criar conta primeiro");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...TENANT_KEY, "members"] }),
  });
}

export function useAddMemberById() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { data: myMember } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", session!.user.id)
        .single();

      if (!myMember) throw new Error("Tenant não encontrado");

      const { error } = await supabase.from("tenant_members").insert({
        tenant_id: myMember.tenant_id,
        user_id: userId,
        role: "member",
      });

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...TENANT_KEY, "members"] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("tenant_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...TENANT_KEY, "members"] }),
  });
}

export function useUpsertPermission() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantMemberId,
      module,
      canAccess,
      hideSensitive,
    }: {
      tenantMemberId: string;
      module: AppModule;
      canAccess: boolean;
      hideSensitive: boolean;
    }) => {
      const { error } = await supabase
        .from("module_permissions")
        .upsert(
          {
            tenant_member_id: tenantMemberId,
            module,
            can_access: canAccess,
            hide_sensitive: hideSensitive,
          },
          { onConflict: "tenant_member_id,module" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERMISSIONS_KEY });
    },
  });
}
