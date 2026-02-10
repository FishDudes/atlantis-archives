import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type DocumentInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// Fetch all documents with optional filters
export function useDocuments(filters?: { search?: string; category?: string; sortBy?: 'updated' | 'title' }) {
  // Construct query key based on filters to ensure refetch on change
  const queryKey = [api.documents.list.path, filters];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      // Build query params string
      const params = new URLSearchParams();
      if (filters?.search) params.append("search", filters.search);
      if (filters?.category) params.append("category", filters.category);
      if (filters?.sortBy) params.append("sortBy", filters.sortBy);
      
      const url = `${api.documents.list.path}?${params.toString()}`;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch documents");
      
      // Using Zod schema to parse/validate
      return api.documents.list.responses[200].parse(await res.json());
    },
  });
}

// Fetch a single document by ID
export function useDocument(id: number) {
  return useQuery({
    queryKey: [api.documents.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.documents.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch document");
      
      return api.documents.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// Create a new document
export function useCreateDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: DocumentInput) => {
      const validated = api.documents.create.input.parse(data);
      const res = await fetch(api.documents.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create document");
      }
      
      return api.documents.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      toast({
        title: "Document Created",
        description: "Your new archive entry has been successfully recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Update an existing document
export function useUpdateDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<DocumentInput>) => {
      const validated = api.documents.update.input.parse(updates);
      const url = buildUrl(api.documents.update.path, { id });
      
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Document not found");
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to update document");
      }
      
      return api.documents.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.documents.get.path, data.id] });
      toast({
        title: "Document Updated",
        description: "Changes have been saved to the archives.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Delete a document
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.documents.delete.path, { id });
      const res = await fetch(url, { 
        method: "DELETE",
        credentials: "include" 
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Document not found");
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to delete document");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      toast({
        title: "Document Deleted",
        description: "The record has been expunged from the archives.",
      });
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
