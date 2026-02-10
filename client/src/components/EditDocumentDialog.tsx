import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDocumentSchema, CATEGORIES } from "@shared/schema";
import { useUpdateDocument } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Edit2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { type DocumentResponse } from "@shared/schema";

interface EditDocumentDialogProps {
  document: DocumentResponse;
}

export function EditDocumentDialog({ document }: EditDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const updateDocument = useUpdateDocument();
  const [roleInput, setRoleInput] = useState("");

  const { data: availableRoles } = useQuery<string[]>({
    queryKey: ["/api/auth/available-roles"],
    queryFn: async () => {
      const res = await fetch("/api/auth/available-roles", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const form = useForm({
    resolver: zodResolver(insertDocumentSchema),
    defaultValues: {
      title: document.title,
      content: document.content,
      category: document.category,
      isPublic: document.isPublic,
      allowedRoles: document.allowedRoles || [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: document.title,
        content: document.content,
        category: document.category,
        isPublic: document.isPublic,
        allowedRoles: document.allowedRoles || [],
      });
    }
  }, [document, open, form]);

  const onSubmit = (data: any) => {
    const submitData = {
      ...data,
      allowedRoles: data.allowedRoles?.length > 0 ? data.allowedRoles : null,
    };
    updateDocument.mutate({ id: document.id, ...submitData }, {
      onSuccess: () => {
        setOpen(false);
      },
    });
  };

  const addRole = (role: string) => {
    const current = form.getValues("allowedRoles") || [];
    if (!current.includes(role)) {
      form.setValue("allowedRoles", [...current, role]);
    }
    setRoleInput("");
  };

  const removeRole = (role: string) => {
    const current = form.getValues("allowedRoles") || [];
    form.setValue("allowedRoles", current.filter((r: string) => r !== role));
  };

  const filteredRoles = availableRoles?.filter(
    (r) => r.toLowerCase().includes(roleInput.toLowerCase()) && !(form.getValues("allowedRoles") || []).includes(r)
  ) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30" data-testid="button-edit-document">
          <Edit2 className="w-4 h-4 mr-2" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-card border-white/10 text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary">Edit Document</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input className="bg-background/50 border-white/10" data-testid="input-edit-title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-white/10" data-testid="select-edit-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-1 rounded-lg border border-white/10 bg-background/50 p-3">
                    <FormLabel>Public Access</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-public"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allowedRoles"
              render={() => (
                <FormItem>
                  <FormLabel>Restrict to Specific Roles (Optional)</FormLabel>
                  <FormDescription className="text-xs">
                    Leave empty to allow all roles with category access.
                  </FormDescription>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(form.getValues("allowedRoles") || []).map((role: string) => (
                        <Badge key={role} variant="secondary" className="gap-1">
                          {role}
                          <button type="button" onClick={() => removeRole(role)}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="Search Discord roles..."
                        className="bg-background/50 border-white/10 focus:border-primary/50"
                        value={roleInput}
                        onChange={(e) => setRoleInput(e.target.value)}
                        data-testid="input-edit-role-search"
                      />
                      {roleInput && filteredRoles.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-white/10 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {filteredRoles.slice(0, 10).map((role) => (
                            <button
                              key={role}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 text-foreground"
                              onClick={() => addRole(role)}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[200px] bg-background/50 border-white/10"
                      data-testid="textarea-edit-content"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={updateDocument.isPending}
                className="bg-primary text-primary-foreground"
                data-testid="button-save-document"
              >
                {updateDocument.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
